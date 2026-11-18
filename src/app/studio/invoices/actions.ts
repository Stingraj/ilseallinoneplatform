'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { dispatchPaymentReminder, type ReminderInvoice } from '@/lib/invoices/reminder-dispatch';
import { MANUAL_REMINDER_GAP_HOURS, todayIn } from '@/lib/invoices/reminders';
import { invoiceTotals, nextInvoiceNumber } from '@/lib/invoices/totals';
import { isMissingSchema } from '@/lib/studio/data';
import { getStudioSettings } from '@/lib/studio/settings';

type Result = { success: boolean; error?: string | null; id?: string };
type Kind = 'invoice' | 'quote';

const INVOICE_STATUSES = ['unpaid', 'paid', 'overdue', 'cancelled'];
const QUOTE_STATUSES = ['open', 'declined', 'expired'];
const MIGRATION = 'Quotes need the quick-wins database update (20261118000000_studio_quick_wins.sql).';

/** Allocates the next number and inserts; retries once if another document took the number meanwhile. */
async function insertNumbered(client: SupabaseClient, kind: Kind, row: Record<string, unknown>) {
  const prefix = kind === 'quote' ? 'Q' : 'INV';
  const year = new Date().getFullYear();
  const { data: numbers } = await client.from('invoices').select('invoice_number');
  let number = nextInvoiceNumber((numbers ?? []).map((r) => r.invoice_number), year, prefix);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await client
      .from('invoices')
      .insert({ ...row, invoice_number: number, ...(kind === 'quote' ? { kind: 'quote' } : {}) })
      .select('id')
      .single();
    if (!error) return { id: data.id as string, error: null };
    if (error.code !== '23505') return { id: null, error: isMissingSchema(error) && kind === 'quote' ? MIGRATION : error.message };
    number = nextInvoiceNumber([number], year, prefix);
  }
  return { id: null, error: 'Could not allocate a number. Please try again.' };
}

async function createFromSale(formData: FormData, kind: Kind): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  const db = client as unknown as SupabaseClient;

  const saleId = String(formData.get('sale_id') ?? '');
  const contactId = (formData.get('contact_id') as string) || null;
  const taxRate = Math.max(0, Math.min(100, Number(formData.get('tax_rate') ?? 0) || 0));
  const taxLabel = String(formData.get('tax_label') ?? '').trim() || null;
  const dueDate = (formData.get('due_date') as string) || null;
  const validUntil = (formData.get('valid_until') as string) || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  const { data: sale } = await client
    .from('sales')
    .select('id, sale_price, discount, buyer_name, contact_id, artworks(id, title, medium, dimensions, year, inventory_number, currency)')
    .eq('id', saleId)
    .maybeSingle();
  if (!sale) {
    return { success: false, error: `Choose a recorded sale. ${kind === 'quote' ? 'Quotes' : 'Invoices'} are always based on a sale in the Sales tracker (a lead is fine).` };
  }
  const artwork = Array.isArray(sale.artworks) ? sale.artworks[0] : sale.artworks;

  const [{ data: profile }, { data: contact }] = await Promise.all([
    client.from('artist_profile').select('full_name, email, phone, studio_address, website').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    contactId || sale.contact_id
      ? client.from('contacts').select('id, name, company, email, address, phone').eq('id', (contactId || sale.contact_id) as string).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const price = Number(sale.sale_price ?? 0);
  const discountPercent = Number(sale.discount ?? 0);
  const lines = [
    {
      description: [artwork?.title, artwork?.medium, artwork?.dimensions, artwork?.year].filter(Boolean).join(', ') || 'Artwork',
      quantity: 1,
      unit_amount: price,
    },
    ...(discountPercent > 0 ? [{ description: `Discount (${discountPercent}%)`, quantity: 1, unit_amount: -Math.round(price * discountPercent) / 100 }] : []),
  ];
  const totals = invoiceTotals(lines, taxRate);

  const row: Record<string, unknown> = {
    sale_id: sale.id,
    contact_id: contact?.id ?? null,
    amount: totals.total,
    currency: artwork?.currency ?? 'USD',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: kind === 'invoice' ? dueDate : null,
    status: kind === 'quote' ? 'open' : 'unpaid',
    tax_rate: taxRate,
    tax_label: taxLabel,
    notes,
    seller: profile ?? null,
    buyer: contact ?? { name: sale.buyer_name },
  };
  if (kind === 'quote') row.valid_until = validUntil;

  const created = await insertNumbered(db, kind, row);
  if (!created.id) return { success: false, error: created.error };

  await client.from('invoice_items').insert(lines.map((line, index) => ({ ...line, invoice_id: created.id, artwork_id: index === 0 ? artwork?.id ?? null : null, sort_order: index })));
  if (kind === 'invoice') {
    await client.from('sales').update({ status: 'invoice_sent', contact_id: contact?.id ?? sale.contact_id ?? null }).eq('id', sale.id).eq('status', 'lead');
  }
  revalidatePath('/studio/invoices');
  return { success: true, id: created.id };
}

export async function createInvoiceFromSaleAction(formData: FormData): Promise<Result> {
  return createFromSale(formData, formData.get('kind') === 'quote' ? 'quote' : 'invoice');
}

/** Turns an open quote into an invoice with the same lines, buyer and terms; the quote is marked accepted. */
export async function convertQuoteAction(id: string, dueDate: string | null): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { success: false, error: 'Choose a valid due date.' };

  // Claim the quote first (open → accepted), so two clicks cannot both create an invoice.
  const { data: claimed } = await client
    .from('invoices')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('kind', 'quote')
    .eq('status', 'open')
    .is('converted_invoice_id', null)
    .select('*, invoice_items(*)');
  const quote = claimed?.[0];
  if (!quote) return { success: false, error: 'Only open quotes can be accepted (this one may already have been converted).' };

  const created = await insertNumbered(client as unknown as SupabaseClient, 'invoice', {
    sale_id: quote.sale_id,
    contact_id: quote.contact_id,
    amount: quote.amount,
    currency: quote.currency,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: dueDate,
    status: 'unpaid',
    tax_rate: quote.tax_rate,
    tax_label: quote.tax_label,
    notes: quote.notes,
    seller: quote.seller,
    buyer: quote.buyer,
  });
  if (!created.id) {
    await client.from('invoices').update({ status: 'open' }).eq('id', id).eq('status', 'accepted').is('converted_invoice_id', null);
    return { success: false, error: created.error };
  }

  const items = [...(quote.invoice_items ?? [])] as { description: string; quantity: number; unit_amount: number; artwork_id: string | null; sort_order: number }[];
  if (items.length) {
    await client.from('invoice_items').insert(items.map((item) => ({
      invoice_id: created.id,
      description: item.description,
      quantity: item.quantity,
      unit_amount: item.unit_amount,
      artwork_id: item.artwork_id,
      sort_order: item.sort_order,
    })));
  }
  await client.from('invoices').update({ converted_invoice_id: created.id }).eq('id', id);
  if (quote.sale_id) {
    await client.from('sales').update({ status: 'invoice_sent' }).eq('id', quote.sale_id).in('status', ['lead', 'reserved']);
  }
  revalidatePath('/studio/invoices');
  return { success: true, id: created.id };
}

export async function setInvoiceStatusAction(id: string, status: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const { data: current, error: readError } = await client.from('invoices').select('id, kind, status, sale_id, paid_at').eq('id', id).maybeSingle();
  // Before the quick-wins migration there is no kind/paid_at: keep the original behaviour.
  if (readError && isMissingSchema(readError)) {
    if (!INVOICE_STATUSES.includes(status)) return { success: false, error: 'Unknown status' };
    const { error: updateError } = await client.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) return { success: false, error: updateError.message };
    revalidatePath('/studio/invoices');
    return { success: true };
  }
  if (!current) return { success: false, error: 'Not found.' };

  const allowed = current.kind === 'quote' ? QUOTE_STATUSES : INVOICE_STATUSES;
  if (!allowed.includes(status)) return { success: false, error: 'Unknown status' };
  if (current.kind === 'quote' && current.status === 'accepted') return { success: false, error: 'This quote has been turned into an invoice; change the invoice instead.' };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (current.kind === 'invoice') patch.paid_at = status === 'paid' ? current.paid_at ?? now : null;
  const { error: updateError } = await client.from('invoices').update(patch).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };

  // Paid invoice → the sale is paid too (never moves a sale backwards from delivered).
  if (current.kind === 'invoice' && status === 'paid' && current.sale_id) {
    await client.from('sales').update({ status: 'paid' }).eq('id', current.sale_id).in('status', ['lead', 'reserved', 'invoice_sent']);
  }
  revalidatePath('/studio/invoices');
  revalidatePath('/studio/sales');
  return { success: true };
}

/** Sends a payment reminder now. At most one manual reminder per invoice per hour, so a double click sends once. */
export async function sendReminderAction(id: string): Promise<Result> {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const { data: invoice } = await client
    .from('invoices')
    .select('id, kind, status, invoice_number, amount, currency, due_date, notes, buyer, seller, contact_id')
    .eq('id', id)
    .maybeSingle();
  if (!invoice || invoice.kind !== 'invoice') return { success: false, error: 'Invoice not found.' };
  if (!['unpaid', 'overdue'].includes(invoice.status)) return { success: false, error: 'Reminders are only for unpaid invoices.' };

  const since = new Date(Date.now() - MANUAL_REMINDER_GAP_HOURS * 3_600_000).toISOString();
  const { count } = await client
    .from('invoice_reminders')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', id)
    .neq('state', 'not_sent')
    .gte('created_at', since);
  if ((count ?? 0) > 0) return { success: false, error: 'A reminder was sent in the last hour.' };

  const settings = await getStudioSettings(client);
  const outcome = await dispatchPaymentReminder(client as unknown as SupabaseClient, invoice as ReminderInvoice, null, todayIn(settings.timezone));
  revalidatePath('/studio/invoices');
  return outcome.sent ? { success: true } : { success: false, error: outcome.reason };
}

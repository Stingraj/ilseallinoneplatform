'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { invoiceTotals, nextInvoiceNumber } from '@/lib/invoices/totals';

export async function createInvoiceFromSaleAction(formData: FormData) {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };

  const saleId = String(formData.get('sale_id') ?? '');
  const contactId = (formData.get('contact_id') as string) || null;
  const taxRate = Math.max(0, Math.min(100, Number(formData.get('tax_rate') ?? 0) || 0));
  const taxLabel = String(formData.get('tax_label') ?? '').trim() || null;
  const dueDate = (formData.get('due_date') as string) || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  const { data: sale } = await client
    .from('sales')
    .select('id, sale_price, discount, buyer_name, contact_id, artworks(id, title, medium, dimensions, year, inventory_number, currency)')
    .eq('id', saleId)
    .maybeSingle();
  if (!sale) return { success: false, error: 'Choose a recorded sale. Invoices are always based on real sales.' };
  const artwork = Array.isArray(sale.artworks) ? sale.artworks[0] : sale.artworks;

  const [{ data: profile }, { data: contact }, { data: numbers }] = await Promise.all([
    client.from('artist_profile').select('full_name, email, phone, studio_address, website').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    contactId || sale.contact_id
      ? client.from('contacts').select('id, name, company, email, address, phone').eq('id', (contactId || sale.contact_id) as string).maybeSingle()
      : Promise.resolve({ data: null }),
    client.from('invoices').select('invoice_number'),
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
  const issueDate = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  // Retry once if another invoice took the number in the meantime (invoice_number is unique).
  let invoiceNumber = nextInvoiceNumber((numbers ?? []).map((row) => row.invoice_number), year);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: invoice, error: insertError } = await client
      .from('invoices')
      .insert({
        sale_id: sale.id,
        contact_id: contact?.id ?? null,
        invoice_number: invoiceNumber,
        amount: totals.total,
        currency: artwork?.currency ?? 'USD',
        issue_date: issueDate,
        due_date: dueDate,
        status: 'unpaid',
        tax_rate: taxRate,
        tax_label: taxLabel,
        notes,
        seller: profile ?? null,
        buyer: contact ?? { name: sale.buyer_name },
      })
      .select('id')
      .single();
    if (!insertError) {
      await client.from('invoice_items').insert(lines.map((line, index) => ({ ...line, invoice_id: invoice.id, artwork_id: index === 0 ? artwork?.id ?? null : null, sort_order: index })));
      await client.from('sales').update({ status: 'invoice_sent', contact_id: contact?.id ?? sale.contact_id ?? null }).eq('id', sale.id).eq('status', 'lead');
      revalidatePath('/studio/invoices');
      return { success: true, id: invoice.id };
    }
    if (insertError.code !== '23505') return { success: false, error: insertError.message };
    invoiceNumber = nextInvoiceNumber([invoiceNumber], year);
  }
  return { success: false, error: 'Could not allocate an invoice number. Please try again.' };
}

export async function setInvoiceStatusAction(id: string, status: string) {
  const { client, error } = await getOwnerClient();
  if (!client) return { success: false, error };
  if (!['unpaid', 'paid', 'overdue', 'cancelled'].includes(status)) return { success: false, error: 'Unknown status' };
  const { error: updateError } = await client.from('invoices').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  revalidatePath('/studio/invoices');
  return { success: true };
}

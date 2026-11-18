import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrency } from '@/lib/catalog';
import { automationTarget, notifyAutomation } from '@/lib/email/automations';
import { daysBetween } from './reminders';

export interface ReminderInvoice {
  id: string;
  invoice_number: string;
  amount: number | string;
  currency: string | null;
  due_date: string | null;
  notes: string | null;
  buyer: { name?: string | null; email?: string | null } | null;
  seller: { full_name?: string | null; email?: string | null } | null;
  contact_id: string | null;
}

export type ReminderOutcome = { sent: boolean; reason?: string };

/**
 * Claims a reminder row first, then hands the reminder to the n8n workflow and records what happened. For automatic
 * reminders the unique (invoice, stage) index makes the claim fail on a second run, so a stage is never sent twice.
 */
export async function dispatchPaymentReminder(
  client: SupabaseClient,
  invoice: ReminderInvoice,
  stage: number | null,
  today: string
): Promise<ReminderOutcome> {
  let email = invoice.buyer?.email ?? null;
  if (!email && invoice.contact_id) {
    const { data } = await client.from('contacts').select('email').eq('id', invoice.contact_id).maybeSingle();
    email = data?.email ?? null;
  }
  if (!email) return { sent: false, reason: 'The buyer has no email address on the invoice or collector record.' };

  // Checked before claiming, so a scheduled reminder is not used up while emails are not connected yet.
  if (!automationTarget('payment_reminder').url) {
    return { sent: false, reason: 'Payment reminder emails are not connected yet (N8N_PAYMENT_REMINDER_WEBHOOK_URL).' };
  }

  const { data: claim, error: claimError } = await client
    .from('invoice_reminders')
    .insert({ invoice_id: invoice.id, stage, state: 'dispatching' })
    .select('id')
    .single();
  if (claimError) {
    return { sent: false, reason: claimError.code === '23505' ? (stage === null ? 'A reminder was sent in the last hour.' : 'This reminder was already sent.') : claimError.message };
  }

  // A reminder the workflow did not accept is not retried for the same stage: a timeout may still have sent it.
  const currency = invoice.currency ?? 'USD';
  const accepted = await notifyAutomation('payment_reminder', {
    email,
    buyerName: invoice.buyer?.name ?? null,
    invoiceNumber: invoice.invoice_number,
    amount: formatCurrency(invoice.amount, currency),
    currency,
    dueDate: invoice.due_date,
    daysOverdue: invoice.due_date ? Math.max(0, daysBetween(invoice.due_date, today)) : null,
    stage,
    paymentDetails: invoice.notes,
    studioName: invoice.seller?.full_name ?? null,
    replyTo: invoice.seller?.email ?? null,
  });
  await client
    .from('invoice_reminders')
    .update({ state: accepted ? 'accepted_by_workflow' : 'failed', error: accepted ? null : 'The workflow did not accept the reminder.' })
    .eq('id', claim.id);
  return accepted ? { sent: true } : { sent: false, reason: 'The email workflow did not accept the reminder.' };
}

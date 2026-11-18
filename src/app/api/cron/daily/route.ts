import { NextResponse, type NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { dispatchPaymentReminder, type ReminderInvoice } from '@/lib/invoices/reminder-dispatch';
import { dueReminderStage, normalizeReminderDays, todayIn } from '@/lib/invoices/reminders';
import { getServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Compare hashes so the check takes constant time.
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(request.headers.get('authorization') ?? ''), digest(`Bearer ${secret}`));
}

/**
 * Daily studio housekeeping, run by Vercel Cron (vercel.json):
 *  1. unpaid invoices past their due date become "overdue";
 *  2. open quotes past their "valid until" date become "expired";
 *  3. if automatic reminders are on (Settings), each overdue invoice gets at most one reminder per scheduled stage.
 * Dates follow the studio's time zone. Safe to run more than once a day.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 503 });
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { client } = getServiceRoleClient();
  if (!client) return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 503 });

  const { data: settings, error: settingsError } = await client
    .from('studio_settings')
    .select('timezone, payment_reminders_enabled, payment_reminder_days')
    .eq('id', true)
    .maybeSingle();
  if (settingsError) return NextResponse.json({ error: 'Settings unavailable (is the quick-wins migration applied?).' }, { status: 503 });
  const today = todayIn(settings?.timezone ?? 'UTC');
  const now = new Date().toISOString();

  const overdue = await client
    .from('invoices')
    .update({ status: 'overdue', updated_at: now })
    .eq('kind', 'invoice')
    .eq('status', 'unpaid')
    .lt('due_date', today)
    .select('id');
  const expired = await client
    .from('invoices')
    .update({ status: 'expired', updated_at: now })
    .eq('kind', 'quote')
    .eq('status', 'open')
    .lt('valid_until', today)
    .select('id');

  const reminders = { enabled: Boolean(settings?.payment_reminders_enabled), sent: 0, skipped: [] as string[] };
  if (settings?.payment_reminders_enabled) {
    const days = normalizeReminderDays(settings.payment_reminder_days);
    const { data: unpaid } = await client
      .from('invoices')
      .select('id, invoice_number, amount, currency, due_date, notes, buyer, seller, contact_id, invoice_reminders(stage)')
      .eq('kind', 'invoice')
      .in('status', ['unpaid', 'overdue'])
      .lt('due_date', today);
    for (const invoice of unpaid ?? []) {
      const sent = (invoice.invoice_reminders ?? []).map((r: { stage: number | null }) => r.stage).filter((s): s is number => s !== null);
      const stage = dueReminderStage(invoice.due_date, today, days, sent);
      if (!stage) continue;
      const outcome = await dispatchPaymentReminder(client, invoice as ReminderInvoice, stage, today);
      if (outcome.sent) reminders.sent += 1;
      else reminders.skipped.push(`${invoice.invoice_number}: ${outcome.reason}`);
    }
  }

  return NextResponse.json({
    today,
    markedOverdue: overdue.data?.length ?? 0,
    quotesExpired: expired.data?.length ?? 0,
    reminders,
    errors: [overdue.error?.message, expired.error?.message].filter(Boolean),
  });
}

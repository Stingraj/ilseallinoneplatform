'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';
import { isValidTimezone } from '@/lib/studio/settings';
import { DEFAULT_REMINDER_DAYS, normalizeReminderDays } from '@/lib/invoices/reminders';

export interface SettingsState {
  status: 'idle' | 'saved' | 'error';
  message?: string;
}

export async function saveSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { client, error } = await getOwnerClient();
  if (!client) return { status: 'error', message: error };

  const timezone = String(formData.get('timezone') ?? '').trim();
  const locale = String(formData.get('locale') ?? '').trim();
  if (!isValidTimezone(timezone)) return { status: 'error', message: 'Choose a valid time zone.' };
  if (!['en-GB', 'en-US', 'da-DK', 'de-DE', 'fr-FR'].includes(locale)) return { status: 'error', message: 'Choose a supported date format.' };

  const { error: saveError } = await client.from('studio_settings').upsert({ id: true, timezone, locale, updated_at: new Date().toISOString() });
  if (saveError) {
    return {
      status: 'error',
      message: isMissingSchema(saveError) ? 'Settings cannot be saved until the database update (20261030000000_studio_workflows.sql) is applied.' : 'Settings could not be saved.',
    };
  }
  revalidatePath('/studio', 'layout');
  return { status: 'saved', message: 'Settings saved.' };
}

/** Automatic payment reminders: off by default; the days are counted after an invoice's due date. */
export async function saveReminderSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { client, error } = await getOwnerClient();
  if (!client) return { status: 'error', message: error };

  const enabled = formData.get('enabled') === 'on';
  const raw = String(formData.get('days') ?? '').split(/[\s,]+/).filter(Boolean);
  const days = normalizeReminderDays(raw);
  if (raw.length > 0 && days.length !== raw.length) {
    return { status: 'error', message: 'Use whole numbers of days between 1 and 365, separated by commas (at most 10).' };
  }
  if (enabled && days.length === 0) return { status: 'error', message: 'Add at least one day to send reminders on.' };

  const { error: saveError } = await client
    .from('studio_settings')
    .update({ payment_reminders_enabled: enabled, payment_reminder_days: days.length ? days : DEFAULT_REMINDER_DAYS, updated_at: new Date().toISOString() })
    .eq('id', true);
  if (saveError) {
    return {
      status: 'error',
      message: isMissingSchema(saveError) ? 'Reminders need the quick-wins database update (20261118000000_studio_quick_wins.sql).' : 'Reminder settings could not be saved.',
    };
  }
  revalidatePath('/studio/settings');
  return { status: 'saved', message: enabled ? 'Automatic reminders are on.' : 'Automatic reminders are off.' };
}

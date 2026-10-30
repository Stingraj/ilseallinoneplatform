'use server';

import { revalidatePath } from 'next/cache';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { isMissingSchema } from '@/lib/studio/data';
import { isValidTimezone } from '@/lib/studio/settings';

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

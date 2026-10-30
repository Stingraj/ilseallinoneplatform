import 'server-only';

import type { OwnerClient } from './data';

export interface StudioSettings {
  timezone: string;
  locale: string;
  /** False until the settings table exists; defaults are then shown but cannot be saved. */
  stored: boolean;
}

export const DEFAULT_SETTINGS: StudioSettings = { timezone: 'UTC', locale: 'en-GB', stored: false };

export async function getStudioSettings(client: OwnerClient): Promise<StudioSettings> {
  const { data, error } = await client.from('studio_settings').select('timezone, locale').eq('id', true).maybeSingle();
  if (error) return DEFAULT_SETTINGS;
  if (!data) return { ...DEFAULT_SETTINGS, stored: true };
  return { timezone: data.timezone, locale: data.locale, stored: true };
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

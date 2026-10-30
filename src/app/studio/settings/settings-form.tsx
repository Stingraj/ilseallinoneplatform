'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { saveSettingsAction, type SettingsState } from './actions';

const LOCALES = [
  { value: 'en-GB', label: 'English (UK): 30 October 2026' },
  { value: 'en-US', label: 'English (US): October 30, 2026' },
  { value: 'da-DK', label: 'Dansk: 30. oktober 2026' },
  { value: 'de-DE', label: 'Deutsch: 30. Oktober 2026' },
  { value: 'fr-FR', label: 'Français : 30 octobre 2026' },
];

export function SettingsForm({ timezone, locale, timezones, canSave }: { timezone: string; locale: string; timezones: string[]; canSave: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, { status: 'idle' });
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="studio-label mb-1 block">Time zone</span>
        <select name="timezone" defaultValue={timezone} className="h-11 w-full rounded-xl border border-[color:var(--studio-line)] bg-white px-3">
          {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="studio-label mb-1 block">Date format</span>
        <select name="locale" defaultValue={locale} className="h-11 w-full rounded-xl border border-[color:var(--studio-line)] bg-white px-3">
          {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </label>
      {state.message && (
        <p role={state.status === 'error' ? 'alert' : 'status'} className={`text-sm ${state.status === 'error' ? 'text-[#A12D2D]' : 'text-[#2f6b3f]'}`}>{state.message}</p>
      )}
      <Button type="submit" disabled={pending || !canSave}>{pending ? 'Saving…' : 'Save preferences'}</Button>
      {!canSave && <p className="text-xs text-[color:var(--studio-muted)]">Saving is available after the database update is applied.</p>}
    </form>
  );
}

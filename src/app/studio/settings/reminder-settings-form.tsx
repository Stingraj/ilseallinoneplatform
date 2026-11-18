'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { saveReminderSettingsAction, type SettingsState } from './actions';

export function ReminderSettingsForm({ enabled, days }: { enabled: boolean; days: number[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveReminderSettingsAction, { status: 'idle' });
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="h-4 w-4" />
        <span>Email automatic payment reminders</span>
      </label>
      <label className="block text-sm">
        <span className="studio-label mb-1 block">Days after the due date</span>
        <input name="days" defaultValue={days.join(', ')} inputMode="numeric" className="h-11 w-full max-w-xs rounded-xl border border-[color:var(--studio-line)] bg-white px-3" />
      </label>
      {state.message && (
        <p role={state.status === 'error' ? 'alert' : 'status'} className={`text-sm ${state.status === 'error' ? 'text-[#A12D2D]' : 'text-[#2f6b3f]'}`}>{state.message}</p>
      )}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save reminders'}</Button>
    </form>
  );
}

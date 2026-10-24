'use client';

import { useActionState } from 'react';
import { unlockRoom } from './actions';

export function PasscodeForm({ token }: { token: string }) {
  const [error, action, pending] = useActionState(unlockRoom.bind(null, token), null);
  return (
    <form action={action} className="mt-10 max-w-sm space-y-4">
      <label htmlFor="passcode" className="eyebrow">Passcode</label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="off"
        required
        className="w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 focus:border-ink focus:outline-none focus:ring-0"
        aria-invalid={Boolean(error)}
      />
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
      <button type="submit" disabled={pending} className="h-12 bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper disabled:opacity-60">
        {pending ? 'Opening…' : 'Enter'}
      </button>
    </form>
  );
}

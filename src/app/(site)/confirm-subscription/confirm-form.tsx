'use client';

import { useActionState } from 'react';
import { confirmSubscriptionAction, type ConfirmState } from './actions';

export function ConfirmForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmSubscriptionAction, { status: 'idle' });

  if (state.status === 'done') {
    return <p role="status" className="font-display text-3xl italic">Thank you. You are subscribed to news about new works and exhibitions.</p>;
  }
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="t" value={token} />
      <p className="max-w-md text-[15px] leading-7 text-ink/80">
        Confirm that you would like to receive occasional emails about new works and exhibitions. You can unsubscribe at any time from any email.
      </p>
      {state.status === 'expired' && <p role="alert" className="text-sm text-signal">This link has expired. Please sign up again on the website.</p>}
      {state.status === 'invalid' && <p role="alert" className="text-sm text-signal">This link is not valid. Please sign up again on the website.</p>}
      {state.status === 'error' && <p role="alert" className="text-sm text-signal">Something went wrong. Please try again in a moment.</p>}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper hover:bg-ink/85 disabled:opacity-60">
        {pending ? 'Confirming…' : 'Confirm subscription'}
      </button>
    </form>
  );
}

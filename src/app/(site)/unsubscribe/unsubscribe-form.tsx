'use client';

import { useActionState } from 'react';
import { unsubscribeAction, type UnsubscribeState } from './actions';

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<UnsubscribeState, FormData>(unsubscribeAction, { status: 'idle' });

  if (state.status === 'done') {
    return <p role="status" className="font-display text-3xl italic">You have been unsubscribed. You will not receive further news emails.</p>;
  }
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="t" value={token} />
      <p className="max-w-md text-[15px] leading-7 text-ink/80">
        Confirm that you no longer want to receive news about new works and exhibitions. Replies to messages you send the studio are not affected.
      </p>
      {state.status === 'invalid' && <p role="alert" className="text-sm text-signal">This link is not valid. If you keep receiving emails, reply to one and ask to be removed.</p>}
      {state.status === 'error' && <p role="alert" className="text-sm text-signal">Something went wrong. Please try again in a moment.</p>}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper hover:bg-ink/85 disabled:opacity-60">
        {pending ? 'Unsubscribing…' : 'Unsubscribe'}
      </button>
    </form>
  );
}

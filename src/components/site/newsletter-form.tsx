'use client';

import { useActionState } from 'react';
import { subscribeNewsletter } from '@/app/(site)/actions';
import { initialFormState } from '@/lib/website/forms';
import { FormGuards } from './form-guards';

export function NewsletterForm({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, initialFormState);
  const line = tone === 'dark' ? 'border-paper/30 focus:border-paper text-paper placeholder:text-paper/50' : 'border-ink/25 focus:border-ink text-ink placeholder:text-stone';

  if (state.status === 'success') {
    return <p role="status" className="font-display text-2xl italic">{state.message}</p>;
  }

  return (
    <form key={state.values?.email ?? ''} action={action} className="relative max-w-md space-y-4" noValidate>
      <FormGuards />
      <div className="flex items-end gap-4">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Email address"
          defaultValue={state.values?.email ?? ''}
          required
          className={`min-w-0 flex-1 border-0 border-b bg-transparent px-0 py-3 text-base focus:outline-none focus:ring-0 ${line}`}
        />
        <button type="submit" disabled={pending} className="shrink-0 pb-3 text-[12px] font-medium uppercase tracking-[0.22em] disabled:opacity-60">
          {pending ? '…' : 'Subscribe'}
        </button>
      </div>
      <label className="flex items-start gap-3 text-xs opacity-75">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 rounded-none" required />
        <span>I would like to receive news about new works and exhibitions, and can unsubscribe at any time.</span>
      </label>
      {state.status === 'error' && <p role="alert" className="text-sm text-[#FF8A80]">{state.message}</p>}
    </form>
  );
}

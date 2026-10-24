'use client';

import { useActionState } from 'react';
import { submitEnquiry } from '@/app/(site)/actions';
import { initialFormState } from '@/lib/website/forms';
import { cn } from '@/lib/utils';
import { FormGuards } from './form-guards';

const field =
  'w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 text-base text-ink placeholder:text-stone/70 focus:border-ink focus:outline-none focus:ring-0';

export function EnquiryForm({
  artwork,
  sourcePage,
  compact,
}: {
  artwork?: { id: string; title: string };
  sourcePage: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(submitEnquiry, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.status === 'success') {
    return (
      <div role="status" className="border-t border-ink/15 pt-6">
        <p className="font-display text-2xl italic">{state.message}</p>
      </div>
    );
  }

  return (
    // Re-keyed after each failed attempt so the fields remount with what the visitor typed.
    <form key={JSON.stringify(state.values ?? {})} action={action} className="relative space-y-6" noValidate>
      <FormGuards />
      {artwork && (
        <>
          <input type="hidden" name="artworkId" value={artwork.id} />
          <input type="hidden" name="artworkTitle" value={artwork.title} />
        </>
      )}
      <input type="hidden" name="sourcePage" value={sourcePage} />

      <div className={cn('grid gap-6', !compact && 'sm:grid-cols-2')}>
        <div>
          <label htmlFor="enquiry-name" className="eyebrow">Name</label>
          <input id="enquiry-name" name="name" defaultValue={state.values?.name ?? ''} autoComplete="name" required className={field} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'enquiry-name-error' : undefined} />
          {errors.name && <p id="enquiry-name-error" className="mt-1 text-sm text-signal">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="enquiry-email" className="eyebrow">Email</label>
          <input id="enquiry-email" name="email" type="email" defaultValue={state.values?.email ?? ''} autoComplete="email" required className={field} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'enquiry-email-error' : undefined} />
          {errors.email && <p id="enquiry-email-error" className="mt-1 text-sm text-signal">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="enquiry-message" className="eyebrow">Message</label>
        <textarea
          id="enquiry-message"
          name="message"
          rows={compact ? 4 : 6}
          required
          defaultValue={state.values?.message ?? (artwork ? `I would like to know more about "${artwork.title}".` : '')}
          className={cn(field, 'resize-y')}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'enquiry-message-error' : undefined}
        />
        {errors.message && <p id="enquiry-message-error" className="mt-1 text-sm text-signal">{errors.message}</p>}
      </div>

      <label className="flex items-start gap-3 text-sm text-stone">
        <input type="checkbox" name="marketingConsent" className="mt-1 h-4 w-4 rounded-none border-ink/40 text-ink focus:ring-ink" />
        <span>Send me occasional news about new works and exhibitions. You can unsubscribe at any time.</span>
      </label>

      {state.status === 'error' && <p role="alert" className="text-sm text-signal">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? 'Sending…' : artwork ? 'Enquire about this work' : 'Send message'}
      </button>
      <p className="text-xs text-stone">Your details are used only to reply to you and are never shared.</p>
    </form>
  );
}

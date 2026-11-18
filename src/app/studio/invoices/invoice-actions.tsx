'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { convertQuoteAction, sendReminderAction, setInvoiceStatusAction } from './actions';

const INVOICE_STATUSES = ['unpaid', 'paid', 'overdue', 'cancelled'];
const QUOTE_STATUSES = ['open', 'declined', 'expired'];
const pill = 'inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold disabled:opacity-60';

function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function InvoiceActions({
  id,
  kind,
  status,
  remindersEnabled,
}: {
  id: string;
  kind: 'invoice' | 'quote';
  status: string;
  remindersEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [converting, setConverting] = useState(false);
  const [due, setDue] = useState(inDays(14));

  function run(action: () => Promise<{ success: boolean; error?: string | null }>, done: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return void toast.error(result.error ?? 'Something went wrong');
      toast.success(done);
      setConverting(false);
      router.refresh();
    });
  }

  if (kind === 'quote' && status === 'accepted') return <span className="studio-pill studio-pill-success">accepted</span>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label={kind === 'quote' ? 'Quote status' : 'Invoice status'}
        defaultValue={status}
        disabled={pending}
        onChange={(e) => run(() => setInvoiceStatusAction(id, e.target.value), 'Status updated')}
        className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold"
      >
        {(kind === 'quote' ? QUOTE_STATUSES : INVOICE_STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {kind === 'quote' && status === 'open' && (
        converting ? (
          <span className="flex items-center gap-1">
            <label className="sr-only" htmlFor={`due-${id}`}>Invoice due date</label>
            <input id={`due-${id}`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 rounded-full border border-slate-200 px-2 text-xs" />
            <button type="button" disabled={pending} className={pill} onClick={() => run(() => convertQuoteAction(id, due || null), 'Invoice created from the quote')}>Create invoice</button>
          </span>
        ) : (
          <button type="button" disabled={pending} className={pill} onClick={() => setConverting(true)}>Accepted → invoice</button>
        )
      )}

      {kind === 'invoice' && remindersEnabled && (status === 'unpaid' || status === 'overdue') && (
        <button
          type="button"
          disabled={pending}
          className={pill}
          onClick={() => {
            if (window.confirm('Email the buyer a payment reminder now?')) run(() => sendReminderAction(id), 'Reminder sent to the email workflow');
          }}
        >
          Send reminder
        </button>
      )}
    </div>
  );
}

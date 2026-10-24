'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { setInvoiceStatusAction } from './actions';

export function InvoiceStatus({ id, value }: { id: string; value: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Invoice status"
      defaultValue={value}
      disabled={pending}
      onChange={(e) => startTransition(async () => {
        const result = await setInvoiceStatusAction(id, e.target.value);
        if (!result.success) toast.error(result.error ?? 'Could not update');
      })}
      className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold"
    >
      {['unpaid', 'paid', 'overdue', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

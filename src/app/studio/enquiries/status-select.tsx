'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { setEnquiryStatusAction } from '../collectors/actions';

export function StatusSelect({ id, value }: { id: string; value: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={value}
      disabled={pending}
      aria-label="Enquiry status"
      onChange={(event) =>
        startTransition(async () => {
          const result = await setEnquiryStatusAction(id, event.target.value);
          if (!result.success) toast.error(result.error ?? 'Could not update');
        })
      }
      className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold"
    >
      {[['new', 'New'], ['replied', 'Replied'], ['follow_up', 'Follow up'], ['closed', 'Closed'], ['spam', 'Spam']].map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  );
}

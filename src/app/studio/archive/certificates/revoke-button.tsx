'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { revokeCertificateAction } from './actions';

export function RevokeButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-red-700 underline disabled:opacity-60"
      onClick={() => {
        const reason = window.prompt(`Withdraw certificate ${number}? Its check page will say it has been withdrawn. Reason (kept private):`);
        if (reason === null) return;
        startTransition(async () => {
          const result = await revokeCertificateAction(id, reason);
          if (!result.success) return void toast.error(result.error ?? 'Could not withdraw');
          toast.success('Certificate withdrawn');
          router.refresh();
        });
      }}
    >
      Withdraw
    </button>
  );
}

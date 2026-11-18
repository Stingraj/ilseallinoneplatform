'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { deleteShareAction, renewShareLinkAction, revokeShareAction } from './actions';

const pill = 'inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold disabled:opacity-60';

export function ShareRowActions({ id, open }: { id: string; open: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string | null; link?: string }>, done: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) return void toast.error(result.error ?? 'Something went wrong');
      if (result.link) {
        await navigator.clipboard.writeText(result.link).catch(() => undefined);
        window.prompt('New link (copied). The previous link no longer works:', result.link);
      } else toast.success(done);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" disabled={pending} className={pill} onClick={() => run(() => renewShareLinkAction(id), 'New link created')}>New link</button>
      {open && (
        <button type="button" disabled={pending} className={pill} onClick={() => window.confirm('Withdraw this link? It stops working at once.') && run(() => revokeShareAction(id), 'Link withdrawn')}>
          Withdraw
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className={`${pill} text-red-700`}
        onClick={() => window.confirm('Delete this share and its uploaded files? This cannot be undone.') && run(() => deleteShareAction(id), 'Share deleted')}
      >
        Delete
      </button>
    </>
  );
}

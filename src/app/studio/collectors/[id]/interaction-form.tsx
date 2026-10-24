'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addInteractionAction } from '../actions';

export function InteractionForm({ contactId }: { contactId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      ref={ref}
      action={(formData) =>
        startTransition(async () => {
          const result = await addInteractionAction(contactId, formData);
          if (result.success) {
            ref.current?.reset();
            toast.success('Added to history');
          } else toast.error(result.error ?? 'Could not save');
        })
      }
      className="space-y-3"
    >
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="kind">Type</label>
        <select id="kind" name="kind" className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="note">Note</option>
          <option value="email">Email</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
        </select>
        <label className="sr-only" htmlFor="occurred_at">Date</label>
        <input id="occurred_at" name="occurred_at" type="date" className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
      </div>
      <Textarea name="summary" rows={3} placeholder="What happened? e.g. Visited the studio, interested in the Coast series" aria-label="Summary" />
      <Button type="submit" size="sm" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Saving…' : 'Add to history'}</Button>
    </form>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveCollectorAction } from './actions';

export interface CollectorValues {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  location?: string | null;
  type?: string | null;
  follow_up_status?: string | null;
  interests?: string[] | null;
  tags?: string[] | null;
  notes?: string | null;
  consent_marketing?: boolean | null;
}

const TYPES = ['collector', 'gallery', 'curator', 'buyer', 'lead', 'vendor'];
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function CollectorForm({ initial, onSaved }: { initial?: CollectorValues; onSaved?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await saveCollectorAction(initial?.id ?? null, formData);
          if (!result.success) {
            toast.error(result.error ?? 'Could not save');
            return;
          }
          toast.success('Collector saved');
          onSaved?.();
          if (!initial?.id && result.id) router.push(`/studio/collectors/${result.id}`);
          else router.refresh();
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="c-name">Name</Label>
        <Input id="c-name" name="name" defaultValue={initial?.name ?? ''} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-email">Email</Label>
        <Input id="c-email" name="email" type="email" defaultValue={initial?.email ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-phone">Phone</Label>
        <Input id="c-phone" name="phone" defaultValue={initial?.phone ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-company">Organisation / gallery</Label>
        <Input id="c-company" name="company" defaultValue={initial?.company ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-location">Location</Label>
        <Input id="c-location" name="location" defaultValue={initial?.location ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-type">Type</Label>
        <select id="c-type" name="type" defaultValue={initial?.type ?? 'collector'} className={selectClass}>
          {TYPES.map((type) => <option key={type} value={type} className="capitalize">{type}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-status">Lead status</Label>
        <select id="c-status" name="follow_up_status" defaultValue={initial?.follow_up_status ?? 'new'} className={selectClass}>
          {['new', 'contacted', 'interested', 'negotiating', 'collector', 'inactive'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-interests">Interests (comma separated)</Label>
        <Input id="c-interests" name="interests" defaultValue={(initial?.interests ?? []).join(', ')} placeholder="Large canvases, landscapes" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-tags">Tags</Label>
        <Input id="c-tags" name="tags" defaultValue={(initial?.tags ?? []).join(', ')} placeholder="VIP, Berlin" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="c-notes">Notes</Label>
        <Textarea id="c-notes" name="notes" rows={4} defaultValue={initial?.notes ?? ''} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600 sm:col-span-2">
        <input type="checkbox" name="consent_marketing" defaultChecked={Boolean(initial?.consent_marketing)} className="mt-0.5 h-4 w-4" />
        <span>Has agreed to receive marketing emails. Only tick this when the person has said yes.</span>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Saving…' : 'Save collector'}</Button>
      </div>
    </form>
  );
}

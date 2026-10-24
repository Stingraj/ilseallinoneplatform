'use client';

import { useState, useTransition } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createViewingRoomAction, renewViewingRoomLinkAction, revokeViewingRoomAction } from './actions';

interface ArtworkOption { id: string; title: string; image_url: string | null; status: string }
interface ContactOption { id: string; name: string }

export function LinkReveal({ link, onDone }: { link: string; onDone: () => void }) {
  return (
    <div role="status" className="space-y-3 rounded-2xl bg-[#FFF3EB] p-4">
      <p className="text-sm font-semibold text-slate-900">Copy this link now. For security it is shown only once.</p>
      <div className="flex gap-2">
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Viewing room link" />
        <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}>
          <Copy className="h-4 w-4" aria-hidden /><span className="sr-only">Copy</span>
        </Button>
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>Done</Button>
    </div>
  );
}

export function RoomBuilder({ artworks, contacts }: { artworks: ArtworkOption[]; contacts: ContactOption[] }) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (link) return <LinkReveal link={link} onDone={() => { setLink(null); setSelected(new Set()); }} />;

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createViewingRoomAction(formData);
        if (!result.success) return void toast.error(result.error ?? 'Could not create the room');
        setLink(result.link ?? null);
      })}
      className="space-y-4"
    >
      <div className="space-y-1.5"><Label htmlFor="vr-title">Title</Label><Input id="vr-title" name="title" placeholder="New paintings for Anna Berg" required /></div>
      <div className="space-y-1.5"><Label htmlFor="vr-intro">Personal note</Label><Textarea id="vr-intro" name="intro" rows={3} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vr-contact">For collector</Label>
          <select id="vr-contact" name="contact_id" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">—</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label htmlFor="vr-expiry">Closes on</Label><Input id="vr-expiry" name="expires_on" type="date" /></div>
        <div className="space-y-1.5"><Label htmlFor="vr-pass">Passcode (optional)</Label><Input id="vr-pass" name="passcode" autoComplete="off" minLength={6} /></div>
        <label className="flex items-center gap-2 pt-7 text-sm"><input type="checkbox" name="show_prices" defaultChecked className="h-4 w-4" />Show prices of available works</label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Artworks ({selected.size})</legend>
        <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-xl bg-slate-50 p-2 sm:grid-cols-4">
          {artworks.map((artwork) => {
            const checked = selected.has(artwork.id);
            return (
              <li key={artwork.id}>
                <label className={`block cursor-pointer rounded-lg border-2 bg-white p-1.5 ${checked ? 'border-[#FFB38A]' : 'border-transparent'}`}>
                  <input type="checkbox" name="artwork_ids" value={artwork.id} checked={checked} className="sr-only"
                    onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(artwork.id)) next.delete(artwork.id); else next.add(artwork.id); return next; })} />
                  <div className="aspect-square overflow-hidden rounded bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {artwork.image_url && <img src={artwork.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium">{artwork.title}</p>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <Button type="submit" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Creating…' : 'Create private link'}</Button>
    </form>
  );
}

export function RoomActions({ id, revoked }: { id: string; revoked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  if (link) return <LinkReveal link={link} onDone={() => setLink(null)} />;
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => {
        if (!confirm('Create a new link? The current link will stop working.')) return;
        const result = await renewViewingRoomLinkAction(id);
        if (result.success) setLink(result.link ?? null); else toast.error(result.error ?? 'Failed');
      })}>{revoked ? 'Re-open with new link' : 'New link'}</Button>
      {!revoked && (
        <Button size="sm" variant="outline" className="text-red-600" disabled={pending} onClick={() => startTransition(async () => {
          if (!confirm('Revoke this viewing room? The link will stop working immediately.')) return;
          const result = await revokeViewingRoomAction(id);
          if (result.success) toast.success('Room revoked'); else toast.error(result.error ?? 'Failed');
        })}>Revoke</Button>
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveExhibitionAction } from './actions';

export interface ArtworkOption { id: string; title: string; image_url: string | null; year: number | null }
export interface ExhibitionValues {
  id?: string;
  title?: string | null;
  venue?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  external_url?: string | null;
  is_published?: boolean | null;
  artwork_ids?: string[];
}

export function ExhibitionForm({ initial, artworks, canPublish }: { initial?: ExhibitionValues; artworks: ArtworkOption[]; canPublish: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.artwork_ids ?? []));
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => artworks.filter((a) => a.title.toLowerCase().includes(filter.toLowerCase())), [artworks, filter]);
  const [cover, setCover] = useState(initial?.cover_image_url ?? '');

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await saveExhibitionAction(initial?.id ?? null, formData);
          if (!result.success) return void toast.error(result.error ?? 'Could not save');
          toast.success('Exhibition saved');
          if (!initial?.id && result.id) router.push(`/studio/exhibitions/${result.id}`);
          else router.refresh();
        })
      }
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ex-title">Title</Label><Input id="ex-title" name="title" defaultValue={initial?.title ?? ''} required /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-venue">Venue</Label><Input id="ex-venue" name="venue" defaultValue={initial?.venue ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-location">City / country</Label><Input id="ex-location" name="location" defaultValue={initial?.location ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-start">Opens</Label><Input id="ex-start" name="start_date" type="date" defaultValue={initial?.start_date ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-end">Closes</Label><Input id="ex-end" name="end_date" type="date" defaultValue={initial?.end_date ?? ''} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ex-desc">Description</Label><Textarea id="ex-desc" name="description" rows={5} defaultValue={initial?.description ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-url">Venue website</Label><Input id="ex-url" name="external_url" type="url" defaultValue={initial?.external_url ?? ''} placeholder="https://" /></div>
        <input type="hidden" name="cover_image_url" value={cover} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-800">Artworks in this exhibition ({selected.size})</legend>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter artworks" aria-label="Filter artworks" />
        <ul className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto rounded-xl bg-slate-50 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((artwork) => {
            const checked = selected.has(artwork.id);
            return (
              <li key={artwork.id}>
                <label className={`block cursor-pointer rounded-xl border-2 bg-white p-2 ${checked ? 'border-[#FFB38A]' : 'border-transparent'}`}>
                  <input
                    type="checkbox"
                    name="artwork_ids"
                    value={artwork.id}
                    checked={checked}
                    onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(artwork.id)) next.delete(artwork.id); else next.add(artwork.id); return next; })}
                    className="sr-only"
                  />
                  <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {artwork.image_url && <img src={artwork.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium">{artwork.title}</p>
                  {checked && artwork.image_url && (
                    <button type="button" onClick={(e) => { e.preventDefault(); setCover(artwork.image_url ?? ''); }} className={`mt-1 text-[11px] font-semibold ${cover === artwork.image_url ? 'text-orange-600' : 'text-slate-400 hover:text-slate-700'}`}>
                      {cover === artwork.image_url ? 'Cover image' : 'Use as cover'}
                    </button>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is_published" defaultChecked={Boolean(initial?.is_published)} disabled={!canPublish} className="mt-0.5 h-4 w-4" />
        <span>Publish on the website{!canPublish && ' (available after the database update)'}. Only published exhibitions and their public artworks are shown.</span>
      </label>
      <Button type="submit" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Saving…' : 'Save exhibition'}</Button>
    </form>
  );
}

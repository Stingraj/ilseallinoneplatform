'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { saveExhibitionAction } from './actions';

export interface ArtworkOption {
  id: string;
  title: string;
  image_url: string | null;
  year: number | null;
  status?: string | null;
}
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
  updated_at?: string | null;
  /** In curated order. */
  artwork_ids?: string[];
}

export function ExhibitionForm({ initial, artworks, canPublish }: { initial?: ExhibitionValues; artworks: ArtworkOption[]; canPublish: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState<string[]>(() => [...new Set(initial?.artwork_ids ?? [])]);
  const [filter, setFilter] = useState('');
  const [cover, setCover] = useState(initial?.cover_image_url ?? '');
  const [error, setError] = useState<string | null>(null);
  const byId = useMemo(() => new Map(artworks.map((a) => [a.id, a])), [artworks]);
  const shown = useMemo(
    () => artworks.filter((a) => !order.includes(a.id) && a.title.toLowerCase().includes(filter.toLowerCase())),
    [artworks, filter, order]
  );

  const move = (index: number, delta: number) =>
    setOrder((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const result = await saveExhibitionAction(initial?.id ?? null, formData);
          if (!result.success) {
            setError(result.error ?? 'Could not save');
            toast.error(result.error ?? 'Could not save');
            return;
          }
          toast.success('Exhibition saved');
          if (!initial?.id && result.id) router.push(`/studio/exhibitions/${result.id}`);
          else router.refresh();
        })
      }
      className="space-y-8"
    >
      {initial?.updated_at && <input type="hidden" name="expected_updated_at" value={initial.updated_at} />}
      {order.map((id) => <input key={id} type="hidden" name="artwork_ids" value={id} />)}
      <input type="hidden" name="cover_image_url" value={cover} />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-[color:var(--studio-ink)]">Details</legend>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ex-title">Title <span aria-hidden>*</span></Label><Input id="ex-title" name="title" defaultValue={initial?.title ?? ''} required /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ex-desc">Description</Label><Textarea id="ex-desc" name="description" rows={5} defaultValue={initial?.description ?? ''} /></div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-[color:var(--studio-ink)]">Venue and dates</legend>
        <div className="space-y-1.5"><Label htmlFor="ex-venue">Venue</Label><Input id="ex-venue" name="venue" defaultValue={initial?.venue ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-location">City / country</Label><Input id="ex-location" name="location" defaultValue={initial?.location ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-start">Opens</Label><Input id="ex-start" name="start_date" type="date" defaultValue={initial?.start_date ?? ''} /></div>
        <div className="space-y-1.5"><Label htmlFor="ex-end">Closes</Label><Input id="ex-end" name="end_date" type="date" defaultValue={initial?.end_date ?? ''} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ex-url">Venue website</Label><Input id="ex-url" name="external_url" type="url" defaultValue={initial?.external_url ?? ''} placeholder="https://" /></div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-[color:var(--studio-ink)]">Artworks in this exhibition ({order.length})</legend>
        <p className="text-sm text-[color:var(--studio-muted)]">
          The order here is the order used on the exhibition page and in its catalogue. Choosing a work never publishes it.
        </p>

        {order.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[color:var(--studio-line)] p-4 text-sm text-[color:var(--studio-muted)]">No works chosen yet. Add them from the archive below.</p>
        ) : (
          <ol className="divide-y divide-[color:var(--studio-line)] rounded-xl border border-[color:var(--studio-line)] bg-white" aria-label="Selected artworks, in order">
            {order.map((id, index) => {
              const artwork = byId.get(id);
              const isPrivate = artwork?.status === 'Private' || artwork?.status === 'Archived';
              return (
                <li key={id} className="flex items-center gap-3 p-2.5">
                  <span className="w-6 text-center text-xs font-semibold tabular-nums text-[color:var(--studio-muted)]">{index + 1}</span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#efece8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {artwork?.image_url ? <img src={artwork.image_url} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="h-4 w-4 text-[color:var(--studio-muted)]" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{artwork?.title ?? 'Removed from the archive'}</span>
                    <span className="block text-xs text-[color:var(--studio-muted)]">
                      {[artwork?.year, artwork?.status].filter(Boolean).join(' · ')}
                      {isPrivate && ' · stays hidden on the public exhibition page'}
                    </span>
                  </span>
                  {artwork?.image_url && (
                    <button type="button" onClick={() => setCover(artwork.image_url ?? '')} className={`hidden rounded-md px-2 py-1 text-xs sm:block ${cover === artwork.image_url ? 'font-semibold text-[color:var(--studio-accent)]' : 'text-[color:var(--studio-muted)] hover:text-[color:var(--studio-ink)]'}`}>
                      {cover === artwork.image_url ? 'Cover' : 'Use as cover'}
                    </button>
                  )}
                  <div className="flex">
                    <Button type="button" size="icon" variant="ghost" className="h-11 w-11" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${artwork?.title ?? 'work'} up`}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-11 w-11" disabled={index === order.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${artwork?.title ?? 'work'} down`}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-11 w-11" onClick={() => setOrder((c) => c.filter((x) => x !== id))} aria-label={`Remove ${artwork?.title ?? 'work'}`}><X className="h-4 w-4" /></Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="space-y-2">
          <Label htmlFor="ex-filter">Add from the archive</Label>
          <Input id="ex-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by title" />
          <ul className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-xl bg-[#f3f1ee] p-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="Archive artworks">
            {shown.map((artwork) => (
              <li key={artwork.id}>
                <button
                  type="button"
                  onClick={() => setOrder((c) => [...c, artwork.id])}
                  className="group flex w-full items-center gap-2 rounded-lg bg-white p-1.5 text-left hover:ring-1 hover:ring-[color:var(--studio-line)]"
                  aria-label={`Add ${artwork.title}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#efece8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {artwork.image_url && <img src={artwork.image_url} alt="" className="h-full w-full object-contain" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{artwork.title}</span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-[color:var(--studio-muted)] group-hover:text-[color:var(--studio-ink)]" aria-hidden />
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="col-span-full p-3 text-sm text-[color:var(--studio-muted)]">No more works match.</li>}
          </ul>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-[color:var(--studio-ink)]">Publication</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={Boolean(initial?.is_published)} disabled={!canPublish} className="mt-0.5 h-4 w-4" />
          <span>Show on the website{!canPublish && ' (available after the database update)'}. Only published exhibitions and their public works appear.</span>
        </label>
      </fieldset>

      {error && <p role="alert" className="rounded-xl bg-[#FCECEC] p-3 text-sm text-[#A12D2D]">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : initial?.id ? 'Save changes' : 'Create exhibition'}</Button>
    </form>
  );
}

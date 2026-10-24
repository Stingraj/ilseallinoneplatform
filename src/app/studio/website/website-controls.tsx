'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { setArtworkFeaturedAction, setArtworkPublicPriceVisibilityAction } from '@/app/actions/db';
import { setArtworkPublicAction } from './actions';

export interface WebsiteArtworkRow {
  id: string;
  slug: string | null;
  title: string;
  status: string;
  image_url: string | null;
  year: number | null;
  is_public: boolean | null;
  is_featured: boolean | null;
  is_price_visible: boolean | null;
}

type Filter = 'all' | 'public' | 'hidden' | 'featured';

export function WebsiteControls({ artworks, publishingEnabled }: { artworks: WebsiteArtworkRow[]; publishingEnabled: boolean }) {
  const [rows, setRows] = useState(artworks);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pending, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.title.toLowerCase().includes(q)) return false;
      if (filter === 'public') return row.is_public;
      if (filter === 'hidden') return !row.is_public;
      if (filter === 'featured') return row.is_featured;
      return true;
    });
  }, [rows, query, filter]);

  // Optimistic update with rollback when the server refuses.
  function update(id: string, patch: Partial<WebsiteArtworkRow>, run: () => Promise<{ success: boolean; error?: string | null }>) {
    const previous = rows;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    startTransition(async () => {
      const result = await run();
      if (!result.success) {
        setRows(previous);
        toast.error(result.error ?? 'Could not save the change.');
      } else {
        toast.success('Website updated');
      }
    });
  }

  const featuredCount = rows.filter((row) => row.is_featured).length;

  return (
    <div className="studio-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search artworks" className="pl-9" aria-label="Search artworks" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
          {(['all', 'public', 'hidden', 'featured'] as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {key === 'public' ? 'On website' : key}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden grid-cols-[1fr_120px_120px_120px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
        <span>Artwork</span>
        <span className="text-center">On website</span>
        <span className="text-center">Featured ({featuredCount}/10)</span>
        <span className="text-center">Show price</span>
      </div>

      <ul className="divide-y divide-slate-100" aria-busy={pending}>
        {shown.map((row) => {
          const locked = ['Private', 'Archived'].includes(row.status);
          return (
            <li key={row.id} className="grid grid-cols-2 items-center gap-4 p-4 md:grid-cols-[1fr_120px_120px_120px]">
              <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {row.image_url && <img src={row.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <Link href={`/studio/archive/${row.id}`} className="block truncate text-sm font-semibold text-slate-800 hover:underline">{row.title}</Link>
                  <p className="text-xs text-slate-400">
                    {[row.status, row.year].filter(Boolean).join(' · ')}
                    {row.is_public && row.slug && (
                      <>
                        {' · '}
                        <a href={`/artworks/${row.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 underline">View</a>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 text-xs text-slate-500 md:justify-center">
                <span className="md:sr-only">On website</span>
                {row.is_public ? <Eye className="h-4 w-4 text-emerald-500 md:hidden" aria-hidden /> : <EyeOff className="h-4 w-4 md:hidden" aria-hidden />}
                <Switch
                  checked={Boolean(row.is_public)}
                  disabled={!publishingEnabled || locked || pending}
                  aria-label={`Show ${row.title} on the website`}
                  onCheckedChange={(value) => update(row.id, { is_public: value }, () => setArtworkPublicAction(row.id, value))}
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-xs text-slate-500 md:justify-center">
                <span className="md:sr-only">Featured</span>
                <Star className={`h-4 w-4 md:hidden ${row.is_featured ? 'fill-amber-400 text-amber-400' : ''}`} aria-hidden />
                <Switch
                  checked={Boolean(row.is_featured)}
                  disabled={pending}
                  aria-label={`Feature ${row.title} on the home page`}
                  onCheckedChange={(value) => update(row.id, { is_featured: value }, () => setArtworkFeaturedAction(row.id, value))}
                />
              </label>

              <label className="col-span-2 flex items-center justify-between gap-2 text-xs text-slate-500 md:col-span-1 md:justify-center">
                <span className="md:sr-only">Show price publicly</span>
                <Switch
                  checked={row.is_price_visible !== false}
                  disabled={pending}
                  aria-label={`Show the price of ${row.title} publicly`}
                  onCheckedChange={(value) => update(row.id, { is_price_visible: value }, () => setArtworkPublicPriceVisibilityAction(row.id, value))}
                />
              </label>
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-8 text-center text-sm text-slate-500">No artworks match.</li>}
      </ul>
    </div>
  );
}

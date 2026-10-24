import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkCard } from '@/components/site/artwork-card';
import { slugify } from '@/lib/website/mappers';
import { getPublicArtworks } from '@/lib/website/public-artwork-service';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Works', description: 'Paintings and works on paper, with availability.' };
export const revalidate = 300;

type Search = { collection?: string; medium?: string; availability?: string; q?: string };

function chipHref(current: Search, key: keyof Search, value?: string) {
  const params = new URLSearchParams();
  for (const [name, existing] of Object.entries(current)) if (existing && name !== key) params.set(name, existing);
  if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/artworks?${query}` : '/artworks';
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex h-9 items-center whitespace-nowrap border px-4 text-[12px] tracking-[0.08em] transition',
        active ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink hover:border-ink'
      )}
    >
      {children}
    </Link>
  );
}

export default async function ArtworksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const { artworks, error } = await getPublicArtworks();

  const collections = [...new Set(artworks.map((a) => a.collection ?? a.series).filter(Boolean) as string[])].sort();
  const mediums = [...new Set(artworks.map((a) => a.medium).filter(Boolean) as string[])].sort();
  const query = search.q?.trim().toLowerCase();

  const shown = artworks.filter((artwork) => {
    if (search.collection && slugify(artwork.collection ?? artwork.series ?? '') !== search.collection) return false;
    if (search.medium && slugify(artwork.medium ?? '') !== search.medium) return false;
    if (search.availability === 'available' && artwork.availability !== 'Available') return false;
    if (query && ![artwork.title, artwork.medium, artwork.collection, artwork.series].some((v) => v?.toLowerCase().includes(query))) return false;
    return true;
  });

  return (
    <div className="site-container pb-28 pt-32 sm:pt-40">
      <header className="mb-12 grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow">Catalogue</p>
          <h1 className="display-xl mt-4">Works</h1>
        </div>
        <form action="/artworks" className="lg:col-span-4 lg:col-start-9" role="search">
          {search.collection && <input type="hidden" name="collection" value={search.collection} />}
          {search.medium && <input type="hidden" name="medium" value={search.medium} />}
          {search.availability && <input type="hidden" name="availability" value={search.availability} />}
          <label htmlFor="works-search" className="sr-only">Search works</label>
          <input
            id="works-search"
            name="q"
            defaultValue={search.q}
            placeholder="Search by title, medium or series"
            className="w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 focus:border-ink focus:outline-none focus:ring-0"
          />
        </form>
      </header>

      <div className="mb-12 space-y-4 border-y border-ink/10 py-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip href={chipHref(search, 'availability')} active={!search.availability}>All works</Chip>
          <Chip href={chipHref(search, 'availability', 'available')} active={search.availability === 'available'}>Available</Chip>
          {collections.map((name) => (
            <Chip key={name} href={chipHref(search, 'collection', search.collection === slugify(name) ? undefined : slugify(name))} active={search.collection === slugify(name)}>
              {name}
            </Chip>
          ))}
        </div>
        {mediums.length > 1 && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {mediums.map((name) => (
              <Chip key={name} href={chipHref(search, 'medium', search.medium === slugify(name) ? undefined : slugify(name))} active={search.medium === slugify(name)}>
                {name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="mb-8 text-stone">The catalogue could not be loaded just now. Please try again shortly.</p>}

      {!error && (
        <p className="mb-8 text-sm text-stone" aria-live="polite">
          {shown.length} {shown.length === 1 ? 'work' : 'works'}
        </p>
      )}

      {error ? null : shown.length === 0 ? (
        <div className="py-20 text-center">
          {artworks.length === 0 ? (
            <p className="font-display text-3xl italic">New works are being added. Please check back soon.</p>
          ) : (
            <>
              <p className="font-display text-3xl italic">No works match these filters.</p>
              <Link href="/artworks" className="link-underline mt-6 inline-block text-[12px] uppercase tracking-[0.22em]">Clear filters</Link>
            </>
          )}
        </div>
      ) : (
        <ul className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((artwork, index) => (
            <li key={artwork.id}>
              <ArtworkCard artwork={artwork} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

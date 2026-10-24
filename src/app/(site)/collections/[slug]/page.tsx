import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/site/artwork-card';
import { slugify } from '@/lib/website/mappers';
import { getCollections, getPublicArtworks } from '@/lib/website/public-artwork-service';

export const revalidate = 300;

async function load(slug: string) {
  const [collections, { artworks }] = await Promise.all([getCollections(), getPublicArtworks()]);
  const collection = collections.find((item) => item.slug === slug);
  if (!collection) return null;
  return { collection, works: artworks.filter((artwork) => slugify(artwork.collection ?? artwork.series ?? '') === slug) };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await load((await params).slug);
  return data ? { title: data.collection.name } : { title: 'Collection not found' };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { collection, works } = data;

  return (
    <div className="site-container pb-28 pt-32 sm:pt-40">
      <Link href="/collections" className="eyebrow hover:text-ink">← Collections</Link>
      <h1 className="display-xl mt-6">{collection.name}</h1>
      <p className="mt-6 text-sm text-stone">{works.length} {works.length === 1 ? 'work' : 'works'}</p>
      <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((artwork, index) => (
          <li key={artwork.id} className={index % 3 === 1 ? 'lg:mt-24' : undefined}>
            <ArtworkCard artwork={artwork} priority={index < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}

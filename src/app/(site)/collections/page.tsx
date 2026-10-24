import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkImage } from '@/components/site/artwork-image';
import { getCollections } from '@/lib/website/public-artwork-service';

export const metadata: Metadata = { title: 'Collections', description: 'Series and bodies of work.' };
export const revalidate = 300;

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <div className="site-container pb-28 pt-32 sm:pt-40">
      <p className="eyebrow">Series</p>
      <h1 className="display-xl mt-4">Collections</h1>

      {collections.length === 0 ? (
        <p className="mt-12 max-w-lg text-stone">Collections will appear here as works are grouped into series in the archive.</p>
      ) : (
        <ul className="mt-16 space-y-24 sm:space-y-32">
          {collections.map((collection, index) => (
            <li key={collection.slug}>
              <Link href={`/collections/${collection.slug}`} className="group grid items-end gap-8 lg:grid-cols-12">
                <div className={`relative aspect-[4/3] overflow-hidden bg-[#E9E4DD] lg:col-span-7 ${index % 2 ? 'lg:order-2 lg:col-start-6' : ''}`}>
                  <ArtworkImage
                    src={collection.cover?.imageUrl ?? null}
                    alt={collection.name}
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    priority={index === 0}
                    className="transition-transform [transition-duration:1200ms] group-hover:scale-[1.03]"
                  />
                </div>
                <div className={`lg:col-span-4 ${index % 2 ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-9'}`}>
                  <p className="eyebrow">{String(index + 1).padStart(2, '0')} · {collection.count} {collection.count === 1 ? 'work' : 'works'}</p>
                  <h2 className="mt-4 font-display text-5xl font-light group-hover:italic">{collection.name}</h2>
                  <span className="link-underline mt-6 inline-block text-[12px] font-medium uppercase tracking-[0.22em]">View collection</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

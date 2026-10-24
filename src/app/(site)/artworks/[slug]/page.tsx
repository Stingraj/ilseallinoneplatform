import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard, AvailabilityLabel } from '@/components/site/artwork-card';
import { ArtworkLightbox } from '@/components/site/lightbox';
import { EnquiryForm } from '@/components/site/enquiry-form';
import { TrackView } from '@/components/site/track-view';
import { SITE } from '@/lib/site/config';
import { slugify } from '@/lib/website/mappers';
import { getArtworkBySlug, getPublicArtworks, getRelatedArtworks } from '@/lib/website/public-artwork-service';

export const revalidate = 300;

export async function generateStaticParams() {
  const { artworks } = await getPublicArtworks();
  return artworks.slice(0, 100).map((artwork) => ({ slug: artwork.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const artwork = await getArtworkBySlug((await params).slug);
  if (!artwork) return { title: 'Work not found' };
  const description = [artwork.medium, artwork.dimensions, artwork.year].filter(Boolean).join(', ');
  return {
    title: artwork.title,
    description: description || undefined,
    alternates: { canonical: `/artworks/${artwork.slug}` },
    openGraph: { title: artwork.title, description, images: artwork.imageUrl ? [{ url: artwork.imageUrl }] : undefined },
  };
}

export default async function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const artwork = await getArtworkBySlug((await params).slug);
  if (!artwork) notFound();
  const related = await getRelatedArtworks(artwork);
  const group = artwork.collection ?? artwork.series;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.title,
    creator: { '@type': 'Person', name: SITE.artistName },
    artMedium: artwork.medium ?? undefined,
    dateCreated: artwork.year ? String(artwork.year) : undefined,
    image: artwork.imageUrl ?? undefined,
    url: `${SITE.url}/artworks/${artwork.slug}`,
  };

  const facts: [string, string | null][] = [
    ['Medium', artwork.medium],
    ['Dimensions', artwork.dimensions],
    ['Year', artwork.year ? String(artwork.year) : null],
    ['Series', group],
  ];

  return (
    <article className="pb-24 pt-20 sm:pt-24">
      <TrackView event="artwork_view" artworkId={artwork.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <div className="grid lg:min-h-[calc(100svh-6rem)] lg:grid-cols-12">
        <div className="relative h-[70svh] bg-[#E9E4DD] lg:col-span-8 lg:h-auto">
          <div className="absolute inset-0 p-6 sm:p-12 lg:p-16">
            <div className="relative h-full w-full">
              <ArtworkLightbox src={artwork.imageUrl} alt={artwork.title} />
            </div>
          </div>
        </div>

        <div className="site-container flex flex-col justify-between gap-12 py-12 lg:col-span-4 lg:px-12 lg:py-16">
          <div>
            <nav aria-label="Breadcrumb" className="eyebrow">
              <Link href="/artworks" className="hover:text-ink">Works</Link>
              {group && (
                <>
                  {' / '}
                  <Link href={`/collections/${slugify(group)}`} className="hover:text-ink">{group}</Link>
                </>
              )}
            </nav>
            <h1 className="mt-6 font-display text-5xl font-light italic leading-[1.02] sm:text-6xl">{artwork.title}</h1>

            <dl className="mt-10 divide-y divide-ink/10 border-y border-ink/10 text-sm">
              {facts.filter(([, value]) => value).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-6 py-3">
                  <dt className="text-stone">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-6 py-3">
                <dt className="text-stone">Availability</dt>
                <dd><AvailabilityLabel artwork={artwork} className="text-ink" /></dd>
              </div>
            </dl>

            {artwork.description && (
              <div className="mt-10 space-y-4 text-[15px] leading-7 text-ink/80">
                {artwork.description.split(/\n\s*\n/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>

          <div id="enquire">
            <h2 className="eyebrow mb-6">{artwork.availability === 'Sold' ? 'Ask about similar works' : 'Enquire'}</h2>
            <EnquiryForm artwork={{ id: artwork.id, title: artwork.title }} sourcePage={`/artworks/${artwork.slug}`} compact />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="site-container mt-24 border-t border-ink/15 pt-10" aria-labelledby="related">
          <h2 id="related" className="display-lg mb-12">{group ? `More from ${group}` : 'More works'}</h2>
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <li key={item.id}>
                <ArtworkCard artwork={item} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

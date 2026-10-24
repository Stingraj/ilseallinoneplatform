import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArtworkCard } from '@/components/site/artwork-card';
import { ArtworkImage } from '@/components/site/artwork-image';
import { EnquiryForm } from '@/components/site/enquiry-form';
import { formatExhibitionDates } from '@/lib/website/dates';
import { getExhibitionArtworks, getExhibitionBySlug } from '@/lib/website/public-artwork-service';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const exhibition = await getExhibitionBySlug((await params).slug);
  return exhibition ? { title: exhibition.title, description: exhibition.description ?? undefined } : { title: 'Exhibition not found' };
}

export default async function ExhibitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const exhibition = await getExhibitionBySlug((await params).slug);
  if (!exhibition) notFound();
  const artworks = await getExhibitionArtworks(exhibition.id);

  return (
    <article className="pb-28 pt-32 sm:pt-40">
      <div className="site-container">
        <Link href="/exhibitions" className="eyebrow hover:text-ink">← Exhibitions</Link>
        <h1 className="display-xl mt-6 max-w-5xl">{exhibition.title}</h1>
        <div className="mt-8 flex flex-col gap-2 text-stone sm:flex-row sm:gap-8">
          <span>{formatExhibitionDates(exhibition)}</span>
          <span>{[exhibition.venue, exhibition.location].filter(Boolean).join(', ')}</span>
          {exhibition.externalUrl && (
            <a href={exhibition.externalUrl} target="_blank" rel="noopener noreferrer" className="link-underline text-ink">Venue website</a>
          )}
        </div>
      </div>

      {exhibition.coverImageUrl && (
        <div className="relative mt-16 aspect-[16/9] w-full bg-[#E9E4DD]">
          <ArtworkImage src={exhibition.coverImageUrl} alt={exhibition.title} sizes="100vw" priority />
        </div>
      )}

      <div className="site-container mt-16 grid gap-16 lg:grid-cols-12">
        {exhibition.description && (
          <div className="space-y-5 text-[16px] leading-8 text-ink/80 lg:col-span-6">
            {exhibition.description.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}
        <div className="lg:col-span-5 lg:col-start-8">
          <h2 className="eyebrow mb-6">Enquire about this exhibition</h2>
          <EnquiryForm sourcePage={`/exhibitions/${exhibition.slug}`} compact />
        </div>
      </div>

      {artworks.length > 0 && (
        <section className="site-container mt-24 border-t border-ink/15 pt-10" aria-labelledby="works-shown">
          <h2 id="works-shown" className="display-lg mb-12">Works in the exhibition</h2>
          <ul className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => <li key={artwork.id}><ArtworkCard artwork={artwork} /></li>)}
          </ul>
        </section>
      )}
    </article>
  );
}

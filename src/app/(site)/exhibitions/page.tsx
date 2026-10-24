import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkImage } from '@/components/site/artwork-image';
import { formatExhibitionDates } from '@/lib/website/dates';
import { getPublicExhibitions, splitExhibitions } from '@/lib/website/public-artwork-service';
import type { PublicExhibition } from '@/lib/website/types';

export const metadata: Metadata = { title: 'Exhibitions', description: 'Current, upcoming and past exhibitions.' };
export const revalidate = 300;

function ExhibitionRow({ exhibition }: { exhibition: PublicExhibition }) {
  return (
    <Link href={`/exhibitions/${exhibition.slug}`} className="group grid gap-6 py-10 sm:grid-cols-12 sm:items-center">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E9E4DD] sm:col-span-4">
        <ArtworkImage src={exhibition.coverImageUrl} alt={exhibition.title} sizes="(min-width: 640px) 33vw, 100vw" className="transition-transform [transition-duration:1200ms] group-hover:scale-[1.03]" />
      </div>
      <div className="sm:col-span-7 sm:col-start-6">
        <p className="eyebrow">{formatExhibitionDates(exhibition)}</p>
        <h3 className="mt-3 font-display text-4xl font-light group-hover:italic">{exhibition.title}</h3>
        <p className="mt-3 text-stone">{[exhibition.venue, exhibition.location].filter(Boolean).join(', ')}</p>
      </div>
    </Link>
  );
}

export default async function ExhibitionsPage() {
  const { current, past } = splitExhibitions(await getPublicExhibitions());
  return (
    <div className="site-container pb-28 pt-32 sm:pt-40">
      <p className="eyebrow">Programme</p>
      <h1 className="display-xl mt-4">Exhibitions</h1>

      {current.length === 0 && past.length === 0 && (
        <p className="mt-12 max-w-lg text-stone">Exhibition news will be published here. Subscribe below to hear about openings first.</p>
      )}

      {current.length > 0 && (
        <section className="mt-16" aria-labelledby="current">
          <h2 id="current" className="eyebrow border-b border-ink/15 pb-4">Current &amp; upcoming</h2>
          <ul className="divide-y divide-ink/10">{current.map((e) => <li key={e.id}><ExhibitionRow exhibition={e} /></li>)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="mt-20" aria-labelledby="past">
          <h2 id="past" className="eyebrow border-b border-ink/15 pb-4">Past</h2>
          <ul className="divide-y divide-ink/10">{past.map((e) => <li key={e.id}><ExhibitionRow exhibition={e} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}

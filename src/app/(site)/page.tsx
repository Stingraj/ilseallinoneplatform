import Link from 'next/link';
import { ArtworkCard } from '@/components/site/artwork-card';
import { ArtworkImage } from '@/components/site/artwork-image';
import { Reveal } from '@/components/site/reveal';
import { SITE } from '@/lib/site/config';
import {
  getCollections,
  getFeaturedArtworks,
  getPublicExhibitions,
  getPublicProfile,
  splitExhibitions,
} from '@/lib/website/public-artwork-service';
import { formatExhibitionDates } from '@/lib/website/dates';

// Pages are regenerated whenever the archive changes (server actions call revalidatePath); this is a safety net.
export const revalidate = 300;

function firstParagraph(text: string | null, max = 420) {
  if (!text) return null;
  const paragraph = text.split(/\n\s*\n/)[0].trim();
  return paragraph.length > max ? `${paragraph.slice(0, max).replace(/\s+\S*$/, '')}…` : paragraph;
}

export default async function HomePage() {
  const [featured, profile, collections, exhibitions] = await Promise.all([
    getFeaturedArtworks(8),
    getPublicProfile(),
    getCollections(),
    getPublicExhibitions(),
  ]);
  const [hero, ...rest] = featured;
  const { current } = splitExhibitions(exhibitions);
  const statement = firstParagraph(profile?.statement ?? null, 260);
  const bio = firstParagraph(profile?.bio ?? null);

  return (
    <>
      {/* Hero ------------------------------------------------------------------------------------------------- */}
      <section className="relative flex h-[100svh] min-h-[560px] items-end overflow-hidden bg-ink text-paper">
        {hero?.imageUrl && (
          <div className="absolute inset-0">
            <ArtworkImage src={hero.imageUrl} alt={hero.title} sizes="100vw" priority className="animate-[fade-up_1.6s_ease-out_both] opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/30" />
          </div>
        )}
        <div className="site-container relative pb-14 sm:pb-20">
          <p className="eyebrow animate-fade-up text-paper/70">Paintings · Works on paper</p>
          <h1 className="display-xl mt-5 max-w-5xl animate-fade-up [animation-delay:120ms]">{SITE.artistName}</h1>
          <div className="mt-10 flex flex-col gap-6 animate-fade-up [animation-delay:240ms] sm:flex-row sm:items-end sm:justify-between">
            <Link
              href="/artworks"
              className="inline-flex h-12 w-fit items-center border border-paper/60 px-8 text-[12px] font-medium uppercase tracking-[0.22em] transition hover:bg-paper hover:text-ink"
            >
              View the works
            </Link>
            {hero && (
              <Link href={`/artworks/${hero.slug}`} className="text-sm text-paper/75 hover:text-paper">
                <span className="font-display text-lg italic">{hero.title}</span>
                {hero.year ? `, ${hero.year}` : ''}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Introduction ----------------------------------------------------------------------------------------- */}
      {(statement || bio) && (
        <section className="site-container grid gap-12 py-24 sm:py-32 lg:grid-cols-12">
          {statement && (
            <Reveal className="lg:col-span-7">
              <p className="font-display text-[clamp(1.75rem,3.4vw,3rem)] font-light italic leading-[1.2]">“{statement}”</p>
            </Reveal>
          )}
          {bio && (
            <Reveal className="lg:col-span-4 lg:col-start-9" delay={120}>
              <p className="eyebrow">The artist</p>
              <p className="mt-5 text-[15px] leading-7 text-ink/80">{bio}</p>
              <Link href="/about" className="link-underline mt-6 text-[12px] font-medium uppercase tracking-[0.22em]">
                Read the biography
              </Link>
            </Reveal>
          )}
        </section>
      )}

      {/* Selected works --------------------------------------------------------------------------------------- */}
      <section className="site-container pb-24 sm:pb-32" aria-labelledby="selected-works">
        <div className="mb-12 flex items-end justify-between gap-6 border-t border-ink/15 pt-8">
          <h2 id="selected-works" className="display-lg">Selected works</h2>
          <Link href="/artworks" className="link-underline shrink-0 text-[12px] font-medium uppercase tracking-[0.22em]">
            All works
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="max-w-lg text-stone">New works are being prepared for the website. Please get in touch to see what is available.</p>
        ) : (
          <div className="grid gap-x-8 gap-y-16 md:grid-cols-12">
            {rest[0] && (
              <Reveal className="md:col-span-7">
                <ArtworkCard artwork={rest[0]} aspect="landscape" sizes="(min-width: 768px) 58vw, 100vw" />
              </Reveal>
            )}
            {rest[1] && (
              <Reveal className="md:col-span-4 md:col-start-9 md:mt-32" delay={100}>
                <ArtworkCard artwork={rest[1]} sizes="(min-width: 768px) 33vw, 100vw" />
              </Reveal>
            )}
            {rest.slice(2, 5).map((artwork, index) => (
              <Reveal key={artwork.id} className="md:col-span-4" delay={index * 80}>
                <ArtworkCard artwork={artwork} sizes="(min-width: 768px) 33vw, 100vw" />
              </Reveal>
            ))}
            {rest.length === 0 && hero && (
              <Reveal className="md:col-span-6">
                <ArtworkCard artwork={hero} sizes="(min-width: 768px) 50vw, 100vw" />
              </Reveal>
            )}
          </div>
        )}
      </section>

      {/* Collections ------------------------------------------------------------------------------------------ */}
      {collections.length > 0 && (
        <section className="bg-[#ECE7E0] py-24 sm:py-32" aria-labelledby="collections-heading">
          <div className="site-container">
            <div className="mb-12 flex items-end justify-between gap-6">
              <h2 id="collections-heading" className="display-lg">Collections</h2>
              <Link href="/collections" className="link-underline shrink-0 text-[12px] font-medium uppercase tracking-[0.22em]">
                All collections
              </Link>
            </div>
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {collections.slice(0, 3).map((collection, index) => (
                <li key={collection.slug}>
                  <Reveal delay={index * 80}>
                    <Link href={`/collections/${collection.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                        <ArtworkImage
                          src={collection.cover?.imageUrl ?? null}
                          alt={collection.name}
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="transition-transform [transition-duration:1200ms] group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="mt-4 flex items-baseline justify-between">
                        <h3 className="font-display text-2xl">{collection.name}</h3>
                        <span className="text-xs text-stone">{collection.count} {collection.count === 1 ? 'work' : 'works'}</span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Exhibitions ------------------------------------------------------------------------------------------ */}
      {current.length > 0 && (
        <section className="site-container py-24 sm:py-32" aria-labelledby="exhibitions-heading">
          <h2 id="exhibitions-heading" className="display-lg mb-12">Current &amp; upcoming</h2>
          <ul className="divide-y divide-ink/15 border-y border-ink/15">
            {current.slice(0, 3).map((exhibition) => (
              <li key={exhibition.id}>
                <Link href={`/exhibitions/${exhibition.slug}`} className="group grid gap-2 py-8 sm:grid-cols-12 sm:items-baseline">
                  <span className="text-sm text-stone sm:col-span-3">{formatExhibitionDates(exhibition)}</span>
                  <span className="font-display text-3xl group-hover:italic sm:col-span-6">{exhibition.title}</span>
                  <span className="text-sm text-stone sm:col-span-3 sm:text-right">{[exhibition.venue, exhibition.location].filter(Boolean).join(', ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Collecting ------------------------------------------------------------------------------------------- */}
      <section className="site-container grid gap-10 border-t border-ink/15 py-24 sm:py-32 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow">Collecting</p>
          <h2 className="display-lg mt-5">Acquire a work, or arrange a private viewing.</h2>
        </div>
        <div className="flex flex-col justify-end gap-6 lg:col-span-4 lg:col-start-9">
          <p className="text-[15px] leading-7 text-ink/80">
            For availability, prices and private presentations of new work, write to the studio. Every enquiry is answered personally.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-12 w-fit items-center bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper transition hover:bg-ink/85"
          >
            Contact the studio
          </Link>
        </div>
      </section>
    </>
  );
}

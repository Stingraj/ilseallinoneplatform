import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkImage } from '@/components/site/artwork-image';
import { NewsletterForm } from '@/components/site/newsletter-form';
import { SITE } from '@/lib/site/config';
import { getFeaturedArtworks, getPublicLinks, getPublicProfile } from '@/lib/website/public-artwork-service';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Links',
  description: `New works, exhibitions and ways to reach ${SITE.artistName}.`,
};

/** The link-in-bio page: one column, made for a phone, built from the archive and the links set in the studio. */
export default async function LinksPage() {
  const [profile, links, works] = await Promise.all([getPublicProfile(), getPublicLinks(), getFeaturedArtworks(3)]);
  const name = profile?.fullName ?? SITE.artistName;
  const instagram = profile?.instagram?.replace(/^@/, '') || SITE.instagram;

  const standard = [
    { label: 'See the works', url: '/artworks', internal: true },
    { label: 'Exhibitions', url: '/exhibitions', internal: true },
    { label: 'Enquire about a work', url: '/contact', internal: true },
  ];

  const button = 'block w-full border border-ink/25 px-6 py-4 text-center text-[13px] font-medium uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper';

  return (
    <div className="site min-h-screen">
      <main id="main" className="mx-auto flex max-w-md flex-col items-center px-4 pb-20 pt-14 text-center">
        {profile?.photoUrl && (
          <div className="relative mb-6 h-24 w-24 overflow-hidden rounded-full bg-[#E9E4DD]">
            <ArtworkImage src={profile.photoUrl} alt={name} sizes="96px" priority />
          </div>
        )}
        <h1 className="font-display text-4xl font-light">{name}</h1>
        {profile?.location && <p className="mt-2 text-sm text-stone">{profile.location}</p>}

        <ul className="mt-10 w-full space-y-3">
          {links.map((link) => (
            <li key={`${link.label}-${link.url}`}>
              <a href={link.url} className={button} target={link.url.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">
                {link.label}
              </a>
            </li>
          ))}
          {standard.map((link) => (
            <li key={link.url}>
              <Link href={link.url} className={button}>{link.label}</Link>
            </li>
          ))}
        </ul>

        {works.length > 0 && (
          <section className="mt-14 w-full" aria-labelledby="latest-works">
            <h2 id="latest-works" className="eyebrow mb-4">Selected works</h2>
            <ul className="grid grid-cols-3 gap-2">
              {works.map((work) => (
                <li key={work.id}>
                  <Link href={`/artworks/${work.slug}`} className="relative block aspect-square overflow-hidden bg-[#E9E4DD]" aria-label={work.title}>
                    <ArtworkImage src={work.imageUrl} alt={work.title} sizes="(min-width: 448px) 140px, 30vw" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-14 w-full text-left" aria-labelledby="studio-news">
          <h2 id="studio-news" className="eyebrow mb-2">Studio news</h2>
          <p className="mb-4 text-sm text-stone">New works and exhibitions, a few times a year.</p>
          <NewsletterForm tone="light" />
        </section>

        <p className="mt-14 text-xs text-stone">
          <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="link-underline">Instagram</a>
          {' · '}
          <Link href="/" className="link-underline">Website</Link>
        </p>
      </main>
    </div>
  );
}

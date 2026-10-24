import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkImage } from '@/components/site/artwork-image';
import { SITE } from '@/lib/site/config';
import { getPublicProfile } from '@/lib/website/public-artwork-service';

export const metadata: Metadata = { title: 'About', description: `Biography and artist statement of ${SITE.artistName}.` };
export const revalidate = 300;

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={index}>{paragraph.trim()}</p>
      ))}
    </>
  );
}

export default async function AboutPage() {
  const profile = await getPublicProfile();
  const name = profile?.fullName && profile.fullName !== 'Elsa' ? profile.fullName : SITE.artistName;

  return (
    <div className="pb-28 pt-32 sm:pt-40">
      <div className="site-container grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow">About</p>
          <h1 className="display-lg mt-4">{name}</h1>
          {(profile?.location || profile?.nationality) && (
            <p className="mt-4 text-stone">{[profile.nationality, profile.location].filter(Boolean).join(' · ')}</p>
          )}
          {profile?.photoUrl && (
            <div className="relative mt-12 aspect-[4/5] overflow-hidden bg-[#E9E4DD]">
              <ArtworkImage src={profile.photoUrl} alt={`Portrait of ${name}`} sizes="(min-width: 1024px) 40vw, 100vw" priority />
            </div>
          )}
        </div>

        <div className="space-y-16 lg:col-span-6 lg:col-start-7 lg:pt-24">
          {profile?.statement && (
            <section aria-labelledby="statement">
              <h2 id="statement" className="eyebrow mb-6">Statement</h2>
              <div className="space-y-6 font-display text-[clamp(1.5rem,2.4vw,2.1rem)] font-light italic leading-[1.3]">
                <Paragraphs text={profile.statement} />
              </div>
            </section>
          )}
          {profile?.bio && (
            <section aria-labelledby="biography">
              <h2 id="biography" className="eyebrow mb-6">Biography</h2>
              <div className="space-y-5 text-[16px] leading-8 text-ink/80">
                <Paragraphs text={profile.bio} />
              </div>
            </section>
          )}
          {!profile?.bio && !profile?.statement && (
            <p className="text-stone">The biography is being updated.</p>
          )}
          <Link href="/contact" className="inline-flex h-12 items-center bg-ink px-8 text-[12px] font-medium uppercase tracking-[0.22em] text-paper hover:bg-ink/85">
            Contact the studio
          </Link>
        </div>
      </div>
    </div>
  );
}

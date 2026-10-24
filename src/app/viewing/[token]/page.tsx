import type { Metadata } from 'next';
import Link from 'next/link';
import { ArtworkImage } from '@/components/site/artwork-image';
import { EnquiryForm } from '@/components/site/enquiry-form';
import { TrackView } from '@/components/site/track-view';
import { SITE } from '@/lib/site/config';
import { loadViewingRoom } from '@/lib/viewing-rooms/server';
import { PasscodeForm } from './passcode-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Private viewing', robots: { index: false, follow: false, nocache: true } };

const CLOSED_COPY = {
  expired: 'This private viewing has ended.',
  revoked: 'This private viewing is no longer available.',
  inactive: 'This private viewing is not open at the moment.',
} as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-screen">
      <header className="site-container flex h-20 items-center justify-between">
        <Link href="/" className="font-display text-xl">{SITE.artistName}</Link>
        <span className="eyebrow">Private viewing</span>
      </header>
      <main className="site-container pb-28 pt-10">{children}</main>
    </div>
  );
}

export default async function ViewingRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadViewingRoom(token);

  if (result.kind === 'not_found' || result.kind === 'closed') {
    return (
      <Shell>
        <h1 className="display-lg max-w-3xl">{result.kind === 'closed' ? CLOSED_COPY[result.state] : 'This link is not valid.'}</h1>
        <p className="mt-6 max-w-md text-stone">If you were expecting to see works here, please contact the studio and a new link will be sent to you.</p>
        <Link href="/contact" className="link-underline mt-8 inline-block text-[12px] uppercase tracking-[0.22em]">Contact the studio</Link>
      </Shell>
    );
  }

  if (result.kind === 'passcode') {
    return (
      <Shell>
        <p className="eyebrow">Prepared for you</p>
        <h1 className="display-lg mt-4 max-w-3xl">{result.title}</h1>
        <p className="mt-6 max-w-md text-stone">Please enter the passcode you received with your invitation.</p>
        <PasscodeForm token={token} />
      </Shell>
    );
  }

  const { room, artworks } = result;
  return (
    <Shell>
      <TrackView event="viewing_room_open" />
      <p className="eyebrow">Prepared for you</p>
      <h1 className="display-xl mt-4 max-w-5xl">{room.title}</h1>
      {room.intro && <p className="mt-8 max-w-2xl text-[16px] leading-8 text-ink/80">{room.intro}</p>}
      {room.expiresAt && (
        <p className="mt-4 text-sm text-stone">
          Available until {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(room.expiresAt))}
        </p>
      )}

      <ul className="mt-20 space-y-28">
        {artworks.map((artwork, index) => (
          <li key={artwork.id} className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="relative aspect-[4/5] bg-[#E9E4DD] lg:col-span-7">
              <ArtworkImage src={artwork.imageUrl} alt={artwork.title} sizes="(min-width: 1024px) 58vw, 100vw" priority={index === 0} fit="contain" />
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <h2 className="font-display text-4xl font-light italic">{artwork.title}</h2>
              <p className="mt-4 text-stone">{[artwork.medium, artwork.dimensions, artwork.year].filter(Boolean).join(' · ')}</p>
              {artwork.price && <p className="mt-6 text-lg">{artwork.price}</p>}
              {artwork.status !== 'Available' && <p className="mt-6 text-stone">{artwork.status}</p>}
              {artwork.description && <p className="mt-6 text-[15px] leading-7 text-ink/80">{artwork.description}</p>}
            </div>
          </li>
        ))}
      </ul>
      {artworks.length === 0 && <p className="mt-12 text-stone">Works for this viewing are being prepared.</p>}

      <section className="mt-28 grid gap-10 border-t border-ink/15 pt-10 lg:grid-cols-12">
        <h2 className="display-lg lg:col-span-5">Questions or reservations</h2>
        <div className="lg:col-span-6 lg:col-start-7">
          <EnquiryForm sourcePage={`/viewing/${room.id}`} compact />
        </div>
      </section>
    </Shell>
  );
}

import Link from 'next/link';
import { ArtworkCard } from '@/components/site/artwork-card';
import type { GalleryPlan } from '@/lib/gallery/plan';

/** The same rooms as the 3D gallery, as an ordinary page: usable without WebGL, JavaScript or a pointing device. */
export function RoomGrid({ plan }: { plan: GalleryPlan }) {
  const rooms = plan.regions.filter((region) => region.kind === 'gallery');
  if (rooms.length === 0) return <p className="text-stone">New works are being prepared. Please check back soon.</p>;
  return (
    <div className="space-y-24">
      {rooms.map((room) => (
        <section key={room.id} aria-labelledby={`room-${room.id}`}>
          <div className="mb-8 flex items-baseline justify-between gap-6 border-t border-ink/15 pt-6">
            <h2 id={`room-${room.id}`} className="display-lg">{room.title}</h2>
            <p className="shrink-0 text-sm text-stone">{room.subtitle}</p>
          </div>
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {room.artworkIndexes.map((index) => (
              <li key={plan.artworks[index].artwork.id}>
                <ArtworkCard artwork={plan.artworks[index].artwork} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {plan.unhung.length > 0 && (
        <section aria-labelledby="unhung">
          <h2 id="unhung" className="eyebrow border-t border-ink/15 pt-6">Also in the archive</h2>
          <ul className="mt-4 space-y-1 text-sm">
            {plan.unhung.map((artwork) => (
              <li key={artwork.id}><Link href={`/artworks/${artwork.slug}`} className="link-underline">{artwork.title}</Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Text-only outline for screen readers while the canvas is showing. */
export function RoomIndex({ plan }: { plan: GalleryPlan }) {
  return (
    <section aria-label="Works in the gallery, by room">
      <h2>Works in the gallery, by room</h2>
      {plan.regions
        .filter((region) => region.kind === 'gallery')
        .map((room) => (
          <div key={room.id}>
            <h3>{`Room ${room.roomNumber}: ${room.title} (${room.subtitle})`}</h3>
            <ul>
              {room.artworkIndexes.map((index) => {
                const { artwork } = plan.artworks[index];
                const details = [artwork.medium, artwork.year, artwork.dimensions, artwork.availability].filter(Boolean).join(', ');
                return (
                  <li key={artwork.id}>
                    {artwork.title}
                    {details ? `, ${details}` : ''}
                    {artwork.description ? `. ${artwork.description}` : ''}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </section>
  );
}

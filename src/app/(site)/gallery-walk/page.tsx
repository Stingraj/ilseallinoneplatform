import type { Metadata } from 'next';
import { GalleryWalk } from '@/components/gallery3d/GalleryWalk';
import { RoomGrid, RoomIndex } from '@/components/gallery3d/RoomLists';
import { devFixtureArtworks } from '@/lib/gallery/dev-fixture';
import { planGallery } from '@/lib/gallery/plan';
import { SITE } from '@/lib/site/config';
import { getPublicArtworks } from '@/lib/website/public-artwork-service';

export const metadata: Metadata = {
  title: 'Gallery Walk',
  description: `A walk through the exhibition rooms of ${SITE.artistName}: paintings hung by collection.`,
};
// Rebuilt after every archive edit (the studio revalidates the whole site); this is only a safety net.
export const revalidate = 300;

export default async function GalleryWalkPage() {
  // Stand-in data for testing without the archive. Needs an explicit GALLERY_FIXTURE=1, is refused on Vercel
  // production, and always shows a visible notice. (Its images are generated locally and are not part of the repo.)
  const fixture = process.env.GALLERY_FIXTURE === '1' && process.env.VERCEL_ENV !== 'production';
  const { artworks } = fixture ? { artworks: devFixtureArtworks() } : await getPublicArtworks();
  const plan = planGallery(artworks, { artistName: SITE.artistName });

  return (
    <GalleryWalk
      plan={plan}
      fallback={<RoomGrid plan={plan} />}
      textIndex={<RoomIndex plan={plan} />}
      notice={fixture ? 'Development fixture data (GALLERY_FIXTURE=1). These are not your artworks.' : null}
    />
  );
}

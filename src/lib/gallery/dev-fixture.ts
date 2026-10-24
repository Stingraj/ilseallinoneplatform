import type { PublicArtwork } from '@/lib/website/types';

/**
 * Stand-in artworks for testing the gallery without the archive. Used only when GALLERY_FIXTURE=1
 * and refused on Vercel production (see gallery-walk/page.tsx). Always labelled on screen.
 */
const DIMENSIONS = ['80 × 100 cm', '140 × 100 cm', '120 × 120 cm', '60 × 90 cm', '150 × 110 cm', '40 × 50 cm', '24 × 30 in', '8 × 10 inches (20 × 25 cm)', '100 × 100 cm', null];

export function devFixtureArtworks(): PublicArtwork[] {
  const plan: [string | null, number][] = [['Coast', 7], ['Winter Light', 5], ['Studio Notes', 4], [null, 2]];
  const works: PublicArtwork[] = [];
  let n = 0;
  for (const [collection, count] of plan) {
    for (let i = 0; i < count; i += 1) {
      n += 1;
      const id = `fixture-${n}`;
      works.push({
        id, slug: id, title: `${collection ?? 'Untitled'} ${i + 1}`,
        medium: n % 3 === 0 ? 'Acrylic on canvas' : n % 3 === 1 ? 'Oil on linen' : 'Oil on board',
        dimensions: DIMENSIONS[n % DIMENSIONS.length], year: 2020 + (n % 6),
        availability: n % 5 === 0 ? 'Sold' : 'Available',
        series: null, category: null, collection,
        description: n % 2 === 0 ? 'Test description for the gallery walk: layered colour over a low horizon, painted in several sessions.' : null,
        imageUrl: `/dev-fixtures/work-${String(n).padStart(2, '0')}.jpg`,
        isFeatured: false, featuredOrder: null, price: n % 4 === 0 ? 1800 + n * 100 : null, currency: 'USD',
      });
    }
  }
  return works;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDimensions } from '../../src/lib/gallery/dimensions.ts';
import { MUSEUM_MAX_WORKS, paintingsFromArchive } from '../../src/lib/museum/fromArchive.ts';
import { corridorBayCount } from '../../src/lib/museum/layout.ts';
import { frameLayout, layoutGallery } from '../../src/lib/museum/galleryLayout.ts';
import type { PublicArtwork } from '../../src/lib/website/types.ts';

function art(id: string, over: Partial<PublicArtwork> = {}): PublicArtwork {
  return {
    id, slug: `slug-${id}`, title: `Work ${id}`, medium: 'Oil', dimensions: '60 × 80 cm', year: 2024, availability: 'Available',
    series: null, category: null, collection: null, description: 'First line.\nMore.', imageUrl: `https://x.supabase.co/storage/v1/object/public/a/${id}.jpg`,
    isFeatured: false, featuredOrder: null, price: null, currency: 'USD', ...over,
  };
}

test('dimensions: units, preferences and fallbacks', () => {
  assert.deepEqual(parseDimensions('60 × 80 cm'), { longCm: 80, shortCm: 60, known: true });
  const inches = parseDimensions('24 × 30 in');
  assert.ok(Math.abs(inches.longCm - 76.2) < 0.01 && Math.abs(inches.shortCm - 60.96) < 0.01);
  assert.equal(parseDimensions('8 × 10 inches (20 × 25 cm)').longCm, 25);
  assert.equal(parseDimensions('50 x 40').longCm, 50);
  for (const bad of [null, undefined, '', 'large']) assert.equal(parseDimensions(bad as string).known, false);
});

test('archive works become paintings in archive order, with the archive\'s own facts', () => {
  const list = paintingsFromArchive([art('a'), art('b', { availability: 'Sold', year: null })]);
  assert.deepEqual(list.map((p) => [p.id, p.order]), [['a', 1], ['b', 2]]);
  assert.equal(list[0].title, 'Work a');
  assert.equal(list[0].creationDate, '2024');
  assert.equal(list[1].creationDate, undefined);
  assert.equal(list[1].availability, 'Sold');
  assert.equal(list[0].href, '/artworks/slug-a');
  assert.deepEqual(list[0].physicalSize, { widthCm: 60, heightCm: 80 });
  assert.equal(list[0].image.original, 'https://x.supabase.co/storage/v1/object/public/a/a.jpg');
});

test('works without an image are left out, and an unreadable size is not guessed', () => {
  const list = paintingsFromArchive([art('a', { imageUrl: null }), art('b', { dimensions: 'large' }), art('c', { dimensions: null })]);
  assert.deepEqual(list.map((p) => p.id), ['b', 'c']);
  assert.equal(list[0].physicalSize, undefined);
  assert.equal(list[1].physicalSize, undefined);
});

test('the museum is capped so the corridor and texture memory stay bounded', () => {
  const list = paintingsFromArchive(Array.from({ length: MUSEUM_MAX_WORKS + 25 }, (_, i) => art(`w${i}`)));
  assert.equal(list.length, MUSEUM_MAX_WORKS);
});

test('layout: walls alternate, one bay per painting, frames keep the photograph\'s proportions', () => {
  const list = paintingsFromArchive([art('a'), art('b'), art('c')]).map((p) => ({ ...p, image: { ...p.image, width: 800, height: 1000 } }));
  const layout = layoutGallery(list);
  assert.deepEqual(layout.map((l) => l.wall), ['left', 'right', 'left']);
  assert.equal(corridorBayCount(3), 6);
  const frame = frameLayout(list[0]);
  assert.ok(Math.abs(frame.artWidth / frame.artHeight - 0.8) < 1e-9);
});

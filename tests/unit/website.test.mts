import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupCollections, slugify, sortArtworks, toPublicArtwork, toPublicProfile } from '../../src/lib/website/mappers.ts';

test('only allow-listed fields reach the public model', () => {
  const artwork = toPublicArtwork({
    id: 'a1', title: 'Salt', status: 'Available', price: 1200, is_price_visible: true,
    cost: 50, insurance_value: 9000, internal_notes: 'secret', location: 'Storage B', consignment_location: 'Gallery X',
  });
  const keys = Object.keys(artwork);
  for (const forbidden of ['cost', 'insurance_value', 'internal_notes', 'location', 'consignment_location', 'notes']) {
    assert.ok(!keys.includes(forbidden), `${forbidden} must not be exposed`);
  }
  assert.equal(artwork.price, 1200);
});

test('hidden or sold prices are never shown', () => {
  assert.equal(toPublicArtwork({ id: 'a', title: 'x', status: 'Available', price: 100, is_price_visible: false }).price, null);
  assert.equal(toPublicArtwork({ id: 'a', title: 'x', availability: 'Sold', price: 100 }).price, null);
  assert.equal(toPublicArtwork({ id: 'a', title: 'x', status: 'On Loan' }).availability, 'Reserved');
});

test('slugs fall back to the existing ID before the migration adds them', () => {
  assert.equal(toPublicArtwork({ id: 'uuid-1', title: 'x' }).slug, 'uuid-1');
  assert.equal(toPublicArtwork({ id: 'uuid-1', title: 'x', slug: 'x-abc123' }).slug, 'x-abc123');
  assert.equal(slugify('Lys over Jylland – Ø'), 'lys-over-jylland-o');
});

test('collections group by collection, then series', () => {
  const works = [
    toPublicArtwork({ id: '1', title: 'a', collection: 'Coast', image_url: 'https://x/1.jpg' }),
    toPublicArtwork({ id: '2', title: 'b', series: 'Coast' }),
    toPublicArtwork({ id: '3', title: 'c', collection: 'Winter' }),
  ];
  const groups = groupCollections(works);
  assert.equal(groups[0].name, 'Coast');
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].cover?.id, '1');
});

test('featured works come first, in their featured order', () => {
  const sorted = sortArtworks([
    toPublicArtwork({ id: 'n', title: 'n', year: 2025 }),
    toPublicArtwork({ id: 'f2', title: 'f2', is_featured: true, featured_order: 2 }),
    toPublicArtwork({ id: 'f1', title: 'f1', is_featured: true, featured_order: 1 }),
  ]);
  assert.deepEqual(sorted.map((a) => a.id), ['f1', 'f2', 'n']);
});

test('public profile drops private contact fields', () => {
  const profile = toPublicProfile({ full_name: 'Ilse', email: 'private@example.com', phone: '123', studio_address: 'Street 1', bio: 'Bio' });
  assert.ok(profile);
  assert.ok(!('email' in profile) && !('phone' in profile) && !('studio_address' in profile));
});

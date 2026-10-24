import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDimensions } from '../../src/lib/gallery/dimensions.ts';
import { groupArtworks, planGallery, EYE_HEIGHT } from '../../src/lib/gallery/plan.ts';
import { constrainMove, isWalkable, regionIndexAt } from '../../src/lib/gallery/walkable.ts';
import { buildRoute, sampleRoute } from '../../src/lib/gallery/route.ts';
import { NavController, lerpAngle } from '../../src/lib/gallery/navigation.ts';
import { TextureCache } from '../../src/lib/gallery/texture-cache.ts';
import { classify } from '../../src/lib/gallery/tier.ts';
import type { PublicArtwork } from '../../src/lib/website/types.ts';

function art(id: string, over: Partial<PublicArtwork> = {}): PublicArtwork {
  return {
    id, slug: id, title: `Work ${id}`, medium: 'Oil', dimensions: '60 × 80 cm', year: 2024, availability: 'Available',
    series: null, category: null, collection: null, description: null, imageUrl: `https://x.supabase.co/storage/v1/object/public/a/${id}.jpg`,
    isFeatured: false, featuredOrder: null, price: null, currency: 'USD', ...over,
  };
}
const many = (n: number, collection: string | null, offset = 0) => Array.from({ length: n }, (_, i) => art(`${collection ?? 'x'}${offset + i}`, { collection }));

test('dimensions: units, preferences and fallbacks', () => {
  assert.deepEqual(parseDimensions('60 × 80 cm'), { longCm: 80, shortCm: 60, known: true });
  const inches = parseDimensions('24 × 30 in');
  assert.ok(Math.abs(inches.longCm - 76.2) < 0.01 && Math.abs(inches.shortCm - 60.96) < 0.01);
  assert.equal(parseDimensions('8 × 10 inches (20 × 25 cm)').longCm, 25);
  assert.equal(parseDimensions('100x70cm').longCm, 100);
  assert.equal(parseDimensions('50 x 40').longCm, 50);
  assert.equal(parseDimensions('1000 × 900 cm').longCm, 260);
  for (const bad of [null, undefined, '', 'large', 'unknown size']) assert.equal(parseDimensions(bad as string).known, false);
});

test('grouping follows the archive: collections become rooms, small groups share one', () => {
  const works = [...many(4, 'Coast'), ...many(3, 'Winter'), ...many(1, 'Solo'), art('loose1'), art('loose2')];
  const groups = groupArtworks(works, 8, 3);
  assert.deepEqual(groups.map((g) => [g.title, g.items.length]), [['Coast', 4], ['Winter', 3], ['Further Works', 3]]);
  // no hard-coded content: different data, different rooms
  assert.deepEqual(groupArtworks(many(5, 'Salt'), 8, 3).map((g) => g.title), ['Salt']);
  assert.deepEqual(groupArtworks([art('a'), art('b')], 8, 3).map((g) => g.title), ['Selected Works']);
});

test('big collections are split into evenly sized rooms', () => {
  const groups = groupArtworks(many(19, 'Big'), 8, 3);
  assert.deepEqual(groups.map((g) => g.items.length), [7, 7, 5]);
  assert.deepEqual(groups.map((g) => g.title), ['Big · I', 'Big · II', 'Big · III']);
});

test('plan: every hangable artwork is placed exactly once, inside its room, on a wall', () => {
  const works = [...many(9, 'Coast'), ...many(4, 'Winter'), art('noimage', { imageUrl: null })];
  const plan = planGallery(works, { artistName: 'Ilse' });
  assert.equal(plan.artworks.length, 13);
  assert.equal(plan.unhung.length, 1);
  assert.equal(new Set(plan.artworks.map((a) => a.artwork.id)).size, 13);
  for (const piece of plan.artworks) {
    const region = plan.regions[piece.regionIndex];
    assert.equal(region.kind, 'gallery');
    const [x, y, z] = piece.position;
    assert.ok(z - piece.longM / 2 >= region.minZ + 1 && z + piece.longM / 2 <= region.maxZ - 1, 'clear of the doorways');
    assert.ok(Math.abs(Math.abs(x) - region.maxX) < 0.1);
    assert.ok(y > 1 && y < 2);
  }
});

test('plan: works on the same wall never overlap', () => {
  const plan = planGallery(many(8, 'Coast').map((a, i) => ({ ...a, dimensions: `${40 + i * 15} x 60 cm` })), { artistName: 'x' });
  for (const wall of ['left', 'right'] as const) {
    const items = plan.artworks.filter((a) => a.wall === wall).sort((a, b) => b.position[2] - a.position[2]);
    for (let i = 1; i < items.length; i += 1) {
      const gap = items[i - 1].position[2] - items[i - 1].longM / 2 - (items[i].position[2] + items[i].longM / 2);
      assert.ok(gap >= 1.2, `gap ${gap}`);
    }
  }
});

test('plan: regions form one connected chain and stops are ordered intro-then-works', () => {
  const plan = planGallery([...many(5, 'A'), ...many(5, 'B')], { artistName: 'x' });
  assert.deepEqual(plan.regions.map((r) => r.kind), ['foyer', 'corridor', 'gallery', 'corridor', 'gallery']);
  for (let i = 1; i < plan.regions.length; i += 1) assert.equal(plan.regions[i].maxZ, plan.regions[i - 1].minZ);
  assert.equal(plan.regions[0].joinMinZ, true);
  assert.equal(plan.regions.at(-1)!.joinMinZ, false);
  assert.equal(plan.stops[0].kind, 'intro');
  assert.equal(plan.stops.filter((s) => s.kind === 'intro').length, 3);
  assert.equal(plan.stops.filter((s) => s.kind === 'artwork').length, 10);
  for (const stop of plan.stops) assert.ok(isWalkable(plan, stop.position[0], stop.position[2]), `stop ${stop.index} is reachable`);
});

test('plan: an empty archive still gives a foyer and a safe tour', () => {
  const plan = planGallery([], { artistName: 'x' });
  assert.equal(plan.regions.length, 1);
  assert.equal(plan.regions[0].joinMinZ, false);
  assert.equal(plan.stops.length, 1);
});

test('collision: walls block, doorways pass, movement slides along walls', () => {
  const plan = planGallery(many(5, 'A'), { artistName: 'x' });
  const foyer = plan.regions[0];
  const wallX = foyer.maxX;
  // into the side wall: stopped at the wall, but z movement is kept (sliding)
  const slide = constrainMove(plan, { x: wallX - 0.4, z: -3 }, { x: wallX + 1, z: -4 });
  assert.equal(slide.x, wallX - 0.4);
  assert.equal(slide.z, -4);
  assert.equal(slide.blockedX, true);
  // through the doorway on the centre line
  const door = foyer.minZ;
  assert.ok(isWalkable(plan, 0, door + 0.2));
  assert.ok(isWalkable(plan, 0, door - 0.2));
  // beside the doorway there is wall
  assert.equal(isWalkable(plan, 2.5, door - 0.2), false);
  // out of the building entirely
  assert.equal(isWalkable(plan, 0, foyer.maxZ + 1), false);
  const end = plan.regions.at(-1)!;
  assert.equal(isWalkable(plan, 0, end.minZ - 1), false);
  assert.equal(regionIndexAt(plan, foyer.maxZ - 1), 0);
  assert.equal(regionIndexAt(plan, end.minZ + 1), plan.regions.length - 1);
});

test('routes between any two stops stay inside the building the whole way', () => {
  const plan = planGallery([...many(6, 'A'), ...many(6, 'B'), ...many(4, 'C')], { artistName: 'x' });
  for (const from of plan.stops) {
    for (const to of plan.stops) {
      const route = buildRoute(plan, { x: from.position[0], z: from.position[2], regionIndex: from.regionIndex }, to);
      for (let s = 0; s <= route.length; s += 0.25) {
        const p = sampleRoute(route, s);
        assert.ok(isWalkable(plan, p.x, p.z, 0.3), `route ${from.index}→${to.index} leaves the building at s=${s} (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      }
      const end = sampleRoute(route, route.length);
      assert.ok(Math.hypot(end.x - to.position[0], end.z - to.position[2]) < 1e-6);
    }
  }
});

test('navigation: guided move arrives exactly, eases in and out, and reports arrival once', () => {
  const plan = planGallery([...many(5, 'A'), ...many(5, 'B')], { artistName: 'x' });
  const nav = new NavController(plan);
  const arrived: number[] = [];
  nav.onArrive = (i) => arrived.push(i);
  nav.goTo(7);
  assert.equal(nav.moving, true);
  const speeds: number[] = [];
  let last = { ...nav.pose };
  for (let i = 0; i < 2000 && nav.moving; i += 1) {
    nav.update(1 / 60);
    speeds.push(Math.hypot(nav.pose.x - last.x, nav.pose.z - last.z) * 60);
    last = { ...nav.pose };
  }
  assert.deepEqual(arrived, [7]);
  const stop = plan.stops[7];
  assert.ok(Math.hypot(nav.pose.x - stop.position[0], nav.pose.z - stop.position[2]) < 1e-9);
  const peak = Math.max(...speeds);
  assert.ok(speeds[1] < peak * 0.2, 'accelerates gently');
  assert.ok(speeds[speeds.length - 2] < peak * 0.2, 'decelerates gently');
  assert.ok(peak < 7, `walking pace, got ${peak.toFixed(1)} m/s`);
});

test('navigation: reduced motion jumps straight to the stop', () => {
  const plan = planGallery(many(5, 'A'), { artistName: 'x' });
  const nav = new NavController(plan, true);
  let arrived = -1;
  nav.onArrive = (i) => (arrived = i);
  nav.goTo(3);
  assert.equal(arrived, 3);
  assert.equal(nav.moving, false);
  assert.ok(Math.abs(nav.pose.x - plan.stops[3].position[0]) < 1e-9);
});

test('navigation: free mode accelerates, decelerates, and cannot leave the building', () => {
  const plan = planGallery(many(5, 'A'), { artistName: 'x' });
  const nav = new NavController(plan);
  nav.setMode('free');
  nav.pose.yaw = Math.PI / 2; // face -X, toward the side wall
  for (let i = 0; i < 600; i += 1) nav.update(1 / 60, { forward: 1, strafe: 0, sprint: true });
  assert.ok(isWalkable(plan, nav.pose.x, nav.pose.z), 'stopped by the wall');
  assert.ok(Math.abs(nav.pose.x - (plan.regions[0].minX + 0.35)) < 0.1);
  for (let i = 0; i < 30; i += 1) nav.update(1 / 60);
  assert.ok(!nav.moving, 'friction brings it to rest');
  // drive straight through both doors
  nav.pose.x = 0;
  nav.pose.z = -2;
  nav.pose.yaw = 0;
  for (let i = 0; i < 60 * 12; i += 1) nav.update(1 / 60, { forward: 1, strafe: 0, sprint: true });
  assert.ok(nav.pose.z < plan.regions[1].minZ, 'walked through the foyer and the corridor into the room');
  // returning to the tour leads to a real stop
  nav.setMode('guided');
  for (let i = 0; i < 3000 && nav.moving; i += 1) nav.update(1 / 60);
  assert.equal(nav.mode, 'guided');
});

test('angles take the short way round', () => {
  assert.ok(Math.abs(lerpAngle(3, -3, 0.5) - (3 + (2 * Math.PI - 6) / 2)) < 1e-9);
});

test('texture cache: shares loads, limits concurrency, disposes after release', async () => {
  let loads = 0, running = 0, peak = 0;
  const disposed: string[] = [];
  const cache = new TextureCache<{ id: string; dispose(): void }>(async (url) => {
    loads += 1; running += 1; peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 15));
    running -= 1;
    return { id: url, dispose: () => disposed.push(url) };
  }, { concurrency: 2, graceMs: 30 });

  const a1 = cache.acquire('a');
  const a2 = cache.acquire('a');
  const rest = ['b', 'c', 'd', 'e'].map((u) => cache.acquire(u));
  await Promise.all([a1.promise, ...rest.map((r) => r.promise)]);
  assert.equal(loads, 5, 'one load per url');
  assert.ok(peak <= 2, `concurrency ${peak}`);

  a1.release();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(disposed.length, 0, 'still referenced by a2');
  a2.release();
  a2.release(); // double release is harmless
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(disposed.join(','), 'a');

  const again = cache.acquire('b');
  rest[0].release();
  await new Promise((r) => setTimeout(r, 60));
  assert.ok(!disposed.includes('b'), 're-acquired within the grace period');
  again.release();
  cache.clear();
  assert.equal(cache.size, 0);
  assert.deepEqual([...disposed].sort(), ['a', 'b', 'c', 'd', 'e'], 'clear() frees everything that is left');
});

test('capability: who gets 3D by default', () => {
  const base = { width: 1440, touch: false, reducedMotion: false };
  assert.equal(classify({ ...base, webgl: false }).tier, 'none');
  assert.equal(classify({ ...base, webgl: true, memoryGb: 8, cores: 8 }).tier, 'high');
  assert.equal(classify({ ...base, webgl: true, memoryGb: 2, cores: 8 }).tier, 'low');
  assert.equal(classify({ ...base, webgl: true, saveData: true }).tier, 'low');
  assert.equal(classify({ ...base, webgl: true, touch: true, width: 390, memoryGb: 4, cores: 6 }).tier, 'medium');
  assert.ok(classify({ ...base, webgl: true, memoryGb: 1 }).reason);
  assert.equal(EYE_HEIGHT, 1.65);
});

test('screen-reader descriptions name the room, position and work', async () => {
  const { describeStop, introStopFor } = await import('../../src/lib/gallery/describe.ts');
  const plan = planGallery([...many(4, 'Coast'), ...many(3, 'Winter')], { artistName: 'Ilse' });
  assert.match(describeStop(plan, plan.stops[0]), /Entrance hall/);
  const intro = plan.stops.find((s) => s.kind === 'intro' && s.regionIndex === 2)!;
  assert.match(describeStop(plan, intro), /Room 1 of 2: Coast\. 4 works\./);
  const work = plan.stops.find((s) => s.kind === 'artwork')!;
  assert.match(describeStop(plan, work), /^Coast, work 1 of 4: Work Coast\d, Oil, 2024, 60 × 80 cm\.$/);
  assert.equal(plan.stops[introStopFor(plan, 4)].regionIndex, 4);
});

test('texture URLs are same-origin and only for archive or fixture images', async () => {
  const { textureUrl, snapWidth } = await import('../../src/lib/gallery/texture-url.ts');
  assert.equal(snapWidth(1000), 1080);
  assert.equal(snapWidth(5000), 3840);
  assert.equal(textureUrl('/dev-fixtures/work-01.jpg', 1080), '/dev-fixtures/work-01.jpg');
  assert.equal(textureUrl('https://evil.example/x.jpg', 1080), null);
  assert.equal(textureUrl('https://images.unsplash.com/photo.jpg', 1080), null);
});

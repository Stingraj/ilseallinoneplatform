import type { PublicArtwork } from '@/lib/website/types';
import { parseDimensions } from './dimensions.ts';
import { THEMES, THEME_ORDER, type RoomTheme } from './themes.ts';

export type Vec3 = [number, number, number];

export const EYE_HEIGHT = 1.65;
export const HANG_HEIGHT = 1.55;
export const WALL_THICKNESS = 0.3;
export const DOOR_WIDTH = 3;
export const DOOR_HEIGHT = 3.3;
const FOYER_LENGTH = 11;
const FOYER_WIDTH = 9;
const CORRIDOR_LENGTH = 6;
const CORRIDOR_HEIGHT = 3.5;
const END_MARGIN = 2.8;
const GAP = 1.7;
const MIN_ROOM_LENGTH = 13;

export interface Region {
  index: number;
  kind: 'foyer' | 'gallery' | 'corridor';
  id: string;
  title: string;
  subtitle: string;
  mood: string;
  theme: RoomTheme['id'];
  /** The chain runs toward -Z. maxZ is the near (entry) edge, minZ the far edge. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  /** True when the far / near edge opens into the neighbouring region through a doorway. */
  joinMinZ: boolean;
  joinMaxZ: boolean;
  /** 1-based among the exhibition rooms; null for the foyer and corridors. */
  roomNumber: number | null;
  artworkIndexes: number[];
}

export interface PlacedArtwork {
  index: number;
  regionIndex: number;
  wall: 'left' | 'right';
  /** Centre of the artwork on the wall surface. */
  position: Vec3;
  rotationY: number;
  longM: number;
  shortM: number;
  sizeKnown: boolean;
  viewDistance: number;
  artwork: PublicArtwork;
}

export interface Stop {
  index: number;
  kind: 'intro' | 'artwork';
  regionIndex: number;
  position: Vec3;
  lookAt: Vec3;
  artworkIndex: number | null;
}

export interface GalleryPlan {
  artistName: string;
  regions: Region[];
  artworks: PlacedArtwork[];
  stops: Stop[];
  /** Works that have no photograph and therefore cannot be hung. */
  unhung: PublicArtwork[];
  roomCount: number;
}

export interface PlanOptions {
  artistName: string;
  maxPerRoom?: number;
  minGroup?: number;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

interface Group {
  title: string;
  items: PublicArtwork[];
}

/** Groups by the archive's collection (or series). Small groups share a "Further Works" room. */
export function groupArtworks(artworks: PublicArtwork[], maxPerRoom: number, minGroup: number): Group[] {
  const named = new Map<string, Group>();
  const loose: PublicArtwork[] = [];
  for (const artwork of artworks) {
    const name = (artwork.collection ?? artwork.series)?.trim();
    if (!name) {
      loose.push(artwork);
      continue;
    }
    const key = name.toLowerCase();
    const group = named.get(key) ?? { title: name, items: [] };
    group.items.push(artwork);
    named.set(key, group);
  }

  const groups: Group[] = [];
  const pool: PublicArtwork[] = [...loose];
  for (const group of named.values()) {
    if (group.items.length >= minGroup) groups.push(group);
    else pool.push(...group.items);
  }
  if (pool.length) groups.push({ title: groups.length ? 'Further Works' : 'Selected Works', items: pool });

  // Split big groups into evenly sized rooms.
  return groups.flatMap((group) => {
    if (group.items.length <= maxPerRoom) return [group];
    const parts = Math.ceil(group.items.length / maxPerRoom);
    const size = Math.ceil(group.items.length / parts);
    return Array.from({ length: parts }, (_, part) => ({
      title: `${group.title} · ${ROMAN[part] ?? part + 1}`,
      items: group.items.slice(part * size, part * size + size),
    }));
  });
}

function roomSubtitle(count: number) {
  return `${count} ${count === 1 ? 'work' : 'works'}`;
}

/**
 * Builds the whole museum from archive data: rooms (one per collection), their architecture, where every artwork
 * hangs, and the ordered camera stops. Pure and deterministic, so the server and the tests see the same result.
 */
export function planGallery(artworks: PublicArtwork[], options: PlanOptions): GalleryPlan {
  const maxPerRoom = options.maxPerRoom ?? 8;
  const minGroup = options.minGroup ?? 3;
  const hangable = artworks.filter((a) => a.imageUrl);
  const unhung = artworks.filter((a) => !a.imageUrl);
  const groups = groupArtworks(hangable, maxPerRoom, minGroup);

  const regions: Region[] = [];
  const placed: PlacedArtwork[] = [];
  let cursor = 0;

  const push = (region: Omit<Region, 'index' | 'maxZ' | 'minZ'> & { length: number }) => {
    const { length, ...rest } = region;
    const entry: Region = { ...rest, index: regions.length, maxZ: cursor, minZ: cursor - length };
    cursor -= length;
    regions.push(entry);
    return entry;
  };

  const foyerTheme = THEMES.limestone;
  push({
    kind: 'foyer', id: 'foyer', title: options.artistName, subtitle: 'Gallery Walk', mood: foyerTheme.mood, theme: 'limestone',
    minX: -FOYER_WIDTH / 2, maxX: FOYER_WIDTH / 2, length: FOYER_LENGTH, height: foyerTheme.height + 0.4,
    joinMinZ: groups.length > 0, joinMaxZ: false, roomNumber: null, artworkIndexes: [],
  });

  groups.forEach((group, groupIndex) => {
    const themeId = THEME_ORDER[groupIndex % THEME_ORDER.length];
    const theme = THEMES[themeId];
    const half = theme.width / 2;

    // Corridor leading in.
    push({
      kind: 'corridor', id: `corridor-${groupIndex}`, title: 'Passage', subtitle: '', mood: '', theme: themeId,
      minX: -DOOR_WIDTH / 2, maxX: DOOR_WIDTH / 2, length: CORRIDOR_LENGTH, height: CORRIDOR_HEIGHT,
      joinMinZ: true, joinMaxZ: true, roomNumber: null, artworkIndexes: [],
    });

    // Hang the works: each goes on the wall with less hung so far, in archive order.
    const sizes = group.items.map((artwork) => ({ artwork, size: parseDimensions(artwork.dimensions) }));
    const walls = { left: [] as typeof sizes, right: [] as typeof sizes };
    const totals = { left: 0, right: 0 };
    for (const item of sizes) {
      const wall = totals.left <= totals.right ? 'left' : 'right';
      walls[wall].push(item);
      totals[wall] += item.size.longCm / 100 + GAP;
    }
    const length = Math.max(MIN_ROOM_LENGTH, END_MARGIN * 2 + Math.max(totals.left, totals.right));
    const isLast = groupIndex === groups.length - 1;
    const region = push({
      kind: 'gallery', id: `room-${groupIndex}`, title: group.title, subtitle: roomSubtitle(group.items.length), mood: theme.mood,
      theme: themeId, minX: -half, maxX: half, length, height: theme.height,
      joinMinZ: false, joinMaxZ: true, roomNumber: groupIndex + 1, artworkIndexes: [],
    });
    // The next corridor (if any) opens the far wall.
    if (!isLast) region.joinMinZ = true;

    for (const wall of ['left', 'right'] as const) {
      let z = region.maxZ - END_MARGIN;
      for (const { artwork, size } of walls[wall]) {
        const longM = size.longCm / 100;
        const shortM = size.shortCm / 100;
        const center = z - longM / 2;
        const wallX = wall === 'left' ? region.minX : region.maxX;
        const index = placed.length;
        const viewDistance = Math.min(Math.max(longM * 1.35 + 0.8, 2.1), half - 0.8);
        placed.push({
          index, regionIndex: region.index, wall,
          position: [wallX + (wall === 'left' ? 0.05 : -0.05), HANG_HEIGHT, center],
          rotationY: wall === 'left' ? Math.PI / 2 : -Math.PI / 2,
          longM, shortM, sizeKnown: size.known, viewDistance, artwork,
        });
        region.artworkIndexes.push(index);
        z -= longM + GAP;
      }
    }
    // Present the works in walking order along the room.
    region.artworkIndexes.sort((a, b) => placed[b].position[2] - placed[a].position[2]);
  });

  // Corridors are lit and coloured like the room they lead to; the last region never joins forward.
  const last = regions[regions.length - 1];
  last.joinMinZ = false;

  const stops: Stop[] = [];
  for (const region of regions) {
    if (region.kind === 'corridor') continue;
    const farZ = region.kind === 'foyer' ? region.minZ : region.maxZ - Math.min(region.maxZ - region.minZ, 18) * 0.7;
    stops.push({
      index: stops.length, kind: 'intro', regionIndex: region.index, artworkIndex: null,
      position: [0, EYE_HEIGHT, region.maxZ - (region.kind === 'foyer' ? 1.4 : 1.8)],
      lookAt: [0, region.kind === 'foyer' ? 2.1 : 1.9, farZ],
    });
    for (const artworkIndex of region.artworkIndexes) {
      const piece = placed[artworkIndex];
      const side = piece.wall === 'left' ? 1 : -1;
      stops.push({
        index: stops.length, kind: 'artwork', regionIndex: region.index, artworkIndex,
        position: [piece.position[0] + side * piece.viewDistance, EYE_HEIGHT, piece.position[2]],
        lookAt: [piece.position[0], HANG_HEIGHT, piece.position[2]],
      });
    }
  }

  return {
    artistName: options.artistName, regions, artworks: placed, stops, unhung,
    roomCount: regions.filter((region) => region.kind === 'gallery').length,
  };
}

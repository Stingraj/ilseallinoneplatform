import type { GalleryPlan, Stop } from './plan.ts';

/** Spoken description of a stop, for the screen-reader live region. */
export function describeStop(plan: GalleryPlan, stop: Stop): string {
  const region = plan.regions[stop.regionIndex];
  if (stop.kind === 'intro') {
    if (region.kind === 'foyer') return `${plan.artistName}, Gallery Walk. Entrance hall. Press the right arrow to begin the tour.`;
    return `Room ${region.roomNumber} of ${plan.roomCount}: ${region.title}. ${region.subtitle}. ${region.mood}`;
  }
  const piece = plan.artworks[stop.artworkIndex ?? 0];
  const position = region.artworkIndexes.indexOf(piece.index) + 1;
  const details = [piece.artwork.medium, piece.artwork.year, piece.artwork.dimensions].filter(Boolean).join(', ');
  return `${region.title}, work ${position} of ${region.artworkIndexes.length}: ${piece.artwork.title}${details ? `, ${details}` : ''}.`;
}

/** The stop that introduces a region, or the nearest one after it. */
export function introStopFor(plan: GalleryPlan, regionIndex: number): number {
  return plan.stops.find((stop) => stop.kind === 'intro' && stop.regionIndex >= regionIndex)?.index ?? 0;
}

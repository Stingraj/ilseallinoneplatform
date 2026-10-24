import type { GalleryPlan, Region } from './plan.ts';

export const BODY_RADIUS = 0.35;

function insideRegion(region: Region, x: number, z: number, radius: number): boolean {
  const minZ = region.minZ + (region.joinMinZ ? 0 : radius);
  const maxZ = region.maxZ - (region.joinMaxZ ? 0 : radius);
  return x >= region.minX + radius && x <= region.maxX - radius && z >= minZ && z <= maxZ;
}

export function isWalkable(plan: GalleryPlan, x: number, z: number, radius = BODY_RADIUS): boolean {
  return plan.regions.some((region) => insideRegion(region, x, z, radius));
}

/** Which region (room, corridor or foyer) a point belongs to; clamps to the ends of the chain. */
export function regionIndexAt(plan: GalleryPlan, z: number): number {
  const found = plan.regions.find((region) => z <= region.maxZ && z >= region.minZ);
  if (found) return found.index;
  return z > plan.regions[0].maxZ ? 0 : plan.regions.length - 1;
}

/**
 * Moves from `from` toward `to`, sliding along walls instead of stopping dead. Walls, door jambs and the ends of
 * the building are all just the edges of the walkable regions.
 */
export function constrainMove(
  plan: GalleryPlan,
  from: { x: number; z: number },
  to: { x: number; z: number },
  radius = BODY_RADIUS
): { x: number; z: number; blockedX: boolean; blockedZ: boolean } {
  if (isWalkable(plan, to.x, to.z, radius)) return { ...to, blockedX: false, blockedZ: false };
  if (isWalkable(plan, to.x, from.z, radius)) return { x: to.x, z: from.z, blockedX: false, blockedZ: true };
  if (isWalkable(plan, from.x, to.z, radius)) return { x: from.x, z: to.z, blockedX: true, blockedZ: false };
  return { x: from.x, z: from.z, blockedX: true, blockedZ: true };
}

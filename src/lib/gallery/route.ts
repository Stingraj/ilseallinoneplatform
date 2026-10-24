import { EYE_HEIGHT, type GalleryPlan, type Stop, type Vec3 } from './plan.ts';

export interface Route {
  points: Vec3[];
  cumulative: number[];
  length: number;
}

const DOOR_LEAD = 1.5;

function dedupe(points: Vec3[]): Vec3[] {
  return points.filter((point, i) => i === 0 || Math.hypot(point[0] - points[i - 1][0], point[2] - points[i - 1][2]) > 0.05);
}

/** Corner-cutting subdivision: rounds every turn while keeping both end points. */
export function smoothPath(points: Vec3[], iterations = 2): Vec3[] {
  let current = points;
  for (let n = 0; n < iterations; n += 1) {
    if (current.length < 3) return current;
    const next: Vec3[] = [current[0]];
    for (let i = 0; i < current.length - 1; i += 1) {
      const a = current[i];
      const b = current[i + 1];
      const q: Vec3 = [0.75 * a[0] + 0.25 * b[0], EYE_HEIGHT, 0.75 * a[2] + 0.25 * b[2]];
      const r: Vec3 = [0.25 * a[0] + 0.75 * b[0], EYE_HEIGHT, 0.25 * a[2] + 0.75 * b[2]];
      if (i > 0) next.push(q);
      if (i < current.length - 2) next.push(r);
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

function toRoute(points: Vec3[]): Route {
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
}

/**
 * Walking route from a point to a stop. Rooms form a chain, so a journey between regions passes through each
 * doorway's centre line (x = 0), approached and left straight, never cutting a corner through a wall.
 */
export function buildRoute(plan: GalleryPlan, from: { x: number; z: number; regionIndex: number }, stop: Stop): Route {
  const raw: Vec3[] = [[from.x, EYE_HEIGHT, from.z]];
  const target = stop.regionIndex;

  if (target > from.regionIndex) {
    for (let k = from.regionIndex; k < target; k += 1) {
      const edge = plan.regions[k].minZ;
      raw.push([0, EYE_HEIGHT, edge + DOOR_LEAD], [0, EYE_HEIGHT, edge], [0, EYE_HEIGHT, edge - DOOR_LEAD]);
    }
  } else if (target < from.regionIndex) {
    for (let k = from.regionIndex; k > target; k -= 1) {
      const edge = plan.regions[k].maxZ;
      raw.push([0, EYE_HEIGHT, edge - DOOR_LEAD], [0, EYE_HEIGHT, edge], [0, EYE_HEIGHT, edge + DOOR_LEAD]);
    }
  }
  raw.push([stop.position[0], EYE_HEIGHT, stop.position[2]]);
  return toRoute(smoothPath(dedupe(raw)));
}

export function sampleRoute(route: Route, distance: number): { x: number; z: number; dx: number; dz: number } {
  const s = Math.min(Math.max(distance, 0), route.length);
  let i = 1;
  while (i < route.cumulative.length - 1 && route.cumulative[i] < s) i += 1;
  const a = route.points[i - 1] ?? route.points[0];
  const b = route.points[i] ?? route.points[0];
  const span = route.cumulative[i] - route.cumulative[i - 1] || 1;
  const t = route.points.length === 1 ? 0 : (s - route.cumulative[i - 1]) / span;
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const norm = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * t, z: a[2] + dz * t, dx: dx / norm, dz: dz / norm };
}

/** Camera heading (rotation about Y) for a direction; 0 faces -Z. */
export function yawOf(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz);
}

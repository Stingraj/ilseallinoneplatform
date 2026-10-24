import { EYE_HEIGHT, type GalleryPlan, type Stop } from './plan.ts';
import { buildRoute, sampleRoute, yawOf, type Route } from './route.ts';
import { constrainMove, regionIndexAt } from './walkable.ts';

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export type NavMode = 'guided' | 'free';

export interface FreeInput {
  forward: number;
  strafe: number;
  sprint: boolean;
}

const TAU = Math.PI * 2;
const WALK_SPEED = 1.9;
const SPRINT_SPEED = 3.6;
const MAX_PITCH = 0.9;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function lerpAngle(a: number, b: number, t: number): number {
  let delta = (b - a) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return a + delta * t;
}

export function stopHeading(stop: Stop): { yaw: number; pitch: number } {
  const dx = stop.lookAt[0] - stop.position[0];
  const dz = stop.lookAt[2] - stop.position[2];
  const dy = stop.lookAt[1] - stop.position[1];
  return { yaw: yawOf(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

interface Transition {
  route: Route;
  elapsed: number;
  duration: number;
  startYaw: number;
  startPitch: number;
  endYaw: number;
  endPitch: number;
  stopIndex: number;
}

/**
 * The walkthrough's brain, independent of rendering so it can be tested: guided moves between curated stops with
 * eased acceleration, and free exploration with momentum and wall collision.
 */
export class NavController {
  pose: Pose;
  mode: NavMode = 'guided';
  stopIndex = 0;
  moving = false;
  onArrive?: (stopIndex: number) => void;
  private transition: Transition | null = null;
  private vx = 0;
  private vz = 0;
  private plan: GalleryPlan;
  private reducedMotion: boolean;

  constructor(plan: GalleryPlan, reducedMotion = false) {
    this.plan = plan;
    this.reducedMotion = reducedMotion;
    const first = plan.stops[0];
    const heading = first ? stopHeading(first) : { yaw: 0, pitch: 0 };
    this.pose = { x: first?.position[0] ?? 0, y: EYE_HEIGHT, z: first?.position[2] ?? 0, ...heading };
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  goTo(stopIndex: number) {
    const stop = this.plan.stops[stopIndex];
    if (!stop) return;
    this.mode = 'guided';
    this.vx = 0;
    this.vz = 0;
    const end = stopHeading(stop);

    if (this.reducedMotion) {
      this.pose = { x: stop.position[0], y: EYE_HEIGHT, z: stop.position[2], ...end };
      this.stopIndex = stopIndex;
      this.transition = null;
      this.moving = false;
      this.onArrive?.(stopIndex);
      return;
    }

    const route = buildRoute(this.plan, { x: this.pose.x, z: this.pose.z, regionIndex: regionIndexAt(this.plan, this.pose.z) }, stop);
    this.stopIndex = stopIndex;
    this.transition = {
      route, elapsed: 0, stopIndex,
      duration: clamp(route.length / 4.2 + 1.3, 1.4, 10),
      startYaw: this.pose.yaw, startPitch: this.pose.pitch, endYaw: end.yaw, endPitch: end.pitch,
    };
    this.moving = true;
  }

  setMode(mode: NavMode) {
    if (mode === this.mode) return;
    if (mode === 'free') {
      this.transition = null;
      this.moving = false;
      this.mode = 'free';
      return;
    }
    this.goTo(this.nearestStop());
  }

  /** Closest stop to the current position, used when returning from free exploration to the guided tour. */
  nearestStop(): number {
    let best = 0;
    let bestDistance = Infinity;
    for (const stop of this.plan.stops) {
      const d = Math.hypot(stop.position[0] - this.pose.x, stop.position[2] - this.pose.z);
      if (d < bestDistance) {
        bestDistance = d;
        best = stop.index;
      }
    }
    return best;
  }

  look(dYaw: number, dPitch: number) {
    this.pose.yaw += dYaw;
    this.pose.pitch = clamp(this.pose.pitch + dPitch, -MAX_PITCH, MAX_PITCH);
  }

  update(dt: number, input: FreeInput = { forward: 0, strafe: 0, sprint: false }): Pose {
    const step = Math.min(dt, 0.1);
    if (this.mode === 'guided' && this.transition) {
      const tr = this.transition;
      tr.elapsed += step;
      const p = clamp(tr.elapsed / tr.duration, 0, 1);
      // Smoothstep: zero speed at both ends and a gentle peak of 1.5x the average, so long walks never feel like flying.
      const s = smoothstep(p) * tr.route.length;
      const at = sampleRoute(tr.route, s);

      let yaw: number;
      if (tr.route.length < 2.5) {
        yaw = lerpAngle(tr.startYaw, tr.endYaw, smoothstep(p));
      } else {
        const travel = yawOf(at.dx, at.dz);
        if (p < 0.18) yaw = lerpAngle(tr.startYaw, travel, smoothstep(p / 0.18));
        else if (p > 0.68) yaw = lerpAngle(travel, tr.endYaw, smoothstep((p - 0.68) / 0.32));
        else yaw = travel;
      }
      this.pose = { x: at.x, y: EYE_HEIGHT, z: at.z, yaw, pitch: tr.startPitch + (tr.endPitch - tr.startPitch) * smoothstep(p) };

      if (p >= 1) {
        const arrived = tr.stopIndex;
        this.transition = null;
        this.moving = false;
        const stop = this.plan.stops[arrived];
        this.pose = { x: stop.position[0], y: EYE_HEIGHT, z: stop.position[2], ...stopHeading(stop) };
        this.onArrive?.(arrived);
      }
    } else if (this.mode === 'free') {
      const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
      const sin = Math.sin(this.pose.yaw);
      const cos = Math.cos(this.pose.yaw);
      const wishX = (-sin * input.forward + cos * input.strafe) * speed;
      const wishZ = (-cos * input.forward - sin * input.strafe) * speed;
      const blend = 1 - Math.exp(-step * 7);
      this.vx += (wishX - this.vx) * blend;
      this.vz += (wishZ - this.vz) * blend;
      const moved = constrainMove(this.plan, this.pose, { x: this.pose.x + this.vx * step, z: this.pose.z + this.vz * step });
      if (moved.blockedX) this.vx = 0;
      if (moved.blockedZ) this.vz = 0;
      this.pose.x = moved.x;
      this.pose.z = moved.z;
      this.pose.y = EYE_HEIGHT;
      this.moving = Math.hypot(this.vx, this.vz) > 0.05;
    }
    return this.pose;
  }
}

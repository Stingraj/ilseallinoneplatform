'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HANG_HEIGHT, type GalleryPlan } from '@/lib/gallery/plan';
import { THEMES } from '@/lib/gallery/themes';
import { regionIndexAt } from '@/lib/gallery/walkable';

/**
 * Reflections: a procedural studio environment gives the polished floors, brass and frames something to reflect.
 */
export function Environment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      target.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

/**
 * Atmosphere: ambient light, fog and background drift toward the colours of the room the visitor is in, so crossing
 * a doorway changes the mood gradually rather than snapping.
 */
export function Atmosphere({ plan, getZ }: { plan: GalleryPlan; getZ: () => number }) {
  const { scene } = useThree();
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fog = useMemo(() => new THREE.Fog('#d9d2c4', 8, 38), []);
  const background = useMemo(() => new THREE.Color('#d9d2c4'), []);

  useEffect(() => {
    scene.fog = fog;
    scene.background = background;
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene, fog, background]);

  useFrame((_, dt) => {
    const region = plan.regions[regionIndexAt(plan, getZ())];
    const theme = THEMES[region.theme];
    const k = 1 - Math.exp(-dt * 2.2);
    tmpA.set(theme.fog);
    fog.color.lerp(tmpA, k);
    background.copy(fog.color);
    fog.far += ((region.kind === 'corridor' ? 26 : 40) - fog.far) * k;
    const light = hemi.current;
    if (light) {
      tmpB.set(theme.ambient);
      light.color.lerp(tmpB, k);
      light.groundColor.lerp(tmpA.set(theme.floorColor), k);
      light.intensity += (theme.ambientIntensity * (region.kind === 'corridor' ? 0.7 : 1) - light.intensity) * k;
    }
  });

  return <hemisphereLight ref={hemi} args={['#fff3df', '#8a7a66', 0.9]} />;
}

export interface SpotTarget {
  id: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  angle: number;
  warm: string;
  scale: number;
  distance: number;
}

/**
 * Museum lighting: a fixed pool of spotlights is moved onto whichever works are nearest. The number of lights never
 * changes, so there is no shader recompilation hitch when walking between rooms, and a work fades up as the pool
 * reaches it instead of popping on.
 */
export function SpotPool({
  targets,
  size,
  shadowSlots,
  getPosition,
}: {
  targets: SpotTarget[];
  size: number;
  shadowSlots: number;
  getPosition: () => THREE.Vector3;
}) {
  const lights = useRef<(THREE.SpotLight | null)[]>([]);
  const aims = useRef<(THREE.Object3D | null)[]>([]);
  const slots = useRef(Array.from({ length: size }, () => ({ id: -1, level: 0, scale: 1 })));
  const scratch = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    lights.current.forEach((light, i) => {
      const aim = aims.current[i];
      if (light && aim) light.target = aim;
    });
  }, []);

  useFrame((_, dt) => {
    const camera = getPosition();
    const byId = new Map(targets.map((t) => [t.id, t]));
    const nearest = [...targets]
      .map((t) => ({ t, d: camera.distanceTo(scratch.copy(t.lookAt)) }))
      .filter((x) => x.d < 16)
      .sort((a, b) => a.d - b.d)
      .slice(0, size)
      .map((x) => x.t.id);

    const wanted = new Set(nearest);
    // Free slots whose work is no longer wanted once they have faded out.
    for (const slot of slots.current) if (slot.id >= 0 && !wanted.has(slot.id) && slot.level < 0.02) slot.id = -1;
    // Put newly wanted works onto empty slots.
    for (const id of nearest) {
      if (slots.current.some((s) => s.id === id)) continue;
      const free = slots.current.find((s) => s.id === -1);
      if (!free) break;
      free.id = id;
      free.level = 0;
      free.scale = byId.get(id)!.scale;
      const index = slots.current.indexOf(free);
      const target = byId.get(id)!;
      const light = lights.current[index];
      const aim = aims.current[index];
      if (light && aim) {
        light.position.copy(target.position);
        aim.position.copy(target.lookAt);
        light.angle = target.angle;
        light.distance = target.distance;
        light.color.set(target.warm);
        aim.updateMatrixWorld();
      }
    }

    const k = 1 - Math.exp(-dt * 4.5);
    slots.current.forEach((slot, i) => {
      const light = lights.current[i];
      if (!light) return;
      const goal = slot.id >= 0 && wanted.has(slot.id) ? 1 : 0;
      slot.level += (goal - slot.level) * k;
      light.intensity = slot.level * 9 * slot.scale;
    });
  });

  return (
    <>
      {Array.from({ length: size }, (_, i) => (
        <group key={i}>
          <spotLight
            ref={(node) => {
              lights.current[i] = node;
            }}
            intensity={0}
            penumbra={0.75}
            decay={1.6}
            castShadow={i < shadowSlots}
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
            shadow-radius={5}
          />
          <object3D
            ref={(node) => {
              aims.current[i] = node;
            }}
          />
        </group>
      ))}
    </>
  );
}

/** Where the spot for an artwork hangs: out from the wall, up near the ceiling, aimed at the picture. */
export function spotFor(piece: { index: number; position: [number, number, number]; rotationY: number; longM: number }, ceiling: number, warm: string, scale = 1): SpotTarget {
  const outward = new THREE.Vector3(Math.sin(piece.rotationY), 0, Math.cos(piece.rotationY));
  const lookAt = new THREE.Vector3(piece.position[0], HANG_HEIGHT, piece.position[2]);
  const position = lookAt.clone().addScaledVector(outward, 1.9);
  position.y = Math.min(ceiling - 0.25, 3.6);
  const reach = position.distanceTo(lookAt);
  const angle = Math.min(0.9, Math.atan((piece.longM / 2 + 0.7) / reach));
  return { id: piece.index, position, lookAt, angle, warm, scale, distance: 14 };
}

/** Floating dust that catches the light, only drawn when motion is welcome. */
export function Dust({ plan, getZ, count }: { plan: GalleryPlan; getZ: () => number; count: number }) {
  const points = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) seeds[i] = (((i * 9301 + 49297) % 233280) / 233280) * 100;
    return { positions, seeds };
  }, [count]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    return g;
  }, [data]);
  const lastRegion = useRef(-1);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // A soft round sprite, so specks read as dust in the light rather than as square pixels.
  const sprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame(({ clock }) => {
    const region = plan.regions[regionIndexAt(plan, getZ())];
    const t = clock.elapsedTime;
    if (lastRegion.current !== region.index) {
      lastRegion.current = region.index;
      for (let i = 0; i < count; i += 1) {
        data.positions[i * 3] = region.minX + 0.5 + Math.random() * (region.maxX - region.minX - 1);
        data.positions[i * 3 + 1] = 0.4 + Math.random() * (region.height - 0.8);
        data.positions[i * 3 + 2] = region.minZ + 0.5 + Math.random() * (region.maxZ - region.minZ - 1);
      }
    }
    for (let i = 0; i < count; i += 1) {
      const s = data.seeds[i];
      data.positions[i * 3] += Math.sin(t * 0.15 + s) * 0.0009;
      data.positions[i * 3 + 1] += Math.sin(t * 0.1 + s * 1.7) * 0.0007;
      data.positions[i * 3 + 2] += Math.cos(t * 0.12 + s) * 0.0009;
    }
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    void points;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.05} map={sprite} alphaMap={sprite} color="#fff4dc" transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} />
    </points>
  );
}

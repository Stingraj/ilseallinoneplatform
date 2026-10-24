'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GalleryPlan } from '@/lib/gallery/plan';
import { THEMES } from '@/lib/gallery/themes';
import type { NavController } from '@/lib/gallery/navigation';
import { regionIndexAt } from '@/lib/gallery/walkable';
import type { Tier } from '@/lib/gallery/tier';
import { Artwork } from './Artwork';
import { Atmosphere, Dust, Environment, SpotPool, spotFor } from './Lighting';
import { MaterialLibrary } from './materials';
import { Room } from './Room';
import { createArtworkTextureCache } from './textures';

export interface InputState {
  forward: number;
  strafe: number;
  turn: number;
  sprint: boolean;
}

export interface SceneProps {
  plan: GalleryPlan;
  nav: NavController;
  input: MutableRefObject<InputState>;
  tier: Exclude<Tier, 'none' | 'low'> | 'low';
  reducedMotion: boolean;
  focusArtwork: number | null;
  onSelectArtwork: (index: number) => void;
  onReady: () => void;
  onRegionChange?: (regionIndex: number) => void;
}

function CameraRig({ nav, input, reducedMotion, onReady }: Pick<SceneProps, 'nav' | 'input' | 'reducedMotion' | 'onReady'>) {
  const { camera, size } = useThree();
  const frames = useRef(0);

  useFrame(({ clock }, dt) => {
    if (nav.mode === 'free' && input.current.turn) nav.look(input.current.turn * dt * 1.8, 0);
    const pose = nav.update(dt, { forward: input.current.forward, strafe: input.current.strafe, sprint: input.current.sprint });
    const t = clock.elapsedTime;
    const { z, pitch } = pose;
    let { x, y, yaw } = pose;
    if (!reducedMotion) {
      if (nav.moving) y += Math.sin(t * 7.5) * 0.012 * (nav.mode === 'free' ? 1 : 0.6);
      else if (nav.mode === 'guided') {
        // breathing: the picture is never perfectly still
        x += Math.sin(t * 0.45) * 0.012;
        y += Math.sin(t * 0.6) * 0.006;
        yaw += Math.sin(t * 0.3) * 0.0025;
      }
    }
    camera.position.set(x, y, z);
    // On a tall phone screen the information sheet covers the lower half, so look a little lower to lift the picture.
    const portrait = size.width / size.height < 0.8;
    camera.rotation.set(pitch - (portrait && nav.mode === 'guided' ? 0.12 : 0), yaw, 0, 'YXZ');

    const persp = camera as THREE.PerspectiveCamera;
    const fov = size.width / size.height < 0.8 ? 74 : 55;
    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
    frames.current += 1;
    if (frames.current === 4) onReady();
  });
  return null;
}

/** Development-only: publishes renderer statistics on <body data-gallery-stats> so browser tests can read them. */
function DebugProbe() {
  const { gl, camera, scene } = useThree();
  const last = useRef({ t: 0, frames: 0 });
  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    last.current.frames += 1;
    if (now - last.current.t < 0.5) return;
    const fps = last.current.frames / (now - last.current.t);
    last.current = { t: now, frames: 0 };
    const paints: ({ d: number } & Record<string, unknown>)[] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      const src = (m?.map?.image as { src?: string } | undefined)?.src;
      if (m && src && src.includes('dev-fixtures')) {
        paints.push({ d: +(o.getWorldPosition(new THREE.Vector3()).distanceTo(camera.position)).toFixed(1), src: src.slice(-12), opacity: +m.opacity.toFixed(2), color: m.color.getHexString(), emi: m.emissiveIntensity, v: m.map?.version, rough: m.roughness, gpuVer: (gl.properties.get(m.map!) as { __version?: number }).__version, hasTex: !!(gl.properties.get(m.map!) as { __webglTexture?: unknown }).__webglTexture, nat: (m.map?.image as HTMLImageElement | undefined)?.naturalWidth, complete: (m.map?.image as HTMLImageElement | undefined)?.complete, mip: m.map?.generateMipmaps, minF: m.map?.minFilter, cs: m.map?.colorSpace, vis: o.visible, aspect: +(o as THREE.Mesh).scale.x.toFixed(2), wx: +o.getWorldPosition(new THREE.Vector3()).x.toFixed(1), wz: +o.getWorldPosition(new THREE.Vector3()).z.toFixed(1) });
      }
    });
    paints.sort((a, b) => a.d - b.d);
    document.body.dataset.galleryStats = JSON.stringify({ paints: paints.slice(0, 2),
      fps: Math.round(fps), textures: gl.info.memory.textures, geometries: gl.info.memory.geometries,
      programs: gl.info.programs?.length ?? 0, calls: gl.info.render.calls, triangles: gl.info.render.triangles,
      x: +camera.position.x.toFixed(2), z: +camera.position.z.toFixed(2),
    });
  });
  return null;
}

function RegionTracker({ plan, onChange }: { plan: GalleryPlan; onChange: (index: number) => void }) {
  const { camera } = useThree();
  const last = useRef(-1);
  useFrame(() => {
    const index = regionIndexAt(plan, camera.position.z);
    if (index !== last.current) {
      last.current = index;
      onChange(index);
    }
  });
  return null;
}

export default function Scene(props: SceneProps) {
  const { plan, nav, input, tier, reducedMotion, focusArtwork, onSelectArtwork, onReady, onRegionChange } = props;
  const high = tier === 'high';
  const [activeRegion, setActiveRegion] = useState(0);
  const [hovering, setHovering] = useState(false);

  const library = useMemo(() => new MaterialLibrary(high ? 1024 : 512, high ? 8 : 4), [high]);
  useEffect(() => () => library.dispose(), [library]);
  const cache = useMemo(() => createArtworkTextureCache(high ? 8 : 4), [high]);
  useEffect(() => () => cache.clear(), [cache]);

  useEffect(() => {
    document.body.style.cursor = hovering ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovering]);

  const spots = useMemo(
    () =>
      plan.artworks.map((piece) => {
        const region = plan.regions[piece.regionIndex];
        return spotFor(piece, region.height, THEMES[region.theme].spot, THEMES[region.theme].spotScale);
      }),
    [plan]
  );

  const camera = useRef<THREE.Camera | null>(null);
  const position = useMemo(() => new THREE.Vector3(), []);
  const getPosition = () => (camera.current ? position.copy(camera.current.position) : position);
  const getZ = () => camera.current?.position.z ?? 0;

  const visible = plan.regions.filter((region) => Math.abs(region.index - activeRegion) <= 2);

  return (
    <Canvas
      shadows={high ? 'percentage' : false}
      dpr={[1, high ? 1.75 : 1.25]}
      camera={{ fov: 55, near: 0.15, far: 70, position: [0, 1.65, -1.4] }}
      gl={{ antialias: tier !== 'low', powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={(state) => {
        camera.current = state.camera;
        state.gl.toneMappingExposure = 1.05;
      }}
      aria-hidden
    >
      <CameraRig nav={nav} input={input} reducedMotion={reducedMotion} onReady={onReady} />
      <RegionTracker
        plan={plan}
        onChange={(index) => {
          setActiveRegion(index);
          onRegionChange?.(index);
        }}
      />
      {process.env.NODE_ENV === 'development' && <DebugProbe />}
      <Environment intensity={0.32} />
      <Atmosphere plan={plan} getZ={getZ} />
      <SpotPool targets={spots} size={high ? 8 : 6} shadowSlots={high ? 2 : 0} getPosition={getPosition} />
      {!reducedMotion && tier !== 'low' && <Dust plan={plan} getZ={getZ} count={high ? 260 : 120} />}

      {visible.map((region) => (
        <Room key={region.id} plan={plan} region={region} library={library} shadows={high} artistName={plan.artistName} />
      ))}
      {plan.artworks
        .filter((piece) => Math.abs(piece.regionIndex - activeRegion) <= 2)
        .map((piece) => (
          <Artwork
            key={piece.artwork.id}
            piece={piece}
            themeId={plan.regions[piece.regionIndex].theme}
            library={library}
            cache={cache}
            shadows={high}
            load
            active={focusArtwork === piece.index}
            onSelect={onSelectArtwork}
            onHover={setHovering}
          />
        ))}
    </Canvas>
  );
}

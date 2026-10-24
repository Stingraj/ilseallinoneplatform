'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { DOOR_HEIGHT, DOOR_WIDTH, WALL_THICKNESS, type GalleryPlan, type Region } from '@/lib/gallery/plan';
import { THEMES } from '@/lib/gallery/themes';
import type { MaterialLibrary } from './materials';

const T = WALL_THICKNESS;

interface Props {
  plan: GalleryPlan;
  region: Region;
  library: MaterialLibrary;
  shadows: boolean;
  artistName: string;
}

function width(region: Region) {
  return region.maxX - region.minX;
}

/** One end wall is built by whichever of two joined regions is wider, so the shared wall is never doubled. */
function buildsEnd(plan: GalleryPlan, region: Region, end: 'min' | 'max'): boolean {
  const neighbour = plan.regions[region.index + (end === 'min' ? 1 : -1)];
  const joined = end === 'min' ? region.joinMinZ : region.joinMaxZ;
  if (!neighbour || !joined) return true;
  const mine = width(region);
  const theirs = width(neighbour);
  return mine > theirs || (mine === theirs && region.index < neighbour.index);
}

function Box({ position, size, material, shadow }: { position: [number, number, number]; size: [number, number, number]; material: THREE.Material; shadow?: boolean }) {
  return (
    <mesh position={position} material={material} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function EndWall({ z, region, joined, material, trim, accent }: { z: number; region: Region; joined: boolean; material: THREE.Material; trim: THREE.Material; accent: THREE.Material }) {
  const w = width(region) + 2 * T;
  const h = region.height;
  const cx = (region.minX + region.maxX) / 2;
  if (!joined) return <Box position={[cx, h / 2, z]} size={[w, h, T]} material={material} />;

  const side = (w - DOOR_WIDTH) / 2;
  const doorTop = DOOR_HEIGHT;
  return (
    <group>
      <Box position={[cx - DOOR_WIDTH / 2 - side / 2, h / 2, z]} size={[side, h, T]} material={material} />
      <Box position={[cx + DOOR_WIDTH / 2 + side / 2, h / 2, z]} size={[side, h, T]} material={material} />
      <Box position={[cx, doorTop + (h - doorTop) / 2, z]} size={[DOOR_WIDTH, Math.max(0.05, h - doorTop), T]} material={material} />
      {/* architrave */}
      <Box position={[cx - DOOR_WIDTH / 2 - 0.05, doorTop / 2, z]} size={[0.1, doorTop, T + 0.08]} material={trim} />
      <Box position={[cx + DOOR_WIDTH / 2 + 0.05, doorTop / 2, z]} size={[0.1, doorTop, T + 0.08]} material={trim} />
      <Box position={[cx, doorTop + 0.05, z]} size={[DOOR_WIDTH + 0.2, 0.1, T + 0.08]} material={trim} />
      {/* brass threshold */}
      <mesh position={[cx, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} material={accent}>
        <planeGeometry args={[DOOR_WIDTH, 0.12]} />
      </mesh>
    </group>
  );
}

/** Painted name panel for the foyer, drawn once on a canvas in the site's display face. */
function useNameTexture(name: string, enabled: boolean) {
  return useMemo(() => {
    if (!enabled || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'Georgia, serif';
    ctx.fillStyle = '#e9e2d4';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = '#1c1b1a';
    ctx.textAlign = 'center';
    ctx.font = `300 112px ${family}`;
    const words = name.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > 880 && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
    lines.forEach((text, i) => ctx.fillText(text, 512, 400 + (i - (lines.length - 1) / 2) * 130));
    ctx.fillStyle = '#8a857f';
    ctx.font = `500 34px ${family}`;
    ctx.fillText('G A L L E R Y   W A L K', 512, 400 + (lines.length / 2) * 130 + 70);
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(472, 860, 80, 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [name, enabled]);
}

export function Room({ plan, region, library, shadows, artistName }: Props) {
  const theme = THEMES[region.theme];
  const mats = library.forTheme(region.theme);
  const length = region.maxZ - region.minZ;
  const w = width(region);
  const cx = (region.minX + region.maxX) / 2;
  const cz = (region.minZ + region.maxZ) / 2;
  const h = region.height;
  const isCorridor = region.kind === 'corridor';

  // Each room needs its own repeat, so it gets clones that share the generated image.
  const floorMat = useMemo(() => {
    const material = mats.floor.clone();
    const map = mats.floor.map!.clone();
    map.needsUpdate = true;
    map.repeat.set(w / 2.4, length / 2.4);
    material.map = map;
    material.bumpMap = map;
    return material;
  }, [mats, w, length]);
  const wallMat = useMemo(() => {
    const material = mats.wall.clone();
    const map = mats.wall.map!.clone();
    map.needsUpdate = true;
    map.repeat.set(Math.max(1, length / 3.2), Math.max(1, h / 3.2));
    material.map = map;
    material.bumpMap = map;
    return material;
  }, [mats, length, h]);
  const endMat = useMemo(() => {
    const material = mats.wall.clone();
    const map = mats.wall.map!.clone();
    map.needsUpdate = true;
    map.repeat.set(Math.max(1, w / 3.2), Math.max(1, h / 3.2));
    material.map = map;
    material.bumpMap = map;
    return material;
  }, [mats, w, h]);
  useEffect(
    () => () => {
      for (const material of [floorMat, wallMat, endMat]) {
        material.map?.dispose();
        material.dispose();
      }
    },
    [floorMat, wallMat, endMat]
  );

  const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: theme.accent, metalness: 0.8, roughness: 0.3 }), [theme.accent]);
  useEffect(() => () => accent.dispose(), [accent]);

  const nameTexture = useNameTexture(artistName, region.kind === 'foyer');
  useEffect(() => () => nameTexture?.dispose(), [nameTexture]);

  const wainscot = mats.wainscot;
  const wainscotHeight = 0.95;

  return (
    <group>
      {/* floor and ceiling */}
      <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[w, length]} />
      </mesh>
      <mesh position={[cx, h, cz]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}>
        <planeGeometry args={[w, length]} />
      </mesh>

      {/* side walls: inner faces sit exactly on the walkable edge */}
      <Box position={[region.minX - T / 2, h / 2, cz]} size={[T, h, length + T]} material={wallMat} />
      <Box position={[region.maxX + T / 2, h / 2, cz]} size={[T, h, length + T]} material={wallMat} />
      {/* skirting */}
      <Box position={[region.minX + 0.02, 0.07, cz]} size={[0.04, 0.14, length]} material={mats.trim} />
      <Box position={[region.maxX - 0.02, 0.07, cz]} size={[0.04, 0.14, length]} material={mats.trim} />

      {wainscot && !isCorridor && (
        <>
          <Box position={[region.minX + 0.03, wainscotHeight / 2, cz]} size={[0.06, wainscotHeight, length - 0.2]} material={wainscot} />
          <Box position={[region.maxX - 0.03, wainscotHeight / 2, cz]} size={[0.06, wainscotHeight, length - 0.2]} material={wainscot} />
          <Box position={[region.minX + 0.05, wainscotHeight + 0.02, cz]} size={[0.1, 0.04, length - 0.2]} material={mats.trim} />
          <Box position={[region.maxX - 0.05, wainscotHeight + 0.02, cz]} size={[0.1, 0.04, length - 0.2]} material={mats.trim} />
        </>
      )}

      {/* end walls, with doorways where regions join */}
      {buildsEnd(plan, region, 'max') && (
        <EndWall z={region.maxZ + T / 2} region={region} joined={region.joinMaxZ} material={endMat} trim={mats.trim} accent={accent} />
      )}
      {buildsEnd(plan, region, 'min') && (
        <EndWall z={region.minZ - T / 2} region={region} joined={region.joinMinZ} material={endMat} trim={mats.trim} accent={accent} />
      )}

      <Ceiling region={region} mats={mats} length={length} w={w} cx={cx} cz={cz} />

      {region.kind === 'foyer' && nameTexture && (
        <>
          <mesh position={[region.minX + 1.45, 2.15, region.minZ + 0.02]} castShadow={shadows} receiveShadow>
            <planeGeometry args={[2.5, 2.5]} />
            <meshStandardMaterial map={nameTexture} roughness={0.85} />
          </mesh>
          {/* a bench to sit on, and a low plinth */}
          <Box position={[0, 0.24, region.maxZ - 5.8]} size={[2.6, 0.12, 0.7]} material={mats.frame} shadow={shadows} />
          <Box position={[-1.1, 0.12, region.maxZ - 5.8]} size={[0.1, 0.24, 0.55]} material={mats.frame} />
          <Box position={[1.1, 0.12, region.maxZ - 5.8]} size={[0.1, 0.24, 0.55]} material={mats.frame} />
        </>
      )}
    </group>
  );
}

function Ceiling({ region, mats, length, w, cx, cz }: { region: Region; mats: ReturnType<MaterialLibrary['forTheme']>; length: number; w: number; cx: number; cz: number }) {
  const theme = THEMES[region.theme];
  const h = region.height;
  const strips = Math.max(1, Math.floor(length / 3));
  if (region.kind === 'corridor') {
    return (
      <>
        {Array.from({ length: 2 }, (_, i) => (
          <mesh key={i} position={[cx, h - 0.02, region.maxZ - (i + 1) * (length / 3)]} rotation={[Math.PI / 2, 0, 0]} material={mats.light}>
            <planeGeometry args={[0.9, 0.12]} />
          </mesh>
        ))}
      </>
    );
  }
  if (theme.ceiling === 'coffered') {
    return (
      <>
        {Array.from({ length: strips }, (_, i) => (
          <group key={i} position={[cx, h, region.maxZ - (i + 0.5) * (length / strips)]}>
            <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.light}>
              <planeGeometry args={[w - 2.4, 0.22]} />
            </mesh>
            <mesh position={[0, -0.12, 0]} material={mats.trim}>
              <boxGeometry args={[w - 2, 0.24, 0.12]} />
            </mesh>
          </group>
        ))}
      </>
    );
  }
  if (theme.ceiling === 'skylight') {
    return (
      <>
        <mesh position={[cx, h - 0.02, cz]} rotation={[Math.PI / 2, 0, 0]} material={mats.light}>
          <planeGeometry args={[w * 0.55, length - 4]} />
        </mesh>
        {Array.from({ length: Math.floor((length - 4) / 2.5) + 1 }, (_, i) => (
          <mesh key={i} position={[cx, h - 0.08, region.maxZ - 2 - i * 2.5]} material={mats.trim}>
            <boxGeometry args={[w * 0.55 + 0.3, 0.14, 0.1]} />
          </mesh>
        ))}
      </>
    );
  }
  if (theme.ceiling === 'tracks') {
    return (
      <>
        {[-w / 4, w / 4].map((x) => (
          <mesh key={x} position={[cx + x, h - 0.06, cz]} material={mats.trim}>
            <boxGeometry args={[0.1, 0.1, length - 0.6]} />
          </mesh>
        ))}
      </>
    );
  }
  return null;
}

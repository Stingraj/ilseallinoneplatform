'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { textureUrl } from '@/lib/gallery/texture-url';
import type { PlacedArtwork } from '@/lib/gallery/plan';
import type { RoomTheme } from '@/lib/gallery/themes';
import type { MaterialLibrary } from './materials';
import { useArtworkTexture, type ArtworkTextureCache } from './textures';

const MAT = 0.045;
const BORDER = 0.04;
const unitPlane = new THREE.PlaneGeometry(1, 1);
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const matMaterial = new THREE.MeshStandardMaterial({ color: '#f3f0e8', roughness: 0.95 });

function usePlaque(title: string, detail: string, enabled: boolean) {
  const texture = useMemo(() => {
    if (!enabled || typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'Georgia, serif';
    const sans = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim() || 'sans-serif';
    ctx.fillStyle = '#efe9dd';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#1c1b1a';
    ctx.font = `italic 400 42px ${family}`;
    const shown = title.length > 26 ? `${title.slice(0, 25)}…` : title;
    ctx.fillText(shown, 28, 90);
    ctx.fillStyle = '#6d6962';
    ctx.font = `400 26px ${sans}`;
    ctx.fillText(detail.length > 38 ? `${detail.slice(0, 37)}…` : detail, 28, 140);
    const out = new THREE.CanvasTexture(canvas);
    out.colorSpace = THREE.SRGBColorSpace;
    out.anisotropy = 4;
    return out;
  }, [title, detail, enabled]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

interface Props {
  piece: PlacedArtwork;
  themeId: RoomTheme['id'];
  library: MaterialLibrary;
  cache: ArtworkTextureCache;
  shadows: boolean;
  /** Within the rooms around the visitor: worth loading the photograph. */
  load: boolean;
  /** Close enough that the larger texture and the plaque matter. */
  active: boolean;
  onSelect: (index: number) => void;
  onHover: (hovering: boolean) => void;
}

export function Artwork({ piece, themeId, library, cache, shadows, load, active, onSelect, onHover }: Props) {
  const mats = library.forTheme(themeId);
  const width = active ? 1920 : 1080;
  const url = piece.artwork.imageUrl ? textureUrl(piece.artwork.imageUrl, width) : null;
  // A bigger texture replaces the small one only while the visitor is in front of it.
  const { texture } = useArtworkTexture(cache, url, load);
  // Remember the last picture so swapping resolutions never flashes an empty frame (state adjusted during render).
  const [lastTexture, setLastTexture] = useState<THREE.Texture | null>(null);
  if (texture && texture !== lastTexture) setLastTexture(texture);
  else if (!load && lastTexture) setLastTexture(null);
  const shown = texture ?? lastTexture;

  const image = shown?.image as { width: number; height: number } | undefined;
  const aspect = image && image.height ? image.width / image.height : piece.shortM / piece.longM || 0.8;
  const w = image ? (aspect >= 1 ? piece.longM : piece.longM * aspect) : piece.shortM;
  const h = image ? (aspect >= 1 ? piece.longM / aspect : piece.longM) : piece.longM;

  const paintRef = useRef<THREE.MeshStandardMaterial>(null);
  const fade = useRef(0);
  const hasImage = Boolean(shown);
  // A material compiled without a map has no texture sampler: it must be rebuilt when the picture arrives (or leaves).
  useEffect(() => {
    if (paintRef.current) paintRef.current.needsUpdate = true;
  }, [hasImage]);
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    const material = paintRef.current;
    if (!material) return;
    const target = shown ? 1 : 0;
    fade.current += (target - fade.current) * (1 - Math.exp(-dt * 5));
    material.opacity = fade.current;
    material.emissiveIntensity = hovered ? 0.12 : 0;
  });

  const plaque = usePlaque(
    piece.artwork.title,
    [piece.artwork.year, piece.artwork.medium].filter(Boolean).join(' · '),
    load
  );

  const frameOuterW = w + 2 * (MAT + BORDER);
  const frameOuterH = h + 2 * (MAT + BORDER);
  const matW = w + 2 * MAT;
  const matH = h + 2 * MAT;

  return (
    <group position={piece.position} rotation={[0, piece.rotationY, 0]}>
      {/* soft contact shadow on the wall */}
      <mesh position={[0, -0.04, -0.047]} scale={[w + 0.9, h + 0.9, 1]} geometry={unitPlane} renderOrder={1}>
        <meshBasicMaterial map={library.shadow} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* frame */}
      <mesh position={[0, 0, 0.03]} scale={[frameOuterW, frameOuterH, 0.06]} geometry={unitBox} material={mats.frame} castShadow={shadows} />
      <mesh position={[0, 0, 0.0615]} scale={[matW, matH, 1]} geometry={unitPlane} material={matMaterial} />
      {/* the work itself */}
      <mesh position={[0, 0, 0.067]} scale={[w, h, 1]} geometry={unitPlane} renderOrder={2}>
        <meshStandardMaterial
          ref={paintRef}
          map={shown}
          color={shown ? '#ffffff' : '#d9d3c8'}
          transparent
          opacity={shown ? 0 : 1}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          roughness={0.9}
          metalness={0}
          envMapIntensity={0.25}
          emissive="#ffffff"
          emissiveMap={shown}
          emissiveIntensity={0}
        />
      </mesh>
      {/* plaque */}
      {plaque && (
        <mesh position={[frameOuterW / 2 + 0.32, -0.28, 0.012]} scale={[0.26, 0.13, 1]} geometry={unitPlane}>
          <meshStandardMaterial map={plaque} roughness={0.8} />
        </mesh>
      )}
      {/* generous invisible hit area */}
      <mesh
        position={[0, 0, 0.09]}
        scale={[frameOuterW + 0.3, frameOuterH + 0.3, 1]}
        geometry={unitPlane}
        onClick={(event) => {
          if (event.delta > 6) return;
          event.stopPropagation();
          onSelect(piece.index);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          onHover(true);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(false);
        }}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

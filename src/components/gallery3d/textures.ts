'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { TextureCache } from '@/lib/gallery/texture-cache';

export function createArtworkTextureCache(anisotropy: number) {
  const loader = new THREE.TextureLoader();
  return new TextureCache<THREE.Texture>(
    async (url) => {
      const texture = await loader.loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      return texture;
    },
    { concurrency: 3, graceMs: 6000 }
  );
}

export type ArtworkTextureCache = ReturnType<typeof createArtworkTextureCache>;

/** Loads a texture while `enabled`, and gives it back (so it can be freed) as soon as it is not needed. */
export function useArtworkTexture(cache: ArtworkTextureCache, url: string | null, enabled: boolean) {
  const [state, setState] = useState<{ url: string; texture: THREE.Texture } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !enabled) return;
    let cancelled = false;
    const lease = cache.acquire(url);
    lease.promise.then(
      (texture) => {
        if (process.env.NODE_ENV === 'development') console.info('[gallery] ready', url, 'cancelled=' + cancelled, 'img=' + (texture.image as { width?: number })?.width);
        if (!cancelled) setState({ url, texture });
      },
      (error) => {
        if (process.env.NODE_ENV === 'development') console.warn('[gallery] failed', url, String(error));
        if (!cancelled) setFailed(url);
      }
    );
    return () => {
      cancelled = true;
      lease.release();
    };
  }, [cache, url, enabled]);

  const texture = enabled && state && state.url === url ? state.texture : null;
  return { texture, failed: failed === url };
}

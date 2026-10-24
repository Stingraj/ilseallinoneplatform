import * as THREE from 'three';
import { THEMES, type MaterialKind, type RoomTheme } from '@/lib/gallery/themes';

/**
 * All surface textures are generated at run time from a few lines of canvas drawing: nothing is downloaded, nothing is
 * borrowed, and every theme's look is defined by the numbers in themes.ts.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return { canvas, ctx };
}

/** Soft multi-octave noise laid over what is already on the canvas. */
function cloudNoise(ctx: CanvasRenderingContext2D, size: number, rand: () => number, octaves: number[], alpha: number) {
  for (const cells of octaves) {
    // One extra cell on every side, copied from the opposite edge, so smoothing wraps and the tile has no seam.
    const padded = cells + 2;
    const tiny = document.createElement('canvas');
    tiny.width = padded;
    tiny.height = padded;
    const tctx = tiny.getContext('2d')!;
    const values = Array.from({ length: cells * cells }, () => Math.floor(rand() * 255));
    const img = tctx.createImageData(padded, padded);
    for (let y = 0; y < padded; y += 1) {
      for (let x = 0; x < padded; x += 1) {
        const v = values[((y - 1 + cells) % cells) * cells + ((x - 1 + cells) % cells)];
        const o = (y * padded + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
        img.data[o + 3] = 255;
      }
    }
    tctx.putImageData(img, 0, 0);
    const cell = size / cells;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tiny, -cell, -cell, cell * padded, cell * padded);
    ctx.restore();
  }
}

function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

function paint(kind: MaterialKind, base: string, size: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size);
  const rand = mulberry32(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  switch (kind) {
    case 'plaster':
      cloudNoise(ctx, size, rand, [12, 32, 96], 0.075);
      break;
    case 'limestone': {
      cloudNoise(ctx, size, rand, [10, 28, 80], 0.1);
      ctx.strokeStyle = shade(base, -0.07);
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, (size / 4) * i);
        ctx.lineTo(size, (size / 4) * i);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'concrete':
      cloudNoise(ctx, size, rand, [8, 24, 64, 128], 0.14);
      for (let i = 0; i < size * 1.4; i += 1) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
      }
      break;
    case 'marble': {
      cloudNoise(ctx, size, rand, [6, 16, 40], 0.1);
      ctx.lineCap = 'round';
      for (let v = 0; v < 9; v += 1) {
        const startX = rand() * size;
        const points: [number, number][] = [[startX, 0]];
        let x = startX;
        let y = 0;
        while (y < size) {
          y = Math.min(size, y + 10 + rand() * 18);
          x += (rand() - 0.5) * 34;
          points.push([x, y]);
        }
        // Pull the end back to the start so the vein continues across tile edges.
        const drift = points[points.length - 1][0] - startX;
        ctx.beginPath();
        points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px - drift * (py / size), py)));
        ctx.strokeStyle = `rgba(235,235,245,${0.05 + rand() * 0.12})`;
        ctx.lineWidth = 0.6 + rand() * 2.2;
        ctx.stroke();
      }
      break;
    }
    case 'oak':
    case 'walnut': {
      const planks = 8;
      const width = size / planks;
      for (let p = 0; p < planks; p += 1) {
        ctx.fillStyle = shade(base, (rand() - 0.5) * 0.09);
        ctx.fillRect(p * width, 0, width, size);
        for (let g = 0; g < 46; g += 1) {
          ctx.fillStyle = `rgba(${kind === 'walnut' ? '20,10,5' : '90,60,30'},${0.03 + rand() * 0.07})`;
          ctx.fillRect(p * width + rand() * width, 0, 0.6 + rand() * 1.2, size);
        }
        // butt joints
        const joint = rand() * size;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(p * width, joint, width, 1.5);
        ctx.fillRect(p * width, 0, 1.5, size);
      }
      cloudNoise(ctx, size, rand, [8, 24], 0.1);
      break;
    }
    case 'terrazzo': {
      cloudNoise(ctx, size, rand, [10, 30], 0.08);
      const chips = ['#b8aea0', '#8d8a85', '#e7e1d6', '#a39a8e', '#6f7468'];
      for (let i = 0; i < 520; i += 1) {
        ctx.fillStyle = chips[Math.floor(rand() * chips.length)];
        ctx.beginPath();
        const x = rand() * size;
        const y = rand() * size;
        const r = 1.2 + rand() * 4;
        ctx.moveTo(x + r, y);
        for (let k = 1; k < 6; k += 1) {
          const a = (k / 6) * Math.PI * 2;
          ctx.lineTo(x + Math.cos(a) * r * (0.6 + rand() * 0.6), y + Math.sin(a) * r * (0.6 + rand() * 0.6));
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
  }
  return canvas;
}

export interface ThemeMaterials {
  wall: THREE.MeshStandardMaterial;
  wainscot: THREE.MeshStandardMaterial | null;
  floor: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  light: THREE.MeshBasicMaterial;
}

/** Builds and owns every texture and material, and releases them all together. */
export class MaterialLibrary {
  private themes = new Map<string, ThemeMaterials>();
  private textures: THREE.Texture[] = [];
  private materials: THREE.Material[] = [];
  private size: number;
  private anisotropy: number;
  readonly shadow: THREE.CanvasTexture;

  constructor(size = 512, anisotropy = 4) {
    this.size = size;
    this.anisotropy = anisotropy;
    const { canvas, ctx } = makeCanvas(128);
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.22)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.CanvasTexture(canvas);
    this.textures.push(this.shadow);
  }

  private texture(kind: MaterialKind, color: string, seed: string, repeatX: number, repeatY: number) {
    const map = new THREE.CanvasTexture(paint(kind, color, this.size, hash(seed)));
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = this.anisotropy;
    this.textures.push(map);
    return map;
  }

  private standard(params: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(params);
    this.materials.push(material);
    return material;
  }

  /** Floor repeats are per-metre, so the texture scale stays the same in every room: callers set `repeat`. */
  forTheme(id: RoomTheme['id']): ThemeMaterials {
    const existing = this.themes.get(id);
    if (existing) return existing;
    const theme = THEMES[id];

    const wallMap = this.texture(theme.wallMaterial, theme.wall, `${id}-wall`, 4, 1.2);
    const floorMap = this.texture(theme.floor, theme.floorColor, `${id}-floor`, 1, 1);
    const wall = this.standard({ map: wallMap, bumpMap: wallMap, bumpScale: 0.6, roughness: 0.92, metalness: 0 });
    const floor = this.standard({
      map: floorMap, bumpMap: floorMap, bumpScale: 0.25, roughness: theme.floorRoughness, metalness: theme.floor === 'marble' ? 0.15 : 0.02,
      envMapIntensity: theme.floor === 'marble' || theme.floor === 'concrete' ? 1.4 : 0.9,
    });
    const wainscot = theme.wainscot
      ? this.standard({ map: this.texture('walnut', theme.wainscot, `${id}-wainscot`, 3, 1), roughness: 0.5, metalness: 0.02 })
      : null;
    const ceiling = this.standard({ color: theme.ceilingColor, roughness: 0.95, metalness: 0 });
    const trim = this.standard({ color: shade(theme.wall, -0.18), roughness: 0.6, metalness: 0.05 });
    const frame = this.standard({ color: theme.frame, roughness: 0.42, metalness: theme.frame === '#c9a24a' ? 0.85 : 0.25 });
    const light = new THREE.MeshBasicMaterial({ color: '#fff6e5', toneMapped: false });
    this.materials.push(light);

    const bundle = { wall, wainscot, floor, ceiling, trim, frame, light };
    this.themes.set(id, bundle);
    return bundle;
  }

  dispose() {
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
    this.textures = [];
    this.materials = [];
    this.themes.clear();
  }
}

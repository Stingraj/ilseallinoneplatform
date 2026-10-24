// Writes abstract placeholder "paintings" to public/dev-fixtures for testing the 3D gallery without the archive.
// They are generated here, belong to nobody, and are git-ignored. Only used with GALLERY_FIXTURE=1 in development.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// sharp ships with Next.js; JPEGs behave like real photographs in WebGL (SVG textures are unreliable).
const sharp = createRequire(import.meta.url)('sharp');

const OUT = 'public/dev-fixtures';
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const palettes = [
  ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#f4f1de'],
  ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#1b1b2f', '#162447', '#1f4068', '#e43f5a', '#f9f7f7'],
  ['#3d405b', '#81b29a', '#f2cc8f', '#e07a5f', '#f4f1de'],
  ['#05668d', '#028090', '#00a896', '#02c39a', '#f0f3bd'],
];
const sizes = [[1000, 1250], [1400, 1000], [1200, 1200], [900, 1350], [1500, 1100], [1100, 1400], [1300, 1000], [1000, 1000]];

for (let n = 0; n < 24; n += 1) {
  const r = rng(1000 + n * 77);
  const [w, h] = sizes[n % sizes.length];
  const colors = palettes[n % palettes.length];
  let body = `<rect width="${w}" height="${h}" fill="${colors[0]}"/>`;
  for (let i = 0; i < 14; i += 1) {
    const c = colors[Math.floor(r() * colors.length)];
    const op = (0.25 + r() * 0.6).toFixed(2);
    if (r() > 0.45) body += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(60 + r() * w * 0.32).toFixed(0)}" fill="${c}" opacity="${op}"/>`;
    else body += `<rect x="${(r() * w * 0.7).toFixed(0)}" y="${(r() * h * 0.7).toFixed(0)}" width="${(80 + r() * w * 0.5).toFixed(0)}" height="${(40 + r() * h * 0.35).toFixed(0)}" fill="${c}" opacity="${op}" transform="rotate(${(r() * 40 - 20).toFixed(0)} ${w / 2} ${h / 2})"/>`;
  }
  const horizon = (h * (0.45 + r() * 0.2)).toFixed(0);
  body += `<rect y="${horizon}" width="${w}" height="${h}" fill="${colors[1]}" opacity="0.35"/><line x1="0" x2="${w}" y1="${horizon}" y2="${horizon}" stroke="${colors[4]}" stroke-width="3" opacity="0.5"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(`${OUT}/work-${String(n + 1).padStart(2, '0')}.jpg`);
}
console.log('wrote 24 fixture images to', OUT);

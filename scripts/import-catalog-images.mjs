#!/usr/bin/env node
/**
 * Imports Ilse's photographed works from the catalogue staging folder into the archive and publishes them.
 *
 *   node scripts/import-catalog-images.mjs [--catalog <dir>] [--env <file>] [--dry-run]
 *
 * Reads the Supabase URL and service key from the environment file (default .env.local), never printing them.
 *
 * Safe by design:
 *  - Only photographs whose file name EXACTLY matches one catalogue title are imported (the catalogue's own
 *    "Image File Name" column is not trusted: several entries point at a differently named photograph).
 *  - Only high-resolution photographs (at least 1200 px wide). The catalogue's other images are 100-230 px
 *    thumbnails cut from a PDF, which would look blurry.
 *  - Only public facts are imported: title, year, medium, dimensions, catalogue number. Provenance, exhibitions,
 *    publications and locations (which can name private collectors) stay out; add them in the studio if wanted.
 *  - Re-running updates the same works (matched by catalogue number); it never duplicates them.
 *  - The photographs show each work on a large plain wall. The wall is cropped away (the work's edges are found with a
 *    gradient filter, not a background colour) so the museum and the catalogue show the piece itself at its true
 *    proportions. The crop is the work's bounding box plus a 2% margin; nothing inside it is touched.
 *  - Images are then resized to at most 2400 px on the long edge and re-encoded as JPEG quality 90, with no colour
 *    change or sharpening. The original photographs on disk are untouched.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import sharp from 'sharp';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const DRY = args.includes('--dry-run');
const CATALOG = resolve(flag('catalog', join(homedir(), 'code/elsa-artist-portfolio/public/catalog-imports')));
const ENV_FILE = resolve(flag('env', '.env.local'));
const MIN_WIDTH = 1200;
const MAX_EDGE = 2400;
const BUCKET = 'artwork-images';

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

/** Minimal CSV parser (quotes, commas and newlines inside quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/**
 * Bounding box of the work on a plain wall, as fractions of the image, or null if no edges are found. The wall's
 * shading is far below the edge threshold; paint, caps and outlines are far above it.
 */
async function artworkBox(file) {
  const { data, info } = await sharp(file).rotate().resize({ width: 480, withoutEnlargement: true }).greyscale().blur(1.2).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const cols = new Uint16Array(w);
  const rows = new Uint16Array(h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = -data[i - w - 1] - 2 * data[i - 1] - data[i + w - 1] + data[i - w + 1] + 2 * data[i + 1] + data[i + w + 1];
      const gy = -data[i - w - 1] - 2 * data[i - w] - data[i - w + 1] + data[i + w - 1] + 2 * data[i + w] + data[i + w + 1];
      if (Math.hypot(gx, gy) > 28) { cols[x]++; rows[y]++; }
    }
  }
  const first = (a, min) => a.findIndex((v) => v >= min);
  const last = (a, min) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] >= min) return i; return -1; };
  let x0 = first(cols, Math.max(3, Math.round(h * 0.012)));
  let x1 = last(cols, Math.max(3, Math.round(h * 0.012)));
  let y0 = first(rows, Math.max(3, Math.round(w * 0.012)));
  let y1 = last(rows, Math.max(3, Math.round(w * 0.012)));
  if (x0 < 0 || y0 < 0 || x1 <= x0 || y1 <= y0) return null;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  return { left: x0 / w, top: y0 / h, width: (x1 - x0 + 1) / w, height: (y1 - y0 + 1) / h };
}

const norm = (s) => s.replace(/\s*copy$/i, '').trim().toLowerCase();
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function walk(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, `${prefix}${name}/`));
    else out.push({ rel: `${prefix}${name}`, full });
  }
  return out;
}

const env = loadEnv(ENV_FILE);
const URL_BASE = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!URL_BASE || !KEY) throw new Error(`Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in ${ENV_FILE}`);
const headers = { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}) };

// 1. Work out what can be imported.
const catalogCsv = join(CATALOG, 'output/catalog.csv');
if (!existsSync(catalogCsv)) throw new Error(`Catalogue not found: ${catalogCsv}`);
const rows = parseCsv(readFileSync(catalogCsv, 'utf8').replace(/^﻿/, ''));
const byTitle = new Map();
for (const r of rows) if (r.Title) byTitle.set(norm(r.Title), [...(byTitle.get(norm(r.Title)) ?? []), r]);

const plan = [];
const skipped = [];
for (const file of walk(join(CATALOG, 'images')).filter((f) => /\.(jpe?g|png)$/i.test(f.rel))) {
  const meta = await sharp(file.full).metadata().catch(() => null);
  if (!meta?.width || meta.width < MIN_WIDTH) continue;
  const matches = byTitle.get(norm(basename(file.rel, extname(file.rel)))) ?? [];
  if (matches.length !== 1) { skipped.push(`${file.rel} (${matches.length ? 'ambiguous title' : 'no catalogue entry'})`); continue; }
  plan.push({ row: matches[0], file });
}
plan.sort((a, b) => a.row['IM Number'].localeCompare(b.row['IM Number']));
console.log(`${plan.length} works to import; ${skipped.length} photographs left out (no safe catalogue match).`);
for (const s of skipped) console.log(`  left out: ${s}`);
if (DRY) { for (const p of plan) console.log(`  ${p.row['IM Number']}  ${p.row.Title}  <- ${p.file.rel}`); process.exit(0); }

// 2. The database must have been set up first.
const probe = await fetch(`${URL_BASE}/rest/v1/artworks?select=id&limit=1`, { headers });
if (!probe.ok) {
  console.error(`\nThe "artworks" table is not available (HTTP ${probe.status}). Run ilse-full-setup.sql in the Supabase SQL Editor first, then run this again.`);
  process.exit(2);
}

// 3. Upload each image, then create or update its artwork.
let done = 0;
for (const { row, file } of plan) {
  const im = row['IM Number'];
  const objectPath = `catalog/${im.toLowerCase()}-${slugify(row.Title)}.jpg`;
  // Crop to the work (from the full-resolution photograph), then size for the web.
  const upright = await sharp(file.full).rotate().toBuffer({ resolveWithObject: true });
  const box = await artworkBox(upright.data);
  let pipeline = sharp(upright.data);
  if (box && box.width * box.height < 0.92) {
    const { width: W, height: H } = upright.info;
    pipeline = pipeline.extract({
      left: Math.round(box.left * W),
      top: Math.round(box.top * H),
      width: Math.min(W - Math.round(box.left * W), Math.round(box.width * W)),
      height: Math.min(H - Math.round(box.top * H), Math.round(box.height * H)),
    });
  }
  const body = await pipeline.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();

  const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body,
  });
  if (!up.ok) throw new Error(`Upload failed for ${im}: HTTP ${up.status} ${await up.text()}`);

  const year = Number.parseInt(row.Year, 10);
  const record = {
    title: row.Title,
    year: Number.isFinite(year) ? year : null,
    medium: row.Medium || null,
    dimensions: row.Dimensions || null,
    inventory_number: im,
    image_url: `${URL_BASE}/storage/v1/object/public/${BUCKET}/${objectPath}`,
    is_public: true,
    is_price_visible: false,
  };
  const save = await fetch(`${URL_BASE}/rest/v1/artworks?on_conflict=inventory_number`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(record),
  });
  if (!save.ok) throw new Error(`Saving ${im} failed: HTTP ${save.status} ${await save.text()}`);
  done++;
  console.log(`  ${im}  ${row.Title}  (${Math.round(body.length / 1024)} KB)`);
}
console.log(`\nImported ${done} works. They are published; review them under Studio > Artwork Archive.`);

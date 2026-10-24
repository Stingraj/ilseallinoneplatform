# Artist Studio — Layer 1 Audit & Proposed Integration Plan

Date: 2026-10-25 · Status: **AWAITING APPROVAL** — no code, database, n8n or deployment has been changed.

Sources read: all 18 blueprint documents in `Artist_Studio_Master_Blueprint/` (the master PDF matches the markdown files), the four projects, their GitHub repositories, and their Vercel projects (read-only).

> **Audit caveat.** Most files in this Desktop folder are iCloud placeholders that are not downloaded to the Mac (`elsapfs-main/.git`, `.env.local`, `package.json`, configs…). Reads hang while iCloud fetches them, and the downloads stalled. The audit therefore used the GitHub copies (`Stingraj/elsa-artist-portfolio`, `Stingraj/email-campaign-studio`), the original `~/Downloads/Arvista-main.zip`, and the live Vercel deployments. Any local, uncommitted edits that exist only in the Desktop copies were **not** seen.

---

## 1. What actually exists

| # | Project (folder) | What it really is | Stack | Hosting | Source of truth |
|---|---|---|---|---|---|
| 1 | **Existing artist website** (`else-2 copy/`) | Single static `index.html` + images: hero, Gallery, About overlay, Contact/Mailing List overlays, "Works Available" shop with a payment modal | Plain HTML/CSS/JS, Inter + Georgia, palette `#F5F2EE / #CC0000 / #AAAAAA` | Vercel `elsa-1780082186337` (CLI deploy, no Git) → `elsa-1780082186337.vercel.app` | **`index.html` is missing from the local folder** — it only exists inside the Vercel deployment |
| 2 | **Artwork archive & inventory** (`elsapfs-main/`) | Next.js dashboard: PDF generator, complete catalogue, sales tracker, profile, add/edit artwork; plus a public portfolio page at `/` with enquiry form | Next 14.2, React 18, Tailwind 3, shadcn/ui, Supabase SSR, @react-pdf/renderer | Vercel `elsapfs-main` ← GitHub `Stingraj/elsa-artist-portfolio` (main, 20 commits, last 2026-07-12) | Supabase project `qdqsmciqnntvzpyhqbps` |
| 3 | **Email Campaign Studio** (`email n8n/`) | 3-step campaign wizard: import contacts (CSV/paste) → template/visual/raw-HTML editor → confirm → POST to n8n webhook | Vite 6, React 18, Tailwind 3, lucide | Vercel (project not in the connected team) ← GitHub `Stingraj/email-campaign-studio` (1 commit) | None — contacts in memory, drafts in `localStorage` |
| 4 | **Downloaded GitHub site** (workspace root `src/`) | "ARVISTA" — scroll-driven 3D museum: arched entrance, doors open, barrel-vaulted corridor, camera turns to each painting; accessible static collection fallback | Next 16.4, React 19.3, React Three Fiber 9, drei, three 0.186, GSAP | Not deployed by you | `src/content/paintings.ts` (3 paintings, hard-coded) |

### Verified working features to preserve (from source)

**Archive (#2)** — password + magic-link login; artwork create/edit/delete with image upload to `artwork-images` bucket; statuses Available/Sold/Private/On Loan/Reserved/Archived; consignment, provenance, exhibition history, publications, series/category/collection; per-artwork public-price toggle; featured flag (max 10) feeding the public page; sales tracker (record/edit/remove sale, commission, discount, auto Sold/Available); catalogue + price-list PDFs with global "show price on PDF" switch; artist profile with photo upload; public portfolio + enquiry → `contacts` table.

**Email Studio (#3)** — CSV/paste parsing with validation, contact table, two templates + visual editor + raw HTML mode, live preview, confirm-before-send modal, campaign status/retry. **n8n contract (must not change):** `POST {webhookUrl}` JSON `{ contacts: [{ email, name }], subject, body }`.

**Existing site (#1)** — the visual identity (restrained Nordic editorial look, overlays, colour "caps"), biography copy, contact details.

**ARVISTA (#4)** — the 3D museum experience and its performance work (device tiers, reduced motion, baked lighting, hashed WebP images, strict CSP).

### Existing Supabase schema (from the 12 migrations — live DB not yet inspected)

Already present, so **not** to be recreated: `artworks`, `artwork_images`, `artist_profile` (+ legacy `artist_profiles`), `contacts` (types collector/gallery/curator/buyer/lead/vendor, `follow_up_status`), `sales` (→ artwork, contact; lead/reserved/invoice_sent/paid/delivered), `invoices` (→ sale, unique number), `exhibitions`, `exhibition_artworks`, `private_rooms` + `private_room_artworks` (passcode, expiry, per-field visibility), `reminders`, `documents`, `site_settings`, view `public_artworks`. Buckets: `artwork-images`, `artist-profile`, `artworks`, `documents` — all public.

So much of the blueprint's "BUILD" data model (collectors, sales, invoices, exhibitions, viewing rooms) **already exists as tables with no UI**. Plan: build UI on these tables and add only missing columns/tables.

---

## 2. Findings that need your decision before anything else

### 🔴 Security — likely live in production today

| # | Finding | Evidence | Impact |
|---|---|---|---|
| S1 | **Anyone may be able to become an admin.** Magic-link login calls `signInWithOtp` without `shouldCreateUser: false`, and every RLS policy grants `authenticated` users full access (`USING (true)`). | `app/login/page.tsx:46`, consolidated migration §5 | If Supabase sign-ups are enabled (the default), any stranger can enter their email, get an account, and read/edit/delete artworks, sales and contacts. **Quick fix you can do now:** Supabase → Authentication → disable "Allow new users to sign up". |
| S2 | **Private artwork fields are publicly readable.** Policy `artworks_public_select` exposes *every column* of Available artworks to anonymous users (cost, insurance value, internal notes, location, prices even when hidden). The public page even falls back to querying `artworks` directly. | migrations `20260630000000`, consolidated; `app/page.tsx:149` | Confidential data readable with the public anon key. |
| S3 | `artist_profile` has **RLS disabled** (the default Supabase grants then let anonymous users write to it). | migration `20260630000001` | Profile could be altered or wiped by anyone. |
| S4 | `private_rooms` is publicly selectable, **including passcodes**. | consolidated §5 | Viewing-room protection is ineffective. |
| S5 | `documents` bucket (certificates, contracts, invoices) is **public**, and every build re-forces all buckets public (`prebuild` → `setup-supabase-storage.mjs`). | consolidated §8; `scripts/setup-supabase-storage.mjs:56-69` | Private files reachable by URL. |
| S6 | Public enquiry form writes with the **service-role key**, no validation, no rate limit, no spam protection. | `app/actions/db.ts` `submitInquiryAction` | Spam / table flooding. |
| S7 | Existing site has a **fake card-payment form** (card number/expiry/CVV inputs; it sends nothing). Contact and mailing-list forms also do nothing. | live `index.html` lines ~1014-1262 | Misleading to buyers; must not be carried over. |
| S8 | `middleware.ts` only checks that an `sb-*-auth-token` cookie *exists*. | `middleware.ts` | Page shell is cosmetic-protected; data is still guarded by RLS, but S1 makes that moot. |
| S9 | Email Studio has **no login** and its webhook URL defaults to `http://localhost:5678/…`; it is user-editable in the browser. | `src/utils/storage.js` | Anyone with the URL can use it; and a Vercel-hosted app cannot reach a localhost n8n. |

No hard-coded keys or JWTs were found in either repository. `.env.local` was not read.

### ⚖️ Licensing — blocks reuse of the downloaded site

- `chiragvaze/Arvista` on GitHub has **no license**. Legally that means all rights reserved: its code cannot be copied into your platform without the author's permission.
- Its three paintings and artist statement belong to **Chirag Vaze**, not Ilse — they must never be published on Ilse's site.
- The ambientCG textures are CC0 and safe to use.
- Options: (a) get written permission from the author, (b) treat ARVISTA as *design inspiration only* and build an original 3D/scroll "viewing corridor" ourselves, or (c) drop the 3D concept.

### 🔌 Access blockers

1. **Supabase**: project `qdqsmciqnntvzpyhqbps` is **not in the Supabase account connected to Claude** (only `bsah-academy` and `designstudiobyws` are visible). I cannot inspect the live schema, RLS, auth settings or data. Connect that organisation (or give me a read-only route) before any migration.
2. **n8n**: the only configured webhook is on `localhost`. For the platform on Vercel, n8n must be reachable over HTTPS (n8n Cloud, a VPS, or a tunnel). Please tell me where n8n runs and which workflows exist.
3. **Existing website source**: I can download `index.html` from the Vercel deployment into the repo — confirm that is the latest version.
4. **Content**: the existing biography (Copenhagen, Royal Danish Academy, studio of Per Kirkeby, Charlottenborg…) reads like placeholder copy. Please confirm it is true before it goes on the new site. Several gallery/shop images are Unsplash stock.

---

## 3. Proposed target architecture

**Recommendation: one new Next.js 16 / React 19 app in `Stingraj/ilseallinoneplatform` (currently empty), on one Vercel project, using the existing Supabase project.**

Why this host:
- The 3D gallery needs React 19 (R3F 9); the archive is React 18 and the Email Studio is plain React. One React 19 / Next 16 app can host all three.
- The archive's code moves in largely file-for-file (server actions, PDF templates, shadcn components). The Next 14→16 changes are small and mechanical: `middleware.ts` becomes `proxy.ts`, `eslint` setup, `serverComponentsExternalPackages` → `serverExternalPackages`, config keys. `cookies()` is already awaited.
- The Email Studio components are framework-free React and drop in as a client-side section. The n8n payload is kept byte-for-byte; the browser stops calling n8n directly and calls a server route that adds auth and a secret header, then forwards the same JSON.
- **Nothing existing is switched off.** `elsapfs-main`, `elsa-1780082186337` and the Email Studio deployment keep running unchanged until you sign off. They are the rollback.

Alternative considered: Vercel multi-zones (keep three apps, stitch them under one domain). Lower migration risk, but it isn't one codebase or one dashboard, and the shared navigation and sign-in would be fragile. Not recommended.

```
                    ┌──────────────── ilseallinoneplatform (Next 16, one Vercel project) ────────────────┐
 Visitors ─────────►│ Public site  /  /artworks[/slug]  /collections[/slug]  /about  /exhibitions[/slug]  │
                    │              /journal*  /contact  /viewing/[token] (noindex)                      │
                    │        │  publicArtworkService (server-only, view-based, field allow-list)        │
 Artist  ─ login ──►│ /studio  Overview · Website · Archive · Email · Collectors & Sales · Exhibitions · │
                    │          PDF & Tools        │ server actions (session-checked, owner-only)        │
                    └─────────┬─────────────┬─────┴───────────────┬────────────────────────────────────┘
                              │             │                     │ signed POST, same payload
                     Supabase Auth   Supabase DB + Storage     n8n (hosted, HTTPS) ──► existing email transport
                     (existing)      (existing tables + additive migrations)
```

### Route map

| Area | Route | Origin |
|---|---|---|
| Home | `/` | New — existing site's identity + featured works from `public_artworks` |
| Gallery | `/artworks`, `/artworks/[slug]` | New on archive data (replaces archive `/` portfolio) |
| Collections | `/collections`, `/collections/[slug]` | New, from `artworks.collection` / `series` |
| About | `/about` | Existing site copy → `artist_profile` |
| Exhibitions | `/exhibitions`, `/exhibitions/[slug]` | New UI on existing `exhibitions` tables |
| Journal | `/journal` | Optional — only if real posts exist |
| Contact | `/contact` | New: validated, rate-limited enquiry → `contacts` + n8n notification |
| Viewing room | `/viewing/[token]` | New UI on existing `private_rooms` (hashed tokens) |
| 3D corridor | `/gallery-walk` (optional) | Depends on the licensing decision |
| Dashboard | `/studio/*` (old `/dashboard/*` paths redirect) | Seven sections below |

### Seven dashboard sections → features

| Section | Contents | Status |
|---|---|---|
| Overview | KPIs, recent artworks, enquiries, sales, upcoming exhibitions, analytics | BUILD (real data only; empty states when zero) |
| Website | Featured works (existing flag), price visibility (existing), profile/bio, homepage content, preview | INTEGRATE existing + small BUILD |
| Artwork Archive | Existing artwork list/edit/new, catalogue, PDF generator | PRESERVE (moved, behaviour unchanged) |
| Email Studio | Existing 3-step composer; + contacts from CRM, automations (welcome, enquiry follow-up, exhibition invite, collection announcement), test-send to sandbox address only | PRESERVE + EXTEND |
| Collectors & Sales | CRM on `contacts` (+ interests, tags, consent, interaction history), enquiries, existing sales tracker, invoices on `invoices` with PDF | PRESERVE sales + BUILD CRM/invoices |
| Exhibitions | Calendar, editor, artwork assignment, viewing rooms (create, invite, expire, revoke, access log) | BUILD on existing tables |
| PDF & Tools | Existing catalogue/price list, invoice PDF, custom PDF maker, image optimiser, PDF compressor | PRESERVE + BUILD |

### Database plan (additive and reversible; nothing dropped or renamed)

Run against a **Supabase branch or staging copy first**, never production without your approval.

- **Security fixes** (each changes existing behaviour → needs approval): replace `artworks_public_select` with view-only public access; re-enable RLS on `artist_profile` with owner-only writes; owner-only policies (by your user ID, not "any authenticated user"); stop public select on `private_rooms`; make `documents` private with signed URLs; remove the "force all buckets public" prebuild step.
- **Additive columns**: `artworks.slug`, `artworks.is_public` (decouples "show on website" from "Available", so sold works can still appear as Sold), `artworks.description_public`; `contacts.interests[]`, `tags[]`, `consent_marketing`, `consent_at`, `unsubscribed_at`, `source`; `exhibitions.slug`, `status`, `cover_image_url`, `is_published`; `private_rooms.token_hash`, `revoked_at`; `invoices` line items/seller/buyer snapshot.
- **New tables**: `enquiries` (→ contact, artwork, source page, status), `contact_interactions`, `invoice_items`, `viewing_room_access_log`, `analytics_events` (consent-aware, no personal data), `email_campaign_log` (what was sent to n8n, when, how many recipients).

### Design direction (summary — full spec goes in `DESIGN_SYSTEM.md`)

- **Public site**: keep the existing site's quiet Nordic gallery identity — off-white `#F5F2EE`, ink, a single red accent `#CC0000`, Inter + a serif display face — at a premium editorial scale: full-bleed hero artwork, asymmetric grids, large detail images with a keyboard-friendly lightbox, subtle reveal motion, reduced-motion support. The blueprint's coral/lilac/yellow/mint palette fits the dashboard better than the paintings, so it goes there.
- **Dashboard**: bright workspace on a soft neutral base. Each section has its own accent (Overview lilac, Website coral, Archive blue, Email yellow, CRM mint, Exhibitions peach, Tools lavender). Built from the existing shadcn/ui components, with a collapsible sidebar, mobile drawer, and skeleton/empty/error states.

---

## 4. Preserve / integrate / modify / build matrix

| Item | Action |
|---|---|
| Supabase project, auth users, artwork IDs, image URLs, storage paths | **Preserve** — reused as-is |
| Archive artwork CRUD, upload, statuses, consignment, featured, price toggle | **Preserve** → moved into `/studio/archive` |
| Sales tracker, catalogue + price-list PDFs, PDF price switch, profile | **Preserve** → moved |
| Email Studio composer, templates, parser, confirm modal, n8n payload | **Preserve** → moved; webhook call goes through a server route |
| n8n workflows | **Preserve** — not edited; new automations are added as *new* workflows only after approval |
| Existing site look and copy | **Integrate** into the new public site; fake payment and dead forms **removed** |
| ARVISTA 3D gallery | **Blocked** pending licence decision |
| Archive public page `/`, enquiry action | **Modify** — replaced by the new public site and a secure enquiry route |
| RLS policies, bucket privacy, sign-up, middleware | **Modify** (security, needs approval) |
| CRM, enquiries, invoices UI, exhibitions UI, viewing rooms UI, PDF maker/compressor, analytics, automations | **Build** |
| Old deployments (`elsapfs-main`, `elsa-…`, Email Studio) | **Preserve** untouched as rollback until sign-off |

---

## 5. Safety, testing and rollback

- Work on branch `integration/artist-studio` in `ilseallinoneplatform`; no pushes to `main`, no force pushes.
- Before touching the database: a full schema + data dump (`supabase db dump`) stored outside Git; migrations tested on a Supabase branch.
- Regression checklist per preserved feature (login, artwork CRUD + upload, featured/price toggles, sales add/edit/remove, catalogue/price-list PDF, profile save, email compose → **sandbox webhook only**). Automated with Playwright against preview deployments.
- Email testing uses a separate n8n test workflow or a request bin. No real campaign is sent.
- Preview deployments only; production promotion only with your explicit go-ahead.
- Rollback: old deployments stay live; each migration ships with a down-migration.

## 6. Phased build after approval

1. Repo scaffold (Next 16), shared Supabase layer, owner-only auth, `/studio` shell with seven sections. Copy in archive and Email Studio unchanged in behaviour, then run regressions.
2. Security migrations on staging; public data adapter; new public site pages from real archive data.
3. Contact/enquiry → CRM → n8n notification; newsletter with consent and unsubscribe.
4. Collectors & Sales: CRM screens, enquiries, invoices with PDF.
5. Exhibitions + viewing rooms.
6. PDF & Tools: custom PDF maker, image optimiser, PDF compressor.
7. Analytics (Vercel Web Analytics + first-party `analytics_events`), Overview KPIs.
8. Full QA (mobile, accessibility, security), docs, preview sign-off, then production.

## 7. Approvals and inputs needed

1. **Host architecture**: approve one Next 16 app in `ilseallinoneplatform` (recommended) or ask for multi-zones.
2. **Security fixes S1–S9**: approve fixing them (applied on staging first). Consider disabling Supabase sign-ups now.
3. **ARVISTA**: permission from the author, inspiration-only rebuild, or drop it.
4. **Supabase access** for project `qdqsmciqnntvzpyhqbps`.
5. **n8n**: hosted HTTPS URL, list of existing workflows, and a test webhook.
6. **Content**: confirm the biography, the public pricing policy, the domain, and whether a Journal is wanted.
7. **iCloud**: keep the Desktop folder downloaded ("Keep Downloaded" in Finder), or let me work from fresh GitHub clones in a non-iCloud folder (recommended, e.g. `~/code/ilseallinoneplatform`).

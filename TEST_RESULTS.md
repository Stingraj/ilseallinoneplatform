# Test results

Run on 2026-10-25, macOS, Node 26, branch `integration/artist-studio`. **No test ran against the real Supabase project or n8n** (no access yet), and no email was sent.

## Automated

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | Pass |
| Unit tests (18) | `npm test` | 18 / 18 pass |
| Lint | `npm run lint` | 0 errors. 82 warnings, all in code carried over unchanged from the archive / Email Studio / shadcn |
| Production build | `npm run build` | Pass, 37 routes |
| Migrations + RLS | `scripts/test-migrations.sh ../elsa-artist-portfolio -h <socket> -p <port> -U postgres` on local PostgreSQL 18 with a Supabase stand-in (`supabase/tests/00_supabase_shim.sql`) | Pass: all 12 archive migrations, then both Studio migrations, RLS checks, full rollback, re-apply, RLS checks again |

Unit tests cover: n8n dispatch modes (disabled by default; test mode never reaches the live webhook; https required), the n8n payload contract, public field allow-list (cost, insurance, notes, locations never exposed), hidden/sold prices, slugs, collection grouping, featured ordering, private profile fields, viewing-room tokens (random, hashed, well-formed), room expiry/revocation, passcode proof binding, constant-time compare, invoice totals and numbering, file-name sanitising, owner allow-list (locked when unset).

RLS checks (`supabase/tests/10_rls_checks.sql`) prove, as database roles:
- anon reads 0 rows from `artworks`; sees only public works in `website_artworks`; private work and hidden price do not leak;
- anon cannot list `private_rooms`, cannot read or insert `enquiries`, cannot update `artist_profile` (S2, S3, S4);
- a signed-in non-owner reads and updates nothing (S1);
- the owner reads and writes everything;
- slugs are generated; the `documents` bucket is private (S5).

## Manual (local production build, no Supabase configured)

| Check | Result |
|---|---|
| Public pages render with honest empty states (`/`, `/artworks`, `/about`, `/contact`, `/collections`, `/exhibitions`) | Pass |
| Unknown artwork/collection/exhibition → 404 | Pass |
| Invalid viewing-room link → "This link is not valid." page | Pass |
| `/studio/*` without a session → `/login` | Pass |
| Old `/dashboard/...` URLs → 308 to `/studio/...` | Pass |
| `/api/studio/email/send`, `/api/generate-catalog`, `/api/studio/invoices/*/pdf` without a session → 401 | Pass |
| Security headers (CSP, X-Frame-Options, Referrer-Policy) present | Pass |
| Mobile 375 px: no horizontal scroll; menu opens/closes (Escape) | Pass |
| Contact form: field validation messages; input kept after a failed submit; graceful message when the database is unavailable | Pass |

## Not yet tested (needs staging access)

- Sign-in (password, magic link via `/auth/callback`) and the owner allow-list against real Supabase Auth.
- Every preserved archive workflow: artwork CRUD + image upload, featured/price toggles, sales add/edit/remove, catalogue and price-list PDFs, profile save + photo upload.
- Public pages with real artworks; revalidation after a dashboard edit.
- Enquiry → collector → enquiries inbox; newsletter consent; rate limit.
- CRM, invoices + PDF, exhibitions publish, viewing rooms (create, open, passcode, expire, revoke, renew).
- Email Studio → n8n **test** webhook; automations.
- PDF maker / compressor / image optimiser in Chrome, Safari and Firefox.
- Lighthouse / axe accessibility pass on pages with real images.

Planned: Playwright suite against the Vercel preview + Supabase staging branch, using a test owner account and `EMAIL_DISPATCH_MODE=test`.

## Gallery Walk (added 2026-10-25)

Run with `GALLERY_FIXTURE=1` (18 generated stand-in works, 4 collections) because the real archive is not reachable. Details in `docs/GALLERY_WALK.md`.

| Check | Result |
|---|---|
| Unit tests: 35 total, 17 for the gallery engine (dimension parsing, grouping, room layout, no overlaps, every route between every pair of 23 stops stays inside the building, collision and sliding, eased guided motion at walking pace, reduced-motion jump, free-mode momentum, texture cache sharing/limits/disposal, device tiers, screen-reader text, texture URL safety) | Pass |
| Typecheck, lint (new code: 0 errors, 0 warnings), production build | Pass |
| 3D renders in Chrome (Apple M2): foyer, passage, 4 room identities, spotlights, plaques, shadows, fog, dust | Pass, 60 fps |
| Guided tour: next/previous, Home/End, Rooms menu, scroll, click-to-approach from free mode | Pass |
| Free exploration: walk, turn, sprint, wall collision (stopped 0.35 m from the wall) | Pass |
| Inspect view: opens, wheel zoom, Escape closes, focus returns | Pass (after fixing a development-only auto-close) |
| WebGL context lost, then restored: "Restoring the gallery…" then same stop, textures re-uploaded | Pass |
| 2D fallback via "2D gallery": canvas freed, scroll restored, 18 works grouped by room | Pass |
| Empty archive: 2D page "being prepared", no errors | Pass |
| Phone width (375 px): swipe hint, Next button, compact sheet, no horizontal scroll, no Explore button | Pass |
| Soak: 5 trips first room ↔ last room | Flat: 29 textures, 68 geometries, 16 shaders, 60 fps |
| Production build (minified, no Strict Mode) renders identically | Pass |
| Site header/footer inert while the gallery is open; all controls named | Pass |

Bugs found and fixed during testing: paintings stayed blank because their material was compiled before the photograph arrived (now recompiled when it does; this would also have affected real images); inspector closed itself under React Strict Mode; light rooms overexposed paintings (per-theme exposure); wall textures showed tile seams (seamless noise); depth-fighting between mat and painting.

### Remaining issues (Gallery Walk)

1. **Real archive images through the Next image optimiser were not exercised** (no Supabase access). The URL form, allowed widths and CSP are verified by unit tests and reuse the setup of the 2D site.
2. **Only Chrome on an Apple M2 was measured.** Safari, Firefox, Android and low-end GPUs are untested; the tier rules are conservative guesses, not measurements.
3. **Reduced motion** is covered by unit tests and code paths, but was not toggled in a real browser (the preview tool cannot emulate the setting).
4. **Reflections**: polished floors reflect a procedural studio environment, not the paintings (no planar reflections; kept out for frame rate).
5. **Dimensions text**: size comes from the archive's free-text `dimensions`; if it is missing or unparseable a 70 cm default is used, and orientation always follows the photograph.
6. **Phones have a guided tour only** (no free walking), by design.
7. **Very large archives** make a long building (about 20 m per room plus 6 m passages); the Rooms menu and a bounded walking time (≤ 10 s per trip) keep it usable, but a map/overview would help beyond ~10 rooms.
8. **Screen readers**: the announcements and text index were verified in the accessibility tree, not with VoiceOver/NVDA.
9. three.js logs a deprecation notice (`THREE.Clock`) from react-three-fiber in development; harmless.

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

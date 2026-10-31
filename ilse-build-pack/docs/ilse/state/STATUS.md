# Implementation checkpoint

Status: CODE COMPLETE; studio verified in a browser against a LOCAL Supabase (2026-10-31). Staging/production verification BLOCKED (no access to Ilse's Supabase or n8n).
Reference commit: 6b7dd42465954834ada7c0fb8b37726d4c229510 (clean tree at start).
Branch: `build/ilse-studio-pack`, pushed; open as PR #1 into `integration/artist-studio`. Not merged, not deployed.

## Gates actually run (2026-10-30)

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | Pass, 0 errors |
| Lint | `npm run lint` | 0 errors, 83 warnings (all in preserved archive/Email Studio/shadcn files; new files add none that are errors) |
| Unit tests | `npm test` | 42/42 pass (7 new: consent/suppression, test allowlist, unsubscribe tokens/footer, invitation drafts, CSV formula neutralising) |
| Migration tests | `scripts/test-migrations.sh ~/code/elsa-artist-portfolio` on local Postgres 54329 with Supabase shim | ALL MIGRATION TESTS PASSED, including rollback and re-apply of `20261030000000_studio_workflows.sql` |
| Production build | `npx next build` | Pass (first attempt failed on a stale `.next/cache` font entry; cache moved aside, clean build passed) |
| HTTP smoke (prod server :3005, no Supabase) | curl | `/`, `/gallery-walk`, `/unsubscribe` 200; every `/studio/*` incl. new reports/search/settings/export → 307 `/login`; robots disallows `/unsubscribe` |
| Browser | in-app browser, 1280 and 375 wide | Unsubscribe: malformed link → "incomplete"; well-formed → confirm button (GET changes nothing); POST without database → neutral error, no false success. Public home unchanged. |

## Local Supabase browser run (2026-10-31)

Setup: `supabase start` in Docker with the 12 archive migrations from `elsa-artist-portfolio` plus the 3 studio migrations (all 15 applied). Local test owner created through the auth admin API and added to `studio_owners`; `EMAIL_DISPATCH_MODE=disabled`. No records were invented: the only artworks are the 3 sample rows that the archive's own migrations insert.

| Check | Result |
|---|---|
| Password sign-in as owner | Pass, lands on `/studio` |
| Overview at 1440 | Pass: counts read from the database (3 artworks, 3 available, 0 collectors, 0 open enquiries); upcoming-exhibition card picks up a new exhibition |
| Archive, Email Studio, Exhibitions, Reports, Settings, Search at 1440 | All render; Email Studio shows "Sending is not connected yet"; Settings shows Supabase connected, n8n off, test recipients not set |
| Exhibition create + reorder + save | Pass: saved through `save_exhibition`; DB positions match the chosen order (Morning Light 0, Coastal Study 1) |
| Invitation draft | Pass: creates `email_campaign_drafts` row (`exhibition_invitation`), works in curated order, unpublished exhibition links to `/contact`, opens Email Studio with "Back to the exhibition"; nothing sent |
| Search `morning` | Pass: 1 artwork, grouped results |
| Phone 375 | Pass: compact header, search, 2-column metric cards, bottom tab bar, "More" sheet lists every section |
| Fix made | Broken-image icons on Overview and the exhibition editor replaced by a neutral placeholder (`components/studio/artwork-thumb.tsx`); tsc, lint and 42/42 tests pass. Visual re-check of the fix not done (browser pane was closed). |

Finding for T05: the archive's own migrations (`20260624235500_catalog_profile_and_storage_fix.sql`, `20260703120000_consolidated_schema.sql`) insert three Unsplash stock images ("Coastal Study", "Morning Light", "Forest Edge"). If those rows exist in production they are not Ilse's work; the studio CSP (images only from Supabase) also blocks them. Check and remove or replace them with real archive records.

Not verified: real sends, Ilse's real archive data and imagery, the 768 tablet width.

## Blockers

1. Supabase staging access: apply migrations, seed `studio_owners`, then re-check the studio with real data (local run above used an empty database).
2. n8n: the campaign workflow must substitute `{{unsubscribe_url}}` per contact (`contacts[].unsubscribeUrl`); until then keep `N8N_SUPPORTS_UNSUBSCRIBE_URL` unset (live sends blocked by design).
3. `EMAIL_TEST_RECIPIENTS` must be set before test sends.
4. Correct archive imagery (T05) needs read access to the archive tables and `artwork-images` bucket.
5. Scheduled sending: not built (no scheduler); recorded as a gap, not faked.

## Production actions awaiting approval (none performed)

1. Back up staging DB → apply in order `20261025000000_studio_owner_security.sql`, `20261025000100_studio_additive_schema.sql`, `20261030000000_studio_workflows.sql` → run `supabase/tests/*.sql` checks → repeat on production with backup. Rollbacks in `supabase/rollback/`.
2. Insert the owner into `public.studio_owners`.
3. Set env vars on Vercel: `EMAIL_TEST_RECIPIENTS`, later `N8N_SUPPORTS_UNSUBSCRIBE_URL=1` (only after step 4).
4. Update the n8n campaign workflow to use `unsubscribeUrl` (request shape otherwise unchanged).
5. Review and merge PR #1 into `integration/artist-studio`, deploy a preview, then production.

## ARVISTA museum as the home page (2026-10-31, branch `build/arvista-site`)

Requested by the owner, who confirmed Arvista is theirs to reuse. `/` is now the ARVISTA 3D museum filled from the archive's public artworks (first 40, featured first); the old home page and `/gallery-walk` are gone (`/gallery-walk` redirects to `/`). Contact/enquiry, artwork, collection, exhibition, about, unsubscribe, viewing rooms and the whole studio are unchanged. See `docs/MUSEUM.md` and `TEST_RESULTS.md`.

Gates: tsc pass; lint 0 errors; 30/30 tests; `next build` pass; browser-checked on local Supabase at 1440 and 375 with three synthetic test images (local database only).
Not done: Ilse's real artworks are not in this repo or in any database I can reach, so the museum shows whatever the connected Supabase archive publishes; with the real project connected, check the first load and the order of works.

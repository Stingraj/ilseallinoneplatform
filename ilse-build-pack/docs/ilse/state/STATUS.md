# Implementation checkpoint

Status: CODE COMPLETE for the local run; staging verification BLOCKED (no Supabase or n8n access in this run).
Reference commit: 6b7dd42465954834ada7c0fb8b37726d4c229510 (clean tree at start).
Branch: `build/ilse-studio-pack` (local only, not pushed, not merged, not deployed).

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

Not verified: every studio screen in a browser (needs a Supabase owner session), real sends, real archive imagery.

## Blockers

1. Supabase staging access: apply migrations, seed `studio_owners`, then verify the studio UI at 1440/768/390.
2. n8n: the campaign workflow must substitute `{{unsubscribe_url}}` per contact (`contacts[].unsubscribeUrl`); until then keep `N8N_SUPPORTS_UNSUBSCRIBE_URL` unset (live sends blocked by design).
3. `EMAIL_TEST_RECIPIENTS` must be set before test sends.
4. Correct archive imagery (T05) needs read access to the archive tables and `artwork-images` bucket.
5. Scheduled sending: not built (no scheduler); recorded as a gap, not faked.

## Production actions awaiting approval (none performed)

1. Back up staging DB → apply in order `20261025000000_studio_owner_security.sql`, `20261025000100_studio_additive_schema.sql`, `20261030000000_studio_workflows.sql` → run `supabase/tests/*.sql` checks → repeat on production with backup. Rollbacks in `supabase/rollback/`.
2. Insert the owner into `public.studio_owners`.
3. Set env vars on Vercel: `EMAIL_TEST_RECIPIENTS`, later `N8N_SUPPORTS_UNSUBSCRIBE_URL=1` (only after step 4).
4. Update the n8n campaign workflow to use `unsubscribeUrl` (request shape otherwise unchanged).
5. Push `build/ilse-studio-pack`, open a PR into `integration/artist-studio`, review, merge, deploy a preview, then production.

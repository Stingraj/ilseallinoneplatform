# Deployment checklist

Nothing here has been done yet. Steps marked 🔒 need the owner's explicit approval at the time.

## 1. Staging (preview)

- [ ] Supabase: create a branch (or staging copy) of project `qdqsmciqnntvzpyhqbps`.
- [ ] Apply `supabase/migrations/20261025000000_studio_owner_security.sql`, then seed `studio_owners`, then `20261025000100_studio_additive_schema.sql`.
- [ ] Run Supabase security advisors; compare live policies with `DATABASE_CHANGES.md`.
- [ ] Vercel: new project from `Stingraj/ilseallinoneplatform`, Preview env vars from `.env.example` pointing at staging, `EMAIL_DISPATCH_MODE=test`, `N8N_TEST_WEBHOOK_URL` set.
- [ ] Push `integration/artist-studio` 🔒 (the repository is public: review before pushing).
- [ ] Run the regression list in `TEST_RESULTS.md` on the preview URL; record results.
- [ ] Owner walkthrough and sign-off.

## 2. Production 🔒

- [ ] Before anything: `supabase db dump` of production (schema + data) stored outside Git; confirm restore works.
- [ ] Disable "Allow new users to sign up" in Supabase Auth (if not already done).
- [ ] Apply both migrations to production in one session; seed `studio_owners` immediately.
- [ ] Check that the old portfolio (`elsapfs-main.vercel.app`) still shows works (it reads `public_artworks`, kept on purpose).
- [ ] Vercel Production env vars: real values, `NEXT_PUBLIC_SITE_URL` = final domain, `STUDIO_OWNER_EMAILS`, fresh random `ANALYTICS_SALT` and `VIEWING_ROOM_SECRET`, `EMAIL_DISPATCH_MODE=live` only after n8n workflows are confirmed.
- [ ] Merge to `main` 🔒 → production deployment 🔒.
- [ ] Domain: point DNS, verify HTTPS.
- [ ] Smoke test production: sign in, edit an artwork, see it on the site; send a campaign to a single internal address only.
- [ ] Remove the three demo artworks if present.

## 3. After two stable weeks

- [ ] Retire old deployments (keep their Git history).
- [ ] Cut-over migration: remove public read on `artist_profile`, narrow `public_artworks`.

## Rollback

- App: promote the previous Vercel deployment (or re-point the domain to the old projects, which stay live).
- Database: `supabase/rollback/20261025000100_studio_additive_schema.down.sql`, then `supabase/rollback/20261025000000_studio_owner_security.down.sql` (re-opens S1–S5; emergency only), or restore the dump.

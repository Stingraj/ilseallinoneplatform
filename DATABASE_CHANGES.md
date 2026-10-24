# Database changes

Supabase project: `qdqsmciqnntvzpyhqbps` (the archive's). **Nothing has been applied to it.** All changes are additive or policy-only, each has a down migration, and both were tested on a local Postgres replaying all 12 archive migrations first (`scripts/test-migrations.sh`, see TEST_RESULTS.md).

Apply order: staging branch → checks → backup production (`supabase db dump`) → production, in one session with the owner seed.

## 20261025000000_studio_owner_security.sql (S1–S5)

| Change | Before | After |
|---|---|---|
| `studio_owners` table + `is_studio_owner()` | — | Owner registry; policies call the function |
| `artworks` policies | anon could read every column of Available works; any signed-in user had full access | No anon access to the base table (public pages use views); owner-only access |
| `artist_profile` | RLS **disabled** | RLS on; public read (until cut-over); owner-only writes; anon write grants revoked |
| contacts, sales, invoices, reminders, documents, exhibitions(*write*), exhibition_artworks(*write*), artwork_images(*write*), site_settings, artist_profiles | any signed-in user | owner only |
| `private_rooms`, `private_room_artworks` | publicly readable (incl. passcodes) | owner only; visitors go through the server |
| `documents` bucket | public | private |
| storage writes (artwork-images, artist-profile, artworks, documents) | any signed-in user | owner only |

Seed the owner immediately after applying:

```sql
insert into public.studio_owners (user_id) select id from auth.users where lower(email) = lower('<owner email>');
```

Rollback: `supabase/rollback/20261025000000_studio_owner_security.down.sql` (restores the previous, insecure policies; roll back the additive migration first).

## 20261025000100_studio_additive_schema.sql

| Object | Purpose |
|---|---|
| `artworks.slug` (unique, trigger-filled), `artworks.is_public` | Website URLs and publishing. Backfill: `is_public = (status = 'Available')`, so nothing new becomes public |
| View `website_artworks` | Allow-listed public columns; never cost, insurance, notes, locations, consignment, provenance |
| Views `website_artwork_images`, `website_artist_profile`, `website_exhibitions`, `website_exhibition_artworks` | Public projections |
| `exhibitions.slug, is_published (default false), cover_image_url, external_url` | Publishing; existing exhibitions stay unpublished until chosen |
| `contacts.location, interests[], tags[], source, consent_marketing, consent_at, unsubscribed_at, last_contacted_at` | CRM and consent |
| `contact_interactions` | Collector history |
| `enquiries` | Website enquiries (IP stored only as a salted hash, for rate limiting) |
| `invoices.contact_id, currency, seller, buyer, tax_label, tax_rate, notes` + `invoice_items` | Invoices from real sales |
| `private_rooms.slug, token_hash, contact_id, revoked_at, intro` + `viewing_room_access_log` | Secure viewing-room links |
| `email_campaign_log` | Campaign history for the Overview |
| `analytics_events` | Anonymous counts (no personal data) |

All new tables: RLS on, owner-only, no anon privileges.

Rollback: `supabase/rollback/20261025000100_studio_additive_schema.down.sql` (drops only what it created; data in new tables is lost).

## Known items to check against the live database

- Live policy names may differ from the migration history; `drop policy if exists` covers renamed ones, but run `get_advisors` / list policies on staging before production.
- The archive's consolidated migration seeds three demo artworks with Unsplash images ("Morning Light", "Forest Edge", "Coastal Study"). If they exist in production they are public today; the new site shows them without images. Delete or mark them Private.
- `contacts` may contain duplicate emails; the new code de-duplicates on insert but does not merge existing duplicates.
- `private_rooms.passcode` remains plaintext (existing column), now readable only by the owner.

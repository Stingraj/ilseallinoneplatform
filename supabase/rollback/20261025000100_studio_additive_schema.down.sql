-- Reverses 20261025000100_studio_additive_schema.sql. Drops only what that migration created.
-- WARNING: deletes data stored in the new tables (enquiries, interactions, invoice items, logs, analytics).
begin;
drop view if exists public.website_exhibition_artworks;
drop view if exists public.website_exhibitions;
drop view if exists public.website_artist_profile;
drop view if exists public.website_artwork_images;
drop view if exists public.website_artworks;
drop table if exists public.analytics_events;
drop table if exists public.email_campaign_log;
drop table if exists public.viewing_room_access_log;
drop table if exists public.invoice_items;
drop table if exists public.enquiries;
drop table if exists public.contact_interactions;
drop trigger if exists artworks_set_slug on public.artworks;
drop function if exists public.artworks_set_slug();
drop index if exists public.artworks_slug_key;
drop index if exists public.exhibitions_slug_key;
drop index if exists public.private_rooms_token_hash_key;
drop index if exists public.contacts_email_lower_idx;
alter table public.artworks drop column if exists slug, drop column if exists is_public;
alter table public.exhibitions drop column if exists slug, drop column if exists is_published,
  drop column if exists cover_image_url, drop column if exists external_url;
alter table public.contacts drop column if exists location, drop column if exists interests, drop column if exists tags,
  drop column if exists source, drop column if exists consent_marketing, drop column if exists consent_at,
  drop column if exists unsubscribed_at, drop column if exists last_contacted_at;
alter table public.invoices drop column if exists contact_id, drop column if exists currency, drop column if exists seller,
  drop column if exists buyer, drop column if exists tax_label, drop column if exists tax_rate, drop column if exists notes;
alter table public.private_rooms drop column if exists slug, drop column if exists token_hash, drop column if exists contact_id,
  drop column if exists revoked_at, drop column if exists intro;
commit;

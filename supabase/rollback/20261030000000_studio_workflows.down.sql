-- Reverses 20261030000000_studio_workflows.sql. WARNING: deletes drafts, dispatch history, tokens and settings.
begin;
drop table if exists public.marketing_unsubscribe_tokens;
drop table if exists public.email_dispatch_operations;
drop table if exists public.email_campaign_drafts;
drop table if exists public.studio_settings;
drop function if exists public.save_exhibition(uuid, timestamptz, jsonb, uuid[]);
drop view if exists public.website_exhibition_artworks;
create view public.website_exhibition_artworks as
select ea.exhibition_id, w.*
from public.exhibition_artworks ea
join public.exhibitions e on e.id = ea.exhibition_id and e.is_published = true
join public.website_artworks w on w.id = ea.artwork_id;
drop index if exists public.exhibition_artworks_order_idx;
alter table public.exhibition_artworks drop column if exists position;
commit;

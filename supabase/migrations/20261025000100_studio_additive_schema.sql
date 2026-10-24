-- Artist Studio · additive schema for the website, CRM, enquiries, invoices, viewing rooms, campaigns and analytics.
-- Only adds columns, tables, views and policies; nothing existing is dropped or renamed.
-- Requires 20261025000000_studio_owner_security.sql (public.is_studio_owner()).
-- Reverse with ../rollback/20261025000100_studio_additive_schema.down.sql.

begin;

-- 1. Artworks: website publishing --------------------------------------------------------------------------------
alter table public.artworks
  add column if not exists slug text,
  add column if not exists is_public boolean;

-- Backfill: only works that are already publicly readable today (status = Available) start out public.
-- Sold, reserved and private works stay off the website until the artist publishes them.
update public.artworks set is_public = (status = 'Available') where is_public is null;
alter table public.artworks alter column is_public set default false;
alter table public.artworks alter column is_public set not null;

-- Stable, readable URLs: title + first 6 characters of the existing ID (IDs are never changed).
update public.artworks
set slug = trim(both '-' from regexp_replace(lower(coalesce(title, 'artwork')), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
where slug is null;
create unique index if not exists artworks_slug_key on public.artworks (slug);

create or replace function public.artworks_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from regexp_replace(lower(coalesce(new.title, 'artwork')), '[^a-z0-9]+', '-', 'g'))
      || '-' || left(new.id::text, 6);
  end if;
  return new;
end;
$$;
drop trigger if exists artworks_set_slug on public.artworks;
create trigger artworks_set_slug before insert or update of slug on public.artworks
  for each row execute function public.artworks_set_slug();

-- Website projection: an explicit allow-list. Never add cost, insurance_value, notes, internal_notes, location,
-- consignment_location, acquisition_* or provenance here.
create or replace view public.website_artworks as
select
  a.id,
  a.slug,
  a.title,
  a.medium,
  a.dimensions,
  a.year,
  case when a.status in ('Sold') then 'Sold'
       when a.status in ('Reserved', 'On Loan') then 'Reserved'
       else 'Available' end as availability,
  a.series,
  a.category,
  a.collection,
  a.description,
  a.image_url,
  a.is_featured,
  a.featured_order,
  case when a.is_price_visible and a.status = 'Available' then a.price else null end as price,
  a.currency,
  a.created_at,
  a.updated_at
from public.artworks a
where a.is_public = true
  and a.status not in ('Private', 'Archived');

grant select on public.website_artworks to anon, authenticated;

create or replace view public.website_artwork_images as
select i.id, i.artwork_id, i.image_url, i.thumbnail_url, i.alt_text, i.is_primary, i.sort_order
from public.artwork_images i
join public.artworks a on a.id = i.artwork_id
where a.is_public = true and a.status not in ('Private', 'Archived');

grant select on public.website_artwork_images to anon, authenticated;

-- Public artist profile without private contact fields (email, phone, studio_address).
create or replace view public.website_artist_profile as
select
  p.id,
  p.full_name,
  coalesce(p.bio, p.biography) as bio,
  coalesce(p.statement, p.artist_statement) as statement,
  p.location,
  p.nationality,
  p.birth_year,
  p.instagram,
  p.website,
  p.profile_photo_url,
  p.updated_at
from public.artist_profile p;

grant select on public.website_artist_profile to anon, authenticated;

-- 2. Exhibitions: publishing --------------------------------------------------------------------------------------
alter table public.exhibitions
  add column if not exists slug text,
  add column if not exists is_published boolean not null default false,
  add column if not exists cover_image_url text,
  add column if not exists external_url text;

update public.exhibitions
set slug = trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
where slug is null;
create unique index if not exists exhibitions_slug_key on public.exhibitions (slug);

create or replace view public.website_exhibitions as
select e.id, e.slug, e.title, e.venue, e.location, e.start_date, e.end_date, e.description, e.cover_image_url, e.external_url
from public.exhibitions e
where e.is_published = true;

grant select on public.website_exhibitions to anon, authenticated;

create or replace view public.website_exhibition_artworks as
select ea.exhibition_id, w.*
from public.exhibition_artworks ea
join public.exhibitions e on e.id = ea.exhibition_id and e.is_published = true
join public.website_artworks w on w.id = ea.artwork_id;

grant select on public.website_exhibition_artworks to anon, authenticated;

-- 3. Collectors (existing contacts table) -------------------------------------------------------------------------
alter table public.contacts
  add column if not exists location text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists source text,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists last_contacted_at timestamptz;

-- Not unique: existing rows may already contain duplicates. The app de-duplicates by email before inserting.
create index if not exists contacts_email_lower_idx on public.contacts (lower(email));

create table if not exists public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'email', 'call', 'meeting', 'enquiry', 'sale', 'viewing_room')),
  summary text not null,
  artwork_id uuid references public.artworks (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists contact_interactions_contact_idx on public.contact_interactions (contact_id, occurred_at desc);

-- 4. Enquiries ----------------------------------------------------------------------------------------------------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts (id) on delete set null,
  artwork_id uuid references public.artworks (id) on delete set null,
  name text not null,
  email text not null,
  message text not null,
  source_page text,
  status text not null default 'new' check (status in ('new', 'replied', 'follow_up', 'closed', 'spam')),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_ip_recent_idx on public.enquiries (ip_hash, created_at desc);

-- 5. Invoices: line items and snapshots ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists contact_id uuid references public.contacts (id) on delete set null,
  add column if not exists currency text not null default 'USD',
  add column if not exists seller jsonb,
  add column if not exists buyer jsonb,
  add column if not exists tax_label text,
  add column if not exists tax_rate numeric(6, 3) not null default 0,
  add column if not exists notes text;

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  artwork_id uuid references public.artworks (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_amount numeric(12, 2) not null,
  sort_order integer not null default 0
);

-- 6. Viewing rooms (existing private_rooms) -----------------------------------------------------------------------
alter table public.private_rooms
  add column if not exists slug text,
  add column if not exists token_hash text,
  add column if not exists contact_id uuid references public.contacts (id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists intro text;
create unique index if not exists private_rooms_token_hash_key on public.private_rooms (token_hash) where token_hash is not null;

create table if not exists public.viewing_room_access_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.private_rooms (id) on delete cascade,
  accessed_at timestamptz not null default now(),
  user_agent text
);

-- 7. Email campaign history and analytics ---------------------------------------------------------------------------
create table if not exists public.email_campaign_log (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  recipient_count integer not null,
  dispatch_mode text not null check (dispatch_mode in ('test', 'live')),
  http_status integer,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Consent-aware, anonymous counts only: no names, emails or IP addresses.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('page_view', 'artwork_view', 'enquiry', 'newsletter_signup', 'viewing_room_open')),
  path text,
  artwork_id uuid references public.artworks (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_artwork_idx on public.analytics_events (artwork_id, created_at desc);

-- 8. RLS for the new tables: owner-only. Public writes (enquiries, events, room log) go through validated server
--    routes that use the service role key, so anon gets no table access at all.
alter table public.contact_interactions enable row level security;
alter table public.enquiries enable row level security;
alter table public.invoice_items enable row level security;
alter table public.viewing_room_access_log enable row level security;
alter table public.email_campaign_log enable row level security;
alter table public.analytics_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contact_interactions', 'enquiries', 'invoice_items', 'viewing_room_access_log', 'email_campaign_log', 'analytics_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_studio_owner()) with check (public.is_studio_owner())',
      t || '_owner_all', t
    );
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

commit;

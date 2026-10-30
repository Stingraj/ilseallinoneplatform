-- Artist Studio · workflow completion (build pack T08–T13). Additive only; depends on 20261025000000 and 20261025000100.
-- Apply to a Supabase branch/staging copy first. Reverse with ../rollback/20261030000000_studio_workflows.down.sql.

begin;

-- 1. Exhibitions: stable artwork order and an atomic, owner-checked save -------------------------------------------
alter table public.exhibition_artworks add column if not exists position integer not null default 0;
create index if not exists exhibition_artworks_order_idx on public.exhibition_artworks (exhibition_id, position);
alter table public.exhibitions add column if not exists updated_at timestamptz not null default now();

-- Saves the exhibition and its complete ordered membership in one transaction. Rejects unknown artworks, bad dates,
-- non-owners and stale edits (p_expected_updated_at differs from the stored value). Duplicate IDs keep first position.
create or replace function public.save_exhibition(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_fields jsonb,
  p_artwork_ids uuid[]
)
returns table (exhibition_id uuid, saved_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_current timestamptz;
  v_now timestamptz := clock_timestamp();
  v_ids uuid[];
  v_missing integer;
  v_start date := nullif(p_fields->>'start_date', '')::date;
  v_end date := nullif(p_fields->>'end_date', '')::date;
  v_title text := btrim(coalesce(p_fields->>'title', ''));
begin
  if not public.is_studio_owner() then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if v_title = '' then
    raise exception 'title_required' using errcode = '22023';
  end if;
  if v_start is not null and v_end is not null and v_start > v_end then
    raise exception 'end_before_start' using errcode = '22023';
  end if;

  select coalesce(array_agg(a order by first_pos), '{}') into v_ids
  from (select a, min(i) as first_pos from unnest(coalesce(p_artwork_ids, '{}')) with ordinality as t(a, i) group by a) d;

  select count(*) into v_missing from unnest(v_ids) a where not exists (select 1 from public.artworks w where w.id = a);
  if v_missing > 0 then
    raise exception 'unknown_artwork' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.exhibitions (title, venue, location, start_date, end_date, description, cover_image_url, external_url, is_published, updated_at)
    values (
      v_title, nullif(p_fields->>'venue', ''), nullif(p_fields->>'location', ''), v_start, v_end,
      nullif(p_fields->>'description', ''), nullif(p_fields->>'cover_image_url', ''), nullif(p_fields->>'external_url', ''),
      coalesce((p_fields->>'is_published')::boolean, false), v_now
    )
    returning id into v_id;
  else
    select e.updated_at into v_current from public.exhibitions e where e.id = p_id for update;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if p_expected_updated_at is not null and v_current is distinct from p_expected_updated_at then
      raise exception 'stale_edit' using errcode = '40001';
    end if;
    update public.exhibitions set
      title = v_title,
      venue = nullif(p_fields->>'venue', ''),
      location = nullif(p_fields->>'location', ''),
      start_date = v_start,
      end_date = v_end,
      description = nullif(p_fields->>'description', ''),
      cover_image_url = nullif(p_fields->>'cover_image_url', ''),
      external_url = nullif(p_fields->>'external_url', ''),
      is_published = coalesce((p_fields->>'is_published')::boolean, false),
      updated_at = v_now
    where id = p_id;
    v_id := p_id;
  end if;

  delete from public.exhibition_artworks ea where ea.exhibition_id = v_id;
  insert into public.exhibition_artworks (exhibition_id, artwork_id, position)
  select v_id, a, (i - 1)::integer from unnest(v_ids) with ordinality as t(a, i);

  return query select v_id, v_now;
end;
$$;
revoke all on function public.save_exhibition(uuid, timestamptz, jsonb, uuid[]) from public, anon;
grant execute on function public.save_exhibition(uuid, timestamptz, jsonb, uuid[]) to authenticated;

-- Public exhibition artworks follow the curated order (a new column means the view must be recreated).
drop view if exists public.website_exhibition_artworks;
create view public.website_exhibition_artworks as
select ea.exhibition_id, ea.position, w.*
from public.exhibition_artworks ea
join public.exhibitions e on e.id = ea.exhibition_id and e.is_published = true
join public.website_artworks w on w.id = ea.artwork_id;
grant select on public.website_exhibition_artworks to anon, authenticated;

-- 2. Email: server drafts, durable dispatch operations, unsubscribe tokens -----------------------------------------
create table if not exists public.email_campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'campaign' check (kind in ('campaign', 'exhibition_invitation', 'collection_announcement', 'follow_up')),
  title text not null,
  subject text not null default '',
  preview_text text not null default '',
  template_type text not null default 'custom_announcement',
  template_data jsonb not null default '{}'::jsonb,
  raw_html text,
  exhibition_id uuid references public.exhibitions (id) on delete set null,
  artwork_ids uuid[] not null default '{}',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_campaign_drafts_exhibition_idx on public.email_campaign_drafts (exhibition_id, created_at desc);

-- One row per confirmed send. operation_key is generated when the owner confirms; the unique constraint makes
-- double clicks, retries and concurrent requests return the existing operation instead of sending twice.
create table if not exists public.email_dispatch_operations (
  id uuid primary key default gen_random_uuid(),
  operation_key uuid not null unique,
  draft_id uuid references public.email_campaign_drafts (id) on delete set null,
  subject text not null,
  body_sha256 text not null,
  dispatch_mode text not null check (dispatch_mode in ('test', 'live')),
  requested_count integer not null,
  eligible_count integer not null,
  excluded_count integer not null,
  state text not null default 'dispatching' check (state in ('dispatching', 'accepted_by_workflow', 'failed', 'unknown')),
  http_status integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_dispatch_operations_created_idx on public.email_dispatch_operations (created_at desc);

-- Opaque unsubscribe tokens: only the SHA-256 hash is stored; the token never contains an email or contact ID.
create table if not exists public.marketing_unsubscribe_tokens (
  token_hash text primary key,
  email_normalized text not null,
  operation_id uuid references public.email_dispatch_operations (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists marketing_unsubscribe_tokens_email_idx on public.marketing_unsubscribe_tokens (email_normalized);

-- 3. Studio settings (single row) ---------------------------------------------------------------------------------
create table if not exists public.studio_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'UTC',
  locale text not null default 'en-GB',
  updated_at timestamptz not null default now()
);
insert into public.studio_settings (id) values (true) on conflict (id) do nothing;

-- 4. RLS: owner-only; anon has no access (public unsubscribe goes through a validated server route) --------------
do $$
declare t text;
begin
  foreach t in array array['email_campaign_drafts', 'email_dispatch_operations', 'marketing_unsubscribe_tokens', 'studio_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
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

-- Behavioural checks after both Studio migrations. Each block raises an exception if a rule is broken.
\set ON_ERROR_STOP on
-- The archive's consolidated migration seeds three demo artworks; start from a known set.
delete from public.artworks;
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@example.com');
insert into public.studio_owners (user_id) values ('11111111-1111-1111-1111-111111111111');

insert into public.artworks (id, title, status, price, cost, internal_notes, is_public, is_price_visible) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Public work', 'Available', 1000, 100, 'secret', true, true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Private work', 'Private', 5000, 500, 'secret', false, true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Hidden price', 'Available', 2000, 100, null, true, false);

-- Anonymous visitor -----------------------------------------------------------------------------------------------
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.artworks) <> 0 then raise exception 'S2: anon can read the artworks base table'; end if;
  if (select count(*) from public.website_artworks) <> 2 then raise exception 'website_artworks should show 2 public works'; end if;
  if exists (select 1 from public.website_artworks where title = 'Private work') then raise exception 'private work leaked'; end if;
  if (select price from public.website_artworks where title = 'Hidden price') is not null then raise exception 'hidden price leaked'; end if;
  if (select count(*) from public.private_rooms) <> 0 then raise exception 'S4: anon can list private rooms'; end if;
end $$;
do $$ begin
  -- anon has no privileges at all on the new private tables.
  perform count(*) from public.enquiries;
  raise exception 'anon can read enquiries';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  begin
    update public.artist_profile set bio = 'defaced';
    if found then raise exception 'S3: anon could update artist_profile'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.enquiries (name, email, message) values ('x', 'x@example.com', 'spam');
    raise exception 'anon could insert enquiries directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Signed-in stranger (S1) -------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  if (select count(*) from public.artworks) <> 0 then raise exception 'S1: non-owner can read artworks'; end if;
  update public.artworks set title = 'hacked';
  if found then raise exception 'S1: non-owner updated artworks'; end if;
  if (select count(*) from public.contacts) <> 0 then raise exception 'S1: non-owner can read contacts'; end if;
end $$;
reset role;

-- Owner ---------------------------------------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$ begin
  if (select count(*) from public.artworks) <> 3 then raise exception 'owner cannot read all artworks'; end if;
  update public.artworks set is_public = false where id = 'aaaaaaaa-0000-0000-0000-000000000003';
  if not found then raise exception 'owner cannot update artworks'; end if;
  insert into public.contacts (name, email) values ('Collector', 'c@example.com');
  insert into public.enquiries (name, email, message) values ('A', 'a@example.com', 'Hello there');
end $$;
reset role;

-- Slugs and storage ----------------------------------------------------------------------------------------------
do $$ begin
  if (select slug from public.artworks where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 'public-work-aaaaaa' then
    raise exception 'unexpected slug: %', (select slug from public.artworks where id = 'aaaaaaaa-0000-0000-0000-000000000001');
  end if;
  if (select public from storage.buckets where id = 'documents') then raise exception 'S5: documents bucket still public'; end if;
end $$;
select 'RLS checks passed' as result;

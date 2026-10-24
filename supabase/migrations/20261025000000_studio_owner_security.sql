-- Artist Studio · security fixes S1–S5 (see DATABASE_CHANGES.md).
-- Apply to a Supabase branch / staging copy first. Reverse with ../rollback/20261025000000_studio_owner_security.down.sql.
--
-- Before this migration "authenticated" meant "admin": any account that could sign in had full access. After it, only
-- users listed in public.studio_owners can change anything. Seed the owner IN THE SAME SESSION, before the dashboard
-- is used, otherwise the studio is read-only for everyone:
--
--   insert into public.studio_owners (user_id)
--   select id from auth.users where lower(email) = lower('<owner email>');
--
-- Kept on purpose until the old deployments are retired (cutover migration):
--   * public SELECT on artist_profile and the public_artworks view, which the old portfolio page still reads.

begin;

-- 1. Owner registry ----------------------------------------------------------------------------------------------
create table if not exists public.studio_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.studio_owners enable row level security;
revoke all on public.studio_owners from anon, authenticated;

create or replace function public.is_studio_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.studio_owners where user_id = auth.uid());
$$;
revoke all on function public.is_studio_owner() from public;
grant execute on function public.is_studio_owner() to anon, authenticated;

drop policy if exists "studio_owners_self_read" on public.studio_owners;
create policy "studio_owners_self_read" on public.studio_owners for select to authenticated using (user_id = auth.uid());

-- 2. S2 · artworks: no direct anonymous reads of the base table ---------------------------------------------------
-- Public pages read the public_artworks / website_artworks views, which expose an allow-list of columns.
drop policy if exists "artworks_public_select" on public.artworks;
drop policy if exists "artworks_authenticated_select" on public.artworks;
drop policy if exists "artworks_admin_all" on public.artworks;
create policy "artworks_owner_all" on public.artworks for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 3. S3 · artist_profile: RLS back on; anyone may read (until cutover), only the owner may write ------------------
alter table public.artist_profile enable row level security;
drop policy if exists "artist_profile_public_read" on public.artist_profile;
drop policy if exists "artist_profile_owner_write" on public.artist_profile;
create policy "artist_profile_public_read" on public.artist_profile for select to anon, authenticated using (true);
create policy "artist_profile_owner_write" on public.artist_profile for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());
revoke insert, update, delete, truncate on public.artist_profile from anon;

drop policy if exists "artist_profiles_insert" on public.artist_profiles;
drop policy if exists "artist_profiles_update" on public.artist_profiles;
create policy "artist_profiles_insert" on public.artist_profiles for insert to authenticated with check (public.is_studio_owner());
create policy "artist_profiles_update" on public.artist_profiles for update to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 4. S1 · owner-only writes everywhere that previously trusted any signed-in user ---------------------------------
drop policy if exists "artwork_images_select" on public.artwork_images;
drop policy if exists "artwork_images_insert" on public.artwork_images;
drop policy if exists "artwork_images_update" on public.artwork_images;
drop policy if exists "artwork_images_delete" on public.artwork_images;
create policy "artwork_images_select" on public.artwork_images for select to anon, authenticated
  using (
    public.is_studio_owner()
    or exists (select 1 from public.artworks a where a.id = artwork_images.artwork_id and a.status = 'Available')
  );
create policy "artwork_images_owner_write" on public.artwork_images for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "exhibitions_insert" on public.exhibitions;
drop policy if exists "exhibitions_update" on public.exhibitions;
drop policy if exists "exhibitions_delete" on public.exhibitions;
create policy "exhibitions_owner_write" on public.exhibitions for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "exhibition_artworks_insert" on public.exhibition_artworks;
drop policy if exists "exhibition_artworks_delete" on public.exhibition_artworks;
create policy "exhibition_artworks_owner_write" on public.exhibition_artworks for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to contacts" on public.contacts;
create policy "contacts_owner_all" on public.contacts for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to sales" on public.sales;
create policy "sales_owner_all" on public.sales for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to invoices" on public.invoices;
create policy "invoices_owner_all" on public.invoices for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to reminders" on public.reminders;
create policy "reminders_owner_all" on public.reminders for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to documents" on public.documents;
create policy "documents_owner_all" on public.documents for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "site_settings_authenticated_read" on public.site_settings;
drop policy if exists "site_settings_authenticated_update" on public.site_settings;
create policy "site_settings_owner_read" on public.site_settings for select to authenticated using (public.is_studio_owner());
create policy "site_settings_owner_update" on public.site_settings for update to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 5. S4 · private rooms: no public listing (passcodes were readable by anyone) ------------------------------------
-- Viewing rooms are opened server-side after the link token is checked.
drop policy if exists "Allow public select on private_rooms" on public.private_rooms;
drop policy if exists "Allow authenticated full access to private_rooms" on public.private_rooms;
create policy "private_rooms_owner_all" on public.private_rooms for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow public select on private_room_artworks" on public.private_room_artworks;
drop policy if exists "Allow authenticated full access to private_room_artworks" on public.private_room_artworks;
create policy "private_room_artworks_owner_all" on public.private_room_artworks for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 6. S5 · storage: documents bucket private; uploads and deletes owner-only ---------------------------------------
update storage.buckets set public = false where id = 'documents';

drop policy if exists "Allow public select on documents storage" on storage.objects;
drop policy if exists "Allow authenticated full access to documents storage" on storage.objects;
create policy "documents_storage_owner_all" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and public.is_studio_owner())
  with check (bucket_id = 'documents' and public.is_studio_owner());

drop policy if exists "artwork_images_authenticated_insert" on storage.objects;
drop policy if exists "artwork_images_authenticated_update" on storage.objects;
drop policy if exists "artwork_images_authenticated_delete" on storage.objects;
create policy "artwork_images_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artwork-images' and public.is_studio_owner());
create policy "artwork_images_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artwork-images' and public.is_studio_owner()) with check (bucket_id = 'artwork-images' and public.is_studio_owner());
create policy "artwork_images_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artwork-images' and public.is_studio_owner());

drop policy if exists "artist_profile_authenticated_insert" on storage.objects;
drop policy if exists "artist_profile_authenticated_update" on storage.objects;
drop policy if exists "artist_profile_authenticated_delete" on storage.objects;
create policy "artist_profile_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artist-profile' and public.is_studio_owner());
create policy "artist_profile_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artist-profile' and public.is_studio_owner()) with check (bucket_id = 'artist-profile' and public.is_studio_owner());
create policy "artist_profile_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artist-profile' and public.is_studio_owner());

drop policy if exists "artworks_storage_insert" on storage.objects;
drop policy if exists "artworks_storage_update" on storage.objects;
drop policy if exists "artworks_storage_delete" on storage.objects;
create policy "artworks_storage_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artworks' and public.is_studio_owner());
create policy "artworks_storage_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artworks' and public.is_studio_owner()) with check (bucket_id = 'artworks' and public.is_studio_owner());
create policy "artworks_storage_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artworks' and public.is_studio_owner());

commit;

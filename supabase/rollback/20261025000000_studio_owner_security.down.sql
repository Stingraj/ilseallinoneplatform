-- Restores the pre-Studio policies from the archive's consolidated migration (20260703120000) and
-- 20260630000001_disable_profile_rls. This re-opens S1–S5; use only to roll back a failed deployment.
begin;
drop policy if exists "artworks_owner_all" on public.artworks;
create policy "artworks_public_select" on public.artworks for select to public using (status = 'Available');
create policy "artworks_authenticated_select" on public.artworks for select to authenticated using (true);
create policy "artworks_admin_all" on public.artworks for all to authenticated using (true) with check (true);

drop policy if exists "artist_profile_public_read" on public.artist_profile;
drop policy if exists "artist_profile_owner_write" on public.artist_profile;
alter table public.artist_profile disable row level security;
grant insert, update, delete on public.artist_profile to anon;
drop policy if exists "artist_profiles_insert" on public.artist_profiles;
drop policy if exists "artist_profiles_update" on public.artist_profiles;
create policy "artist_profiles_insert" on public.artist_profiles for insert to authenticated with check (true);
create policy "artist_profiles_update" on public.artist_profiles for update to authenticated using (true) with check (true);

drop policy if exists "artwork_images_select" on public.artwork_images;
drop policy if exists "artwork_images_owner_write" on public.artwork_images;
create policy "artwork_images_select" on public.artwork_images for select to public
  using ((auth.role() = 'authenticated') or exists (select 1 from public.artworks where artworks.id = artwork_images.artwork_id and artworks.status != 'Private'));
create policy "artwork_images_insert" on public.artwork_images for insert to authenticated with check (true);
create policy "artwork_images_update" on public.artwork_images for update to authenticated using (true) with check (true);
create policy "artwork_images_delete" on public.artwork_images for delete to authenticated using (true);

drop policy if exists "exhibitions_owner_write" on public.exhibitions;
create policy "exhibitions_insert" on public.exhibitions for insert to authenticated with check (true);
create policy "exhibitions_update" on public.exhibitions for update to authenticated using (true) with check (true);
create policy "exhibitions_delete" on public.exhibitions for delete to authenticated using (true);
drop policy if exists "exhibition_artworks_owner_write" on public.exhibition_artworks;
create policy "exhibition_artworks_insert" on public.exhibition_artworks for insert to authenticated with check (true);
create policy "exhibition_artworks_delete" on public.exhibition_artworks for delete to authenticated using (true);

drop policy if exists "contacts_owner_all" on public.contacts;
create policy "Allow authenticated full access to contacts" on public.contacts for all to authenticated using (true) with check (true);
drop policy if exists "sales_owner_all" on public.sales;
create policy "Allow authenticated full access to sales" on public.sales for all to authenticated using (true) with check (true);
drop policy if exists "invoices_owner_all" on public.invoices;
create policy "Allow authenticated full access to invoices" on public.invoices for all to authenticated using (true) with check (true);
drop policy if exists "reminders_owner_all" on public.reminders;
create policy "Allow authenticated full access to reminders" on public.reminders for all to authenticated using (true) with check (true);
drop policy if exists "documents_owner_all" on public.documents;
create policy "Allow authenticated full access to documents" on public.documents for all to authenticated using (true) with check (true);
drop policy if exists "site_settings_owner_read" on public.site_settings;
drop policy if exists "site_settings_owner_update" on public.site_settings;
create policy "site_settings_authenticated_read" on public.site_settings for select to authenticated using (true);
create policy "site_settings_authenticated_update" on public.site_settings for update to authenticated using (true) with check (true);

drop policy if exists "private_rooms_owner_all" on public.private_rooms;
create policy "Allow public select on private_rooms" on public.private_rooms for select to public using (true);
create policy "Allow authenticated full access to private_rooms" on public.private_rooms for all to authenticated using (true) with check (true);
drop policy if exists "private_room_artworks_owner_all" on public.private_room_artworks;
create policy "Allow public select on private_room_artworks" on public.private_room_artworks for select to public using (true);
create policy "Allow authenticated full access to private_room_artworks" on public.private_room_artworks for all to authenticated using (true) with check (true);

update storage.buckets set public = true where id = 'documents';
drop policy if exists "documents_storage_owner_all" on storage.objects;
create policy "Allow public select on documents storage" on storage.objects for select to public using (bucket_id = 'documents');
create policy "Allow authenticated full access to documents storage" on storage.objects for all to authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
drop policy if exists "artwork_images_owner_insert" on storage.objects;
drop policy if exists "artwork_images_owner_update" on storage.objects;
drop policy if exists "artwork_images_owner_delete" on storage.objects;
create policy "artwork_images_authenticated_insert" on storage.objects for insert to authenticated with check (bucket_id = 'artwork-images');
create policy "artwork_images_authenticated_update" on storage.objects for update to authenticated using (bucket_id = 'artwork-images') with check (bucket_id = 'artwork-images');
create policy "artwork_images_authenticated_delete" on storage.objects for delete to authenticated using (bucket_id = 'artwork-images');
drop policy if exists "artist_profile_owner_insert" on storage.objects;
drop policy if exists "artist_profile_owner_update" on storage.objects;
drop policy if exists "artist_profile_owner_delete" on storage.objects;
create policy "artist_profile_authenticated_insert" on storage.objects for insert to authenticated with check (bucket_id = 'artist-profile');
create policy "artist_profile_authenticated_update" on storage.objects for update to authenticated using (bucket_id = 'artist-profile') with check (bucket_id = 'artist-profile');
create policy "artist_profile_authenticated_delete" on storage.objects for delete to authenticated using (bucket_id = 'artist-profile');
drop policy if exists "artworks_storage_owner_insert" on storage.objects;
drop policy if exists "artworks_storage_owner_update" on storage.objects;
drop policy if exists "artworks_storage_owner_delete" on storage.objects;
create policy "artworks_storage_insert" on storage.objects for insert to authenticated with check (bucket_id = 'artworks');
create policy "artworks_storage_update" on storage.objects for update to authenticated using (bucket_id = 'artworks') with check (bucket_id = 'artworks');
create policy "artworks_storage_delete" on storage.objects for delete to authenticated using (bucket_id = 'artworks');

drop policy if exists "studio_owners_self_read" on public.studio_owners;
drop function if exists public.is_studio_owner();
drop table if exists public.studio_owners;
commit;

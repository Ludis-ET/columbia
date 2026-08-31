-- ============================================================================
-- Columbia Care — storage buckets
--
--   media/     photographs. Public read, admin write.
--              Sub-paths: gallery/ team/ services/ og/
--   documents/ the DSHS Disclosure of Services, the family info packet.
--
-- 8MB cap. Supabase's transform endpoint re-encodes to WebP/AVIF on the fly,
-- and next/image serves from there — nothing is stored pre-resized.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 8388608,
    array['image/jpeg','image/png','image/webp','image/avif']),
  ('documents', 'documents', true, 8388608,
    array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policies on storage.objects.
--
-- On recent Supabase projects storage.objects is owned by supabase_storage_admin,
-- and creating policies on it from the SQL Editor can fail with
-- "must be owner of table objects". That must not abort the whole script, so it
-- is caught here and reported. If you see the NOTICE, add the same four policies
-- through Dashboard → Storage → Policies instead.
do $$
begin
  drop policy if exists "public reads media" on storage.objects;
  create policy "public reads media" on storage.objects
    for select using (bucket_id in ('media', 'documents'));

  drop policy if exists "admins upload" on storage.objects;
  create policy "admins upload" on storage.objects
    for insert with check (bucket_id in ('media', 'documents') and is_admin());

  drop policy if exists "admins update objects" on storage.objects;
  create policy "admins update objects" on storage.objects
    for update using (bucket_id in ('media', 'documents') and is_admin());

  drop policy if exists "admins delete objects" on storage.objects;
  create policy "admins delete objects" on storage.objects
    for delete using (bucket_id in ('media', 'documents') and is_admin());

  raise notice 'Storage policies created.';
exception
  when insufficient_privilege then
    raise notice 'SKIPPED storage policies: not the owner of storage.objects. Add them via Dashboard > Storage > Policies. Buckets themselves were created fine.';
end $$;

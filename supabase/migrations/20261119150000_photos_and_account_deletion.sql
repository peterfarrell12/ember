-- Phase 1: private storage for progress photos, and a way for a person to delete their own account.

-- Progress photos: a private bucket. A person's files live under a folder named with their user id
-- (photos/<user id>/<file>.jpg) and only they can list, read, add or remove them. Nothing is public;
-- the app shows a photo through a short-lived signed link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

create policy "photos: read own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: change own" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Account deletion. Removes the caller's own sign-in record; their user_docs rows go with it
-- (on delete cascade). It can only ever delete the account that calls it. The app removes the
-- person's photo files first, through the storage service, and refuses to go on if that fails.
create function public.delete_my_account() returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text) then
    raise exception 'photos must be removed first';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

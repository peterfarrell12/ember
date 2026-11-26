-- Progress photos a client chooses to show their coach, one photo at a time.
--
-- Photos are private by default and stay in the client's own folder of the private "photos" bucket. Nothing
-- is copied. Sharing a photo adds one row here naming the file; while that row exists and the link is active,
-- the coach may open that one file. Unsharing, pausing or ending takes that away at once: the row goes (or
-- stops counting), and with it the coach's right to make a link to the file.

create table public.coach_photos (
  link_id    uuid not null references public.coach_links on delete cascade,
  path       text not null check (char_length(path) between 10 and 300),
  d          date not null,
  pose       text not null default '' check (char_length(pose) <= 12),
  kg         numeric check (kg is null or (kg > 0 and kg < 700)),
  w          int,
  h          int,
  created_at timestamptz not null default now(),
  primary key (link_id, path)
);
alter table public.coach_photos enable row level security;
create policy "shared photos: the coach while active, and the client" on public.coach_photos
  for select to authenticated using (
    exists (
      select 1 from public.coach_links l
      where l.id = link_id
        and ((l.coach_id = (select auth.uid()) and l.status = 'active') or l.client_id = (select auth.uid()))
    )
  );
revoke all on public.coach_photos from anon, authenticated;
grant select on public.coach_photos to authenticated;

-- The client shares or unshares one of their own photos. Only a file in the caller's own folder can be named.
create function public.coach_photo_share(
  p_path text, p_on boolean, p_d date default null, p_pose text default '', p_kg numeric default null,
  p_w int default null, p_h int default null
) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  mine uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select l.id into mine from public.coach_links l where l.client_id = me and l.status in ('active', 'paused');
  if mine is null then raise exception 'no_coach'; end if;
  if not p_on then
    delete from public.coach_photos c where c.link_id = mine and c.path = p_path;
    return;
  end if;
  if p_path is null or p_path not like me::text || '/%' or p_path like '%..%' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'photos' and o.name = p_path) then
    raise exception 'not_found';
  end if;
  if (select count(*) from public.coach_photos c where c.link_id = mine) >= 60 then raise exception 'too_many'; end if;
  insert into public.coach_photos (link_id, path, d, pose, kg, w, h)
    values (mine, p_path, coalesce(p_d, current_date), left(coalesce(p_pose, ''), 12), p_kg, p_w, p_h)
    on conflict (link_id, path) do update set d = excluded.d, pose = excluded.pose, kg = excluded.kg;
end;
$$;
revoke all on function public.coach_photo_share(text, boolean, date, text, numeric, int, int) from public, anon;
grant execute on function public.coach_photo_share(text, boolean, date, text, numeric, int, int) to authenticated;

-- The coach may open a file only while the client has it shared with them on an active link.
create policy "photos: a coach reads what a client shares with them" on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.coach_photos c
      join public.coach_links l on l.id = c.link_id
      where c.path = name and l.coach_id = (select auth.uid()) and l.status = 'active'
    )
  );

-- Ending a link removes what was shared on it (a paused link hides it through the policies above).
create function public.coach_photos_clear() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'ended' then
    delete from public.coach_photos c where c.link_id = new.id;
  end if;
  return new;
end;
$$;
create trigger coach_links_clear_photos after update on public.coach_links
  for each row execute function public.coach_photos_clear();

-- A photo file that is deleted: the app unshares it first. A row left behind for a file that is gone shows
-- the coach nothing, because there is no file to open, and the app drops such rows from the coach's view.

-- What to build next: a short list the owner keeps, which anyone signed in can vote on, and a box for
-- suggestions.
--
-- The list is written by the owner (in this file, or in the Supabase dashboard); nobody else can add to it
-- or change it, so there is nothing to moderate. A person has one vote per item and can take it back.
-- Only totals leave the database: nobody can see who voted for what. A suggestion is a private note to
-- the owner: its writer can read their own, nobody else's.

create table public.roadmap_items (
  id         text primary key check (id ~ '^[a-z0-9-]{2,30}$'),
  title      text not null check (char_length(title) between 3 and 60),
  about      text not null default '' check (char_length(about) <= 200),
  status     text not null default 'open' check (status in ('open', 'building', 'done', 'hidden')),
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.roadmap_votes (
  item_id    text not null references public.roadmap_items on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
create index roadmap_votes_user on public.roadmap_votes (user_id);

create table public.roadmap_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  body       text not null check (char_length(body) between 3 and 500),
  created_at timestamptz not null default now()
);
create index roadmap_notes_user on public.roadmap_notes (user_id, created_at);

alter table public.roadmap_items enable row level security;
alter table public.roadmap_votes enable row level security;
alter table public.roadmap_notes enable row level security;

-- Whether an item can still be voted on. A function, because a member has no access to the list itself.
create function public.roadmap_votable(p_item text) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.roadmap_items i where i.id = p_item and i.status in ('open', 'building'));
$$;

create policy "a person sees their own votes" on public.roadmap_votes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "a person votes as themselves, on what is open" on public.roadmap_votes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (select public.roadmap_votable(item_id))
  );
create policy "a person takes back their own vote" on public.roadmap_votes
  for delete to authenticated using ((select auth.uid()) = user_id);
create policy "a person reads their own suggestions" on public.roadmap_notes
  for select to authenticated using ((select auth.uid()) = user_id);

-- No policy on roadmap_items: the list is read through roadmap_board() below, and written only by the owner.
revoke all on public.roadmap_items from anon, authenticated;
revoke all on public.roadmap_votes from anon, authenticated;
revoke all on public.roadmap_notes from anon, authenticated;
grant select, delete on public.roadmap_votes to authenticated;
grant insert (item_id) on public.roadmap_votes to authenticated;
grant select on public.roadmap_notes to authenticated;

-- The list with its totals and whether the caller has voted. Totals only: no ids of voters leave the database.
create function public.roadmap_board() returns jsonb
  language sql stable security definer set search_path = ''
as $$
  select case when (select auth.uid()) is null then '[]'::jsonb else coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) end
  from (
    select i.id, i.title, i.about, i.status,
      (select count(*) from public.roadmap_votes v where v.item_id = i.id) as votes,
      exists (select 1 from public.roadmap_votes v where v.item_id = i.id and v.user_id = (select auth.uid())) as mine
    from public.roadmap_items i
    where i.status <> 'hidden'
    order by (i.status = 'done'), (i.status = 'building') desc, votes desc, i.sort, i.title
  ) t;
$$;

-- Leave a suggestion. Three a day per person, so the box cannot be flooded.
create function public.roadmap_suggest(p_body text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from public.roadmap_notes n where n.user_id = me and n.created_at > now() - interval '1 day') >= 3 then
    raise exception 'too_many_notes';
  end if;
  insert into public.roadmap_notes (user_id, body) values (me, btrim(p_body));
end;
$$;

revoke all on function public.roadmap_votable(text) from public, anon;
revoke all on function public.roadmap_board() from public, anon;
revoke all on function public.roadmap_suggest(text) from public, anon;
grant execute on function public.roadmap_votable(text) to authenticated;
grant execute on function public.roadmap_board() to authenticated;
grant execute on function public.roadmap_suggest(text) to authenticated;

-- The first list: things considered and not yet built.
insert into public.roadmap_items (id, title, about, sort) values
  ('health-sync', 'Apple Health and Health Connect', 'Weight, workouts, steps and sleep arriving on their own, with no files to export.', 1),
  ('widgets', 'Home and lock screen widgets', 'Calories left and your streak without opening the app.', 2),
  ('watch', 'Apple Watch app', 'Log a set, a drink or a weigh-in from your wrist.', 3),
  ('wearables', 'Garmin and WHOOP, directly', 'Sessions, sleep and recovery straight from the device maker.', 4),
  ('friends', 'Friends', 'Follow a few people you know and see each other''s sessions.', 5),
  ('siri', 'Siri and Shortcuts', 'Log by voice without opening the app.', 6),
  ('languages', 'More languages', 'Ember in Irish, Polish, Portuguese and others.', 7),
  ('coach', 'Work with a coach', 'A coach sets your programme and sees the progress you choose to share.', 8);

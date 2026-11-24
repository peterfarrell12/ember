-- Squads: an invite-only group (a few friends, a club, a creator's following) who see each other's effort
-- for the week on one board.
--
-- What a member shares is deliberately little: a display name they choose, this week's XP, their current
-- streak and how many training sessions they have done this week. Never food, weight, photos or anything
-- else from the diary. Joining is opt-in, by code, and leaving removes the row.
--
-- Nobody can read a squad or its members without belonging to it. Squads are created and joined only
-- through the functions below, which hold the limits; a member can change only their own row.

create table public.squads (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null check (char_length(name) between 2 and 40),
  owner      uuid not null references auth.users on delete cascade,
  challenge  jsonb,
  created_at timestamptz not null default now()
);

create table public.squad_members (
  squad_id   uuid not null references public.squads on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 24),
  week       date not null default '1970-01-01',
  xp         integer not null default 0 check (xp between 0 and 100000),
  streak     integer not null default 0 check (streak between 0 and 5000),
  sessions   integer not null default 0 check (sessions between 0 and 60),
  joined_at  timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);
create index squad_members_board on public.squad_members (squad_id, week, xp desc);
create index squad_members_user on public.squad_members (user_id);

alter table public.squads enable row level security;
alter table public.squad_members enable row level security;

-- The squads the caller belongs to. A function, so the policies below do not have to read squad_members
-- from inside a policy on squad_members.
create function public.my_squad_ids() returns setof uuid
  language sql stable security definer set search_path = ''
as $$
  select squad_id from public.squad_members where user_id = (select auth.uid());
$$;

create policy "members read their squads" on public.squads
  for select to authenticated using (id in (select public.my_squad_ids()));
create policy "owner edits the squad" on public.squads
  for update to authenticated using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "owner deletes the squad" on public.squads
  for delete to authenticated using ((select auth.uid()) = owner);

create policy "members read their squad's board" on public.squad_members
  for select to authenticated using (squad_id in (select public.my_squad_ids()));
create policy "a member updates their own row" on public.squad_members
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "a member leaves; the owner removes" on public.squad_members
  for delete to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.squads s where s.id = squad_id and s.owner = (select auth.uid()))
  );

revoke all on public.squads from anon, authenticated;
revoke all on public.squad_members from anon, authenticated;
grant select, delete on public.squads to authenticated;
grant update (name, challenge) on public.squads to authenticated;
grant select, delete on public.squad_members to authenticated;
grant update (name, week, xp, streak, sessions, updated_at) on public.squad_members to authenticated;

-- A short code people can read out or type: no 0/O, 1/I/L.
create function public.new_squad_code() returns text
  language sql volatile set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

-- Start a squad. The caller becomes its owner and first member. At most 3 owned and 5 joined per person.
create function public.create_squad(p_name text, p_member_name text) returns table (id uuid, code text)
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_id uuid;
  new_code text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from public.squads s where s.owner = me) >= 3 then raise exception 'too_many_owned'; end if;
  if (select count(*) from public.squad_members m where m.user_id = me) >= 5 then raise exception 'too_many_joined'; end if;
  for attempt in 1..8 loop
    new_code := public.new_squad_code();
    begin
      insert into public.squads (code, name, owner) values (new_code, btrim(p_name), me) returning squads.id into new_id;
      exit;
    exception when unique_violation then
      new_id := null;
    end;
  end loop;
  if new_id is null then raise exception 'no_code'; end if;
  insert into public.squad_members (squad_id, user_id, name) values (new_id, me, btrim(p_member_name));
  return query select new_id, new_code;
end;
$$;

-- Join a squad by its code. Joining twice is harmless. A squad holds at most 5,000 members.
create function public.join_squad(p_code text, p_member_name text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select s.id into target from public.squads s where s.code = upper(btrim(p_code));
  if target is null then raise exception 'not_found'; end if;
  if exists (select 1 from public.squad_members m where m.squad_id = target and m.user_id = me) then return target; end if;
  if (select count(*) from public.squad_members m where m.user_id = me) >= 5 then raise exception 'too_many_joined'; end if;
  if (select count(*) from public.squad_members m where m.squad_id = target) >= 5000 then raise exception 'squad_full'; end if;
  insert into public.squad_members (squad_id, user_id, name) values (target, me, btrim(p_member_name));
  return target;
end;
$$;

-- The board for a week: how many members, their sessions together, the top 50 by XP and where the caller
-- stands. Names and numbers only: no ids leave the database. Only a member may ask.
create function public.squad_board(p_squad uuid, p_week date) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  mine integer;
begin
  if me is null or not exists (select 1 from public.squad_members m where m.squad_id = p_squad and m.user_id = me) then
    raise exception 'not_a_member';
  end if;
  select m.xp into mine from public.squad_members m where m.squad_id = p_squad and m.user_id = me and m.week = p_week;
  return jsonb_build_object(
    'members', (select count(*) from public.squad_members m where m.squad_id = p_squad),
    'active', (select count(*) from public.squad_members m where m.squad_id = p_squad and m.week = p_week),
    'sessions', (select coalesce(sum(m.sessions), 0) from public.squad_members m where m.squad_id = p_squad and m.week = p_week),
    'rank', case when mine is null then null else
      (select 1 + count(*) from public.squad_members m where m.squad_id = p_squad and m.week = p_week and m.xp > mine) end,
    'top', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
      select m.user_id = me as me, m.name, m.xp, m.streak, m.sessions
      from public.squad_members m
      where m.squad_id = p_squad and m.week = p_week
      order by m.xp desc, m.name
      limit 50) t)
  );
end;
$$;

-- The owner removes everyone going by a given name (for a name that should not be on the board).
create function public.squad_remove(p_squad uuid, p_name text) returns integer
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  gone integer;
begin
  if not exists (select 1 from public.squads s where s.id = p_squad and s.owner = me) then raise exception 'not_owner'; end if;
  delete from public.squad_members m where m.squad_id = p_squad and m.name = p_name and m.user_id <> me;
  get diagnostics gone = row_count;
  return gone;
end;
$$;

revoke all on function public.my_squad_ids() from public, anon;
revoke all on function public.new_squad_code() from public, anon, authenticated;
revoke all on function public.create_squad(text, text) from public, anon;
revoke all on function public.join_squad(text, text) from public, anon;
revoke all on function public.squad_board(uuid, date) from public, anon;
revoke all on function public.squad_remove(uuid, text) from public, anon;
grant execute on function public.my_squad_ids() to authenticated;
grant execute on function public.create_squad(text, text) to authenticated;
grant execute on function public.join_squad(text, text) to authenticated;
grant execute on function public.squad_board(uuid, date) to authenticated;
grant execute on function public.squad_remove(uuid, text) to authenticated;

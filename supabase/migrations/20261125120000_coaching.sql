-- Coaching: a coach and a client as two real accounts.
--
-- A coach invites someone with a code. The person who accepts chooses what the coach may see (food,
-- training, weight, recovery), can change that at any time, and can pause or end the link.
--
-- What crosses between the two accounts is deliberately narrow:
--   coach_status   one row per link, written by the CLIENT's own app: a summary and a copy of recent days,
--                  already cut down to what the client shares. It is the only thing a coach can read about a
--                  client. The coach never reads the client's diary rows.
--   coach_assign   one row per link, written by the COACH: what they have set (a programme, targets, tasks,
--                  a check-in, a message). The client's app reads it and applies it. A coach never writes
--                  into a client's diary rows.
--   coach_messages the conversation, readable by the two of them and nobody else.
-- Links are made and changed only through the functions below, which hold the rules.

create table public.coach_links (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users on delete cascade,
  client_id   uuid references auth.users on delete cascade,
  code        text not null unique,
  status      text not null default 'invited' check (status in ('invited', 'active', 'paused', 'ended')),
  coach_name  text not null check (char_length(coach_name) between 1 and 40),
  client_name text not null default '' check (char_length(client_name) <= 40),
  share       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at    timestamptz,
  check (coach_id <> client_id)
);
create index coach_links_coach on public.coach_links (coach_id, status);
-- one coach at a time for a client
create unique index coach_links_one_coach on public.coach_links (client_id) where status in ('active', 'paused');

create table public.coach_status (
  link_id    uuid primary key references public.coach_links on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.coach_assign (
  link_id    uuid primary key references public.coach_links on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.coach_messages (
  id         bigint generated always as identity primary key,
  link_id    uuid not null references public.coach_links on delete cascade,
  sender     uuid not null default auth.uid() references auth.users on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index coach_messages_link on public.coach_messages (link_id, id);

alter table public.coach_links enable row level security;
alter table public.coach_status enable row level security;
alter table public.coach_assign enable row level security;
alter table public.coach_messages enable row level security;

create policy "the two people on a link see it" on public.coach_links
  for select to authenticated using ((select auth.uid()) in (coach_id, client_id));

-- a coach reads a client's status only while the link is active; the client can always see what they sent
create policy "status: the coach while active, and the client" on public.coach_status
  for select to authenticated using (
    exists (
      select 1 from public.coach_links l
      where l.id = link_id
        and ((l.coach_id = (select auth.uid()) and l.status = 'active') or l.client_id = (select auth.uid()))
    )
  );

create policy "what was set: the two people on the link" on public.coach_assign
  for select to authenticated using (
    exists (
      select 1 from public.coach_links l
      where l.id = link_id and l.status in ('active', 'paused') and (select auth.uid()) in (l.coach_id, l.client_id)
    )
  );

create policy "messages: the two people on the link read them" on public.coach_messages
  for select to authenticated using (
    exists (select 1 from public.coach_links l where l.id = link_id and (select auth.uid()) in (l.coach_id, l.client_id))
  );
create policy "messages: sent as yourself, on a link that is active" on public.coach_messages
  for insert to authenticated with check (
    sender = (select auth.uid())
    and exists (
      select 1 from public.coach_links l
      where l.id = link_id and l.status = 'active' and (select auth.uid()) in (l.coach_id, l.client_id)
    )
  );

revoke all on public.coach_links from anon, authenticated;
revoke all on public.coach_status from anon, authenticated;
revoke all on public.coach_assign from anon, authenticated;
revoke all on public.coach_messages from anon, authenticated;
grant select on public.coach_links to authenticated;
grant select on public.coach_status to authenticated;
grant select on public.coach_assign to authenticated;
grant select on public.coach_messages to authenticated;
grant insert (link_id, body) on public.coach_messages to authenticated;

-- An eight-character code people can read out: no 0/O, 1/I/L.
create function public.new_coach_code() returns text
  language sql volatile set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;

-- only the four areas, only true or false
create function public.coach_share_clean(p jsonb) returns jsonb
  language sql immutable set search_path = ''
as $$
  select jsonb_build_object(
    'food', coalesce((p ->> 'food')::boolean, false),
    'training', coalesce((p ->> 'training')::boolean, false),
    'weight', coalesce((p ->> 'weight')::boolean, false),
    'recovery', coalesce((p ->> 'recovery')::boolean, false)
  );
$$;

-- A coach makes an invitation. At most 300 open links per coach.
create function public.coach_invite(p_coach_name text, p_client_name text) returns table (id uuid, code text)
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_id uuid;
  new_code text;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from public.coach_links l where l.coach_id = me and l.status <> 'ended') >= 300 then
    raise exception 'too_many_clients';
  end if;
  for attempt in 1..8 loop
    new_code := public.new_coach_code();
    begin
      insert into public.coach_links (coach_id, code, coach_name, client_name)
        values (me, new_code, btrim(p_coach_name), left(btrim(coalesce(p_client_name, '')), 40))
        returning coach_links.id into new_id;
      exit;
    exception when unique_violation then
      new_id := null;
    end;
  end loop;
  if new_id is null then raise exception 'no_code'; end if;
  return query select new_id, new_code;
end;
$$;

-- Who an invitation is from, for the screen that asks whether to accept it.
create function public.coach_invite_info(p_code text) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
declare
  found public.coach_links;
begin
  if (select auth.uid()) is null then raise exception 'not_signed_in'; end if;
  select * into found from public.coach_links l where l.code = upper(btrim(p_code)) and l.status = 'invited';
  if found.id is null then raise exception 'not_found'; end if;
  return jsonb_build_object('coach_name', found.coach_name, 'own', found.coach_id = (select auth.uid()));
end;
$$;

-- Accept an invitation, saying what the coach may see.
create function public.coach_accept(p_code text, p_name text, p_share jsonb) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  found public.coach_links;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into found from public.coach_links l where l.code = upper(btrim(p_code)) and l.status = 'invited' for update;
  if found.id is null then raise exception 'not_found'; end if;
  if found.coach_id = me then raise exception 'own_invite'; end if;
  if exists (select 1 from public.coach_links l where l.client_id = me and l.status in ('active', 'paused')) then
    raise exception 'already_coached';
  end if;
  update public.coach_links l set
    client_id = me, status = 'active', accepted_at = now(),
    client_name = left(coalesce(nullif(btrim(p_name), ''), l.client_name, ''), 40),
    share = public.coach_share_clean(coalesce(p_share, '{}'::jsonb))
    where l.id = found.id;
  insert into public.coach_assign (link_id) values (found.id) on conflict do nothing;
  return found.id;
end;
$$;

-- Change a link. The client may change what is shared, pause, resume or end it. The coach may end it.
-- Pausing or ending removes what the coach could see, at once.
create function public.coach_link_update(p_link uuid, p_action text, p_share jsonb default null) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  found public.coach_links;
begin
  select * into found from public.coach_links l where l.id = p_link for update;
  if found.id is null or me is null or me not in (found.coach_id, coalesce(found.client_id, found.coach_id)) then
    raise exception 'not_found';
  end if;
  if found.status = 'ended' then raise exception 'ended'; end if;
  if p_action = 'end' then
    update public.coach_links l set status = 'ended', ended_at = now() where l.id = p_link;
    delete from public.coach_status s where s.link_id = p_link;
    delete from public.coach_assign a where a.link_id = p_link;
  elsif me = found.client_id and p_action = 'share' and found.status in ('active', 'paused') then
    update public.coach_links l set share = public.coach_share_clean(coalesce(p_share, '{}'::jsonb)) where l.id = p_link;
    delete from public.coach_status s where s.link_id = p_link; -- the app sends a fresh copy cut to the new choice
  elsif me = found.client_id and p_action = 'pause' and found.status = 'active' then
    update public.coach_links l set status = 'paused' where l.id = p_link;
    delete from public.coach_status s where s.link_id = p_link;
  elsif me = found.client_id and p_action = 'resume' and found.status = 'paused' then
    update public.coach_links l set status = 'active' where l.id = p_link;
  else
    raise exception 'not_allowed';
  end if;
end;
$$;

-- The client's app sends what the coach may see. Only for the caller's own active link.
create function public.coach_publish(p_data jsonb) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  mine uuid;
begin
  select l.id into mine from public.coach_links l where l.client_id = me and l.status = 'active';
  if mine is null then raise exception 'no_coach'; end if;
  if octet_length(p_data::text) > 400000 then raise exception 'too_large'; end if;
  insert into public.coach_status (link_id, data, updated_at) values (mine, p_data, now())
    on conflict (link_id) do update set data = excluded.data, updated_at = now();
end;
$$;

-- The coach sets one part of what a client has been given (a programme, targets, tasks, a message…).
create function public.coach_assign_put(p_link uuid, p_part text, p_val jsonb) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  merged jsonb;
begin
  if p_part !~ '^[a-z]{1,12}$' then raise exception 'not_allowed'; end if;
  if not exists (select 1 from public.coach_links l where l.id = p_link and l.coach_id = me and l.status in ('active', 'paused')) then
    raise exception 'not_found';
  end if;
  select coalesce((select a.data from public.coach_assign a where a.link_id = p_link), '{}'::jsonb)
    || jsonb_build_object(p_part, coalesce(p_val, '{}'::jsonb) || jsonb_build_object('v', floor(extract(epoch from clock_timestamp()) * 1000)::bigint))
    into merged;
  if octet_length(merged::text) > 600000 then raise exception 'too_large'; end if;
  insert into public.coach_assign (link_id, data, updated_at) values (p_link, merged, now())
    on conflict (link_id) do update set data = excluded.data, updated_at = now();
end;
$$;

revoke all on function public.new_coach_code() from public, anon, authenticated;
revoke all on function public.coach_share_clean(jsonb) from public, anon;
revoke all on function public.coach_invite(text, text) from public, anon;
revoke all on function public.coach_invite_info(text) from public, anon;
revoke all on function public.coach_accept(text, text, jsonb) from public, anon;
revoke all on function public.coach_link_update(uuid, text, jsonb) from public, anon;
revoke all on function public.coach_publish(jsonb) from public, anon;
revoke all on function public.coach_assign_put(uuid, text, jsonb) from public, anon;
grant execute on function public.coach_share_clean(jsonb) to authenticated;
grant execute on function public.coach_invite(text, text) to authenticated;
grant execute on function public.coach_invite_info(text) to authenticated;
grant execute on function public.coach_accept(text, text, jsonb) to authenticated;
grant execute on function public.coach_link_update(uuid, text, jsonb) to authenticated;
grant execute on function public.coach_publish(jsonb) to authenticated;
grant execute on function public.coach_assign_put(uuid, text, jsonb) to authenticated;

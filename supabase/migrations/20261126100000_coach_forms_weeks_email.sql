-- Coaching, third part: answers to any form a coach sends, weekly summaries, and invitations by email.

-- ---------- answers to forms ----------
-- A coach's forms are their own (kept with their other documents). The questions travel to the client with
-- what the coach sets. What comes back lands here, one row per link, kind and period:
--   checkin  the weekly (or fortnightly, or monthly) check-in
--   consult  the consultation form, once
--   self     a check-in the client does for themselves on a schedule, such as their relationship with food
alter table public.coach_checkins add column kind text not null default 'checkin' check (kind in ('checkin', 'consult', 'self'));
alter table public.coach_checkins add column title text not null default '' check (char_length(title) <= 80);
alter table public.coach_checkins drop constraint coach_checkins_link_id_week_key;
alter table public.coach_checkins add constraint coach_checkins_one_per_period unique (link_id, kind, week);

drop function public.coach_checkin_send(date, jsonb, jsonb);
create function public.coach_checkin_send(p_week date, p_answers jsonb, p_figures jsonb, p_kind text default 'checkin', p_title text default '')
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  mine uuid;
  out_id uuid;
begin
  select l.id into mine from public.coach_links l where l.client_id = me and l.status = 'active';
  if mine is null then raise exception 'no_coach'; end if;
  if p_kind not in ('checkin', 'consult', 'self') then raise exception 'not_allowed'; end if;
  if octet_length(coalesce(p_answers, '[]'::jsonb)::text) + octet_length(coalesce(p_figures, '{}'::jsonb)::text) > 60000 then
    raise exception 'too_large';
  end if;
  if exists (select 1 from public.coach_checkins c where c.link_id = mine and c.kind = p_kind and c.week = p_week and c.feedback is not null) then
    raise exception 'already_answered';
  end if;
  insert into public.coach_checkins (link_id, week, kind, title, answers, figures)
    values (mine, p_week, p_kind, left(coalesce(p_title, ''), 80), coalesce(p_answers, '[]'::jsonb), coalesce(p_figures, '{}'::jsonb))
    on conflict (link_id, kind, week) do update
      set answers = excluded.answers, figures = excluded.figures, title = excluded.title, created_at = now()
    returning id into out_id;
  return out_id;
end;
$$;
revoke all on function public.coach_checkin_send(date, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.coach_checkin_send(date, jsonb, jsonb, text, text) to authenticated;

-- ---------- weekly summaries ----------
-- One row per link per week, written by the CLIENT's own app and already cut to what they share: average
-- weight, calories, protein, steps, sessions. A coach's phases, engagement view and trends read these, so a
-- coach has history without ever reading the diary.
create table public.coach_weeks (
  link_id    uuid not null references public.coach_links on delete cascade,
  week       date not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (link_id, week)
);
alter table public.coach_weeks enable row level security;
create policy "weeks: the coach while active, and the client" on public.coach_weeks
  for select to authenticated using (
    exists (
      select 1 from public.coach_links l
      where l.id = link_id
        and ((l.coach_id = (select auth.uid()) and l.status = 'active') or l.client_id = (select auth.uid()))
    )
  );
revoke all on public.coach_weeks from anon, authenticated;
grant select on public.coach_weeks to authenticated;

create function public.coach_week_put(p_week date, p_data jsonb) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  mine uuid;
begin
  select l.id into mine from public.coach_links l where l.client_id = me and l.status = 'active';
  if mine is null then raise exception 'no_coach'; end if;
  if octet_length(p_data::text) > 4000 or p_week > current_date + 7 then raise exception 'not_allowed'; end if;
  insert into public.coach_weeks (link_id, week, data, updated_at) values (mine, p_week, p_data, now())
    on conflict (link_id, week) do update set data = excluded.data, updated_at = now();
end;
$$;
revoke all on function public.coach_week_put(date, jsonb) from public, anon;
grant execute on function public.coach_week_put(date, jsonb) to authenticated;

-- pausing, ending or changing what is shared also takes the weekly summaries away from the coach's view:
-- pausing hides them through the policy above; ending or narrowing the share deletes them
create function public.coach_weeks_clear() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'ended' or new.share is distinct from old.share then
    delete from public.coach_weeks w where w.link_id = new.id;
  end if;
  return new;
end;
$$;
create trigger coach_links_clear_weeks after update on public.coach_links
  for each row execute function public.coach_weeks_clear();

-- ---------- invitations by email ----------
-- A coach can put the client's email on an invitation. When someone signs in with that address, their app
-- finds the invitation without a code having to be typed. Nothing is emailed by the database.
alter table public.coach_links add column email text check (email is null or char_length(email) <= 200);
create index coach_links_email on public.coach_links (lower(email)) where status = 'invited';

drop function public.coach_invite(text, text);
create function public.coach_invite(p_coach_name text, p_client_name text, p_email text default null)
  returns table (id uuid, code text)
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
      insert into public.coach_links (coach_id, code, coach_name, client_name, email)
        values (me, new_code, btrim(p_coach_name), left(btrim(coalesce(p_client_name, '')), 40), nullif(lower(btrim(coalesce(p_email, ''))), ''))
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
revoke all on function public.coach_invite(text, text, text) from public, anon;
grant execute on function public.coach_invite(text, text, text) to authenticated;

-- Invitations waiting for the signed-in person's own email address. The address is read from the account,
-- and only counts once it has been confirmed, so nobody can pick up an invitation by signing up with
-- somebody else's address.
create function public.coach_invites_for_me() returns jsonb
  language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', l.code, 'coach_name', l.coach_name) order by l.created_at desc), '[]'::jsonb)
  from public.coach_links l
  join auth.users u on u.id = (select auth.uid())
  where l.status = 'invited'
    and l.email is not null
    and u.email_confirmed_at is not null
    and l.email = lower(u.email)
    and l.coach_id <> u.id;
$$;
revoke all on function public.coach_invites_for_me() from public, anon;
grant execute on function public.coach_invites_for_me() to authenticated;

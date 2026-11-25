-- Coaching, second part: check-ins, applications to a coach, and a programme for a whole squad.

-- ---------- check-ins ----------
-- The coach's questions travel with what they set for the client (coach_assign, part "checkin"). What comes
-- back is a row here: the client's answers and the week's figures their app worked out, which the client
-- sees before sending. The coach replies on the same row. One row per link per week.
create table public.coach_checkins (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references public.coach_links on delete cascade,
  week        date not null,
  answers     jsonb not null default '[]'::jsonb,
  figures     jsonb not null default '{}'::jsonb,
  feedback    text check (feedback is null or char_length(feedback) <= 4000),
  created_at  timestamptz not null default now(),
  feedback_at timestamptz,
  unique (link_id, week)
);
alter table public.coach_checkins enable row level security;
create policy "check-ins: the two people on the link" on public.coach_checkins
  for select to authenticated using (
    exists (select 1 from public.coach_links l where l.id = link_id and (select auth.uid()) in (l.coach_id, l.client_id))
  );
revoke all on public.coach_checkins from anon, authenticated;
grant select on public.coach_checkins to authenticated;

-- The client sends a check-in for a week (sending again in the same week replaces it, until the coach has replied).
create function public.coach_checkin_send(p_week date, p_answers jsonb, p_figures jsonb) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  mine uuid;
  out_id uuid;
begin
  select l.id into mine from public.coach_links l where l.client_id = me and l.status = 'active';
  if mine is null then raise exception 'no_coach'; end if;
  if octet_length(coalesce(p_answers, '[]'::jsonb)::text) + octet_length(coalesce(p_figures, '{}'::jsonb)::text) > 40000 then
    raise exception 'too_large';
  end if;
  if exists (select 1 from public.coach_checkins c where c.link_id = mine and c.week = p_week and c.feedback is not null) then
    raise exception 'already_answered';
  end if;
  insert into public.coach_checkins (link_id, week, answers, figures)
    values (mine, p_week, coalesce(p_answers, '[]'::jsonb), coalesce(p_figures, '{}'::jsonb))
    on conflict (link_id, week) do update set answers = excluded.answers, figures = excluded.figures, created_at = now()
    returning id into out_id;
  return out_id;
end;
$$;

-- The coach replies to a check-in.
create function public.coach_checkin_reply(p_id uuid, p_feedback text) returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  update public.coach_checkins c set feedback = btrim(p_feedback), feedback_at = now()
    where c.id = p_id
      and exists (select 1 from public.coach_links l where l.id = c.link_id and l.coach_id = (select auth.uid()) and l.status in ('active', 'paused'));
  if not found then raise exception 'not_found'; end if;
end;
$$;
revoke all on function public.coach_checkin_send(date, jsonb, jsonb) from public, anon;
revoke all on function public.coach_checkin_reply(uuid, text) from public, anon;
grant execute on function public.coach_checkin_send(date, jsonb, jsonb) to authenticated;
grant execute on function public.coach_checkin_reply(uuid, text) to authenticated;

-- ---------- a coach's page, and applying to work with them ----------
-- A coach can publish a short page under an address of their choosing. Anyone signed in who has the address
-- can read it and apply. An application is a note to the coach; if the coach accepts, the applicant gets an
-- invitation in their app and still chooses what to share, exactly as with a code.
create table public.coach_pages (
  coach_id   uuid primary key references auth.users on delete cascade,
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  name       text not null check (char_length(name) between 1 and 40),
  about      text not null default '' check (char_length(about) <= 600),
  offers     text not null default '' check (char_length(offers) <= 600),
  open       boolean not null default true,
  brand      text check (brand is null or brand ~ '^#[0-9a-fA-F]{6}$'),
  updated_at timestamptz not null default now()
);
create table public.coach_applications (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  note       text not null default '' check (char_length(note) <= 800),
  status     text not null default 'new' check (status in ('new', 'accepted', 'declined')),
  code       text,
  created_at timestamptz not null default now(),
  unique (coach_id, user_id)
);
alter table public.coach_pages enable row level security;
alter table public.coach_applications enable row level security;
create policy "a coach sees and edits their own page" on public.coach_pages
  for all to authenticated using ((select auth.uid()) = coach_id) with check ((select auth.uid()) = coach_id);
create policy "applications: the coach and the applicant" on public.coach_applications
  for select to authenticated using ((select auth.uid()) in (coach_id, user_id));
revoke all on public.coach_pages from anon, authenticated;
revoke all on public.coach_applications from anon, authenticated;
-- the policy above keeps every row to its owner, including after an update
grant select, insert, update, delete on public.coach_pages to authenticated;
grant select on public.coach_applications to authenticated;

-- A coach's page by its address. Returns what the coach chose to publish and nothing else.
create function public.coach_page(p_slug text) returns jsonb
  language sql stable security definer set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else (
    select jsonb_build_object('slug', p.slug, 'name', p.name, 'about', p.about, 'offers', p.offers, 'open', p.open,
      'own', p.coach_id = (select auth.uid()),
      'applied', (select a.status from public.coach_applications a where a.coach_id = p.coach_id and a.user_id = (select auth.uid())))
    from public.coach_pages p where p.slug = lower(btrim(p_slug))
  ) end;
$$;

-- Apply to a coach. One application per person per coach; applying again replaces the note while it is new.
create function public.coach_apply(p_slug text, p_name text, p_note text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  page public.coach_pages;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into page from public.coach_pages p where p.slug = lower(btrim(p_slug));
  if page.coach_id is null then raise exception 'not_found'; end if;
  if page.coach_id = me then raise exception 'own_page'; end if;
  if not page.open then raise exception 'closed'; end if;
  if (select count(*) from public.coach_applications a where a.user_id = me and a.created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.coach_applications (coach_id, user_id, name, note)
    values (page.coach_id, me, left(btrim(p_name), 40), left(btrim(coalesce(p_note, '')), 800))
    on conflict (coach_id, user_id) do update set name = excluded.name, note = excluded.note
    where public.coach_applications.status = 'new';
end;
$$;

-- The coach answers an application. Accepting makes an invitation and puts its code on the application,
-- where the applicant's app finds it.
create function public.coach_application_answer(p_id uuid, p_accept boolean) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  app public.coach_applications;
  page_name text;
  inv record;
begin
  select * into app from public.coach_applications a where a.id = p_id and a.coach_id = me and a.status = 'new' for update;
  if app.id is null then raise exception 'not_found'; end if;
  if not p_accept then
    update public.coach_applications a set status = 'declined' where a.id = p_id;
    return;
  end if;
  select p.name into page_name from public.coach_pages p where p.coach_id = me;
  select * into inv from public.coach_invite(coalesce(page_name, 'Your coach'), app.name);
  update public.coach_applications a set status = 'accepted', code = inv.code where a.id = p_id;
end;
$$;
revoke all on function public.coach_page(text) from public, anon;
revoke all on function public.coach_apply(text, text, text) from public, anon;
revoke all on function public.coach_application_answer(uuid, boolean) from public, anon;
grant execute on function public.coach_page(text) to authenticated;
grant execute on function public.coach_apply(text, text, text) to authenticated;
grant execute on function public.coach_application_answer(uuid, boolean) to authenticated;

-- ---------- a programme and a note for a whole squad ----------
-- The person who runs a squad can offer its members a programme and pin a short note. Members read both with
-- the squad; each member decides whether to use the programme.
alter table public.squads add column programme jsonb;
alter table public.squads add column note text check (note is null or char_length(note) <= 400);
alter table public.squads add constraint squads_programme_size check (programme is null or octet_length(programme::text) <= 120000);
grant update (programme, note) on public.squads to authenticated;

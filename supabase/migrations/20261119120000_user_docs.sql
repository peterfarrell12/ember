-- Phase 1: per-user documents, mirroring the prototype's Store (see docs/DATA_MODEL.md).
-- One row per document: (user, kind, id) -> JSON. Each person can only ever see and change their own rows.

create table public.user_docs (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null,
  id         text not null default '',
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

alter table public.user_docs enable row level security;

create policy "own rows" on public.user_docs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- updated_at is set by the database, never by the client, so "which copy is newer" can be trusted.
create function public.user_docs_touch() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_docs_touch
  before insert or update on public.user_docs
  for each row execute function public.user_docs_touch();

-- Signed-in people only. Nothing for visitors who are not signed in.
revoke all on public.user_docs from anon;
grant select, insert, update, delete on public.user_docs to authenticated;

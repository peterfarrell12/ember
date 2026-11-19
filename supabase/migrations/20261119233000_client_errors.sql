-- Phase 4: errors the app hits on people's devices, so they can be fixed. Kept in this project, not sent
-- to an outside service. The app strips anything that could be diary content before sending
-- (web/src/app/errors.js): what arrives is the kind of error, where in the code, and which screen.
-- People can add rows but cannot read them, not even their own; the owner reads them in the dashboard.

create table public.client_errors (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  at         timestamptz not null default now(),
  version    text not null default '',   -- which build of the app
  screen     text not null default '',   -- which tab was showing
  name       text not null default '',   -- TypeError, RangeError ...
  message    text not null default '',   -- with quoted text and numbers removed
  stack      text not null default '',   -- function names, file names and line numbers only
  agent      text not null default ''    -- the browser's description of itself
);
alter table public.client_errors enable row level security;
create policy "report as yourself" on public.client_errors
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and length(version) <= 40 and length(screen) <= 40 and length(name) <= 60
    and length(message) <= 300 and length(stack) <= 2000 and length(agent) <= 300
  );
revoke all on public.client_errors from anon, authenticated;
grant insert on public.client_errors to authenticated;

-- Phase 2: what each person's use of Claude costs, per day, so limits can be enforced on the server.
-- Only the server function writes here (through record_ai_usage, with the service role). A person can read
-- their own rows and nobody else's.

create table public.ai_usage (
  user_id       uuid not null references auth.users on delete cascade,
  day           date not null,
  calls         integer not null default 0,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  searches      integer not null default 0,
  cost_usd      numeric(12, 6) not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

create policy "read own usage" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Add one call's usage to a person's total for the day.
create function public.record_ai_usage(p_user uuid, p_day date, p_input bigint, p_output bigint, p_searches integer, p_cost numeric)
  returns void
  language sql
  security definer
  set search_path = ''
as $$
  insert into public.ai_usage (user_id, day, calls, input_tokens, output_tokens, searches, cost_usd)
  values (p_user, p_day, 1, p_input, p_output, p_searches, p_cost)
  on conflict (user_id, day) do update set
    calls = public.ai_usage.calls + 1,
    input_tokens = public.ai_usage.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_usage.output_tokens + excluded.output_tokens,
    searches = public.ai_usage.searches + excluded.searches,
    cost_usd = public.ai_usage.cost_usd + excluded.cost_usd;
$$;

-- What everyone together has spent on a day, in US dollars: the figure the daily ceiling is checked against.
create function public.ai_spend_on(p_day date) returns numeric
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0) from public.ai_usage where day = p_day;
$$;

revoke all on function public.record_ai_usage(uuid, date, bigint, bigint, integer, numeric) from public, anon, authenticated;
revoke all on function public.ai_spend_on(date) from public, anon, authenticated;
grant execute on function public.record_ai_usage(uuid, date, bigint, bigint, integer, numeric) to service_role;
grant execute on function public.ai_spend_on(date) to service_role;

-- Phase 2: products found on the web, kept so each one is searched for once, for everyone.
-- Only the server function reads and writes this table (with the service role). It holds no personal data.

create table public.products (
  key        text primary key,          -- brand and product name, lower-cased, as the app asked for it
  name       text not null,
  brand      text not null default '',
  found      boolean not null,          -- false records a search that found nothing, so it is not paid for again straight away
  kcal       numeric,                   -- figures per 100 g or 100 ml
  protein    numeric,
  carbs      numeric,
  fat        numeric,
  saturates  numeric,
  sugars     numeric,
  fibre      numeric,
  salt       numeric,
  serving_g  numeric,
  source_url text,                      -- the page the figures were read from
  checked_at timestamptz not null default now()
);

alter table public.products enable row level security;
-- no policies: nobody but the server reaches it
revoke all on public.products from anon, authenticated;

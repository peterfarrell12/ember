-- Phase 3: barcodes looked up live, and a way to say a product's figures are wrong.

-- Saved products can now come from a barcode lookup on Open Food Facts as well as from a web search.
-- `source` keeps the two apart: Open Food Facts data carries its own licence (ODbL), so rows that came
-- from it stay identifiable.
alter table public.products add column barcode text;
alter table public.products add column source text not null default 'web';
alter table public.products add column pack_g numeric;
create index products_barcode on public.products (barcode) where barcode is not null;

-- "This is wrong": a person's note that a product's figures do not match the pack. Each person sees only
-- their own; the owner reviews them all from the dashboard.
create table public.product_reports (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  product    text not null,           -- the app's id for the food, or its barcode
  name       text not null default '',
  brand      text not null default '',
  shown      jsonb not null,          -- the figures the person was shown
  note       text not null default '',
  created_at timestamptz not null default now()
);
alter table public.product_reports enable row level security;
create policy "report as yourself" on public.product_reports
  for insert to authenticated
  with check ((select auth.uid()) = user_id and length(note) <= 500 and length(product) <= 100 and length(name) <= 200 and length(brand) <= 100 and pg_column_size(shown) <= 2000);
create policy "read own reports" on public.product_reports
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.product_reports from anon, authenticated;
grant select, insert on public.product_reports to authenticated;

# Data model

## What the prototype stores today

Per user, as documents written through `Store.put(kind, id, data)`:

| Kind | Id | Contents |
|---|---|---|
| `profile` | none | `P`: body details, targets, XP, gems, streak, achievements, settings, training plan, plus three growing lists: `hist` (one summary per day), `wts` (weigh-ins), `rec` (recent foods with last amount) |
| `days` | `YYYY-MM-DD` | `{date, e: entries, w: water ml, x: exercise, q: quests, cf: caffeine, chest, done, zone, xp, lx, wx}` |
| `meta` | `train`, `gym` | training state `TR` (lifts, sessions index, rehab plans and log, readiness); gym prototype state `G` |
| `foods` | id | custom foods |
| `recipes` | id | recipes with items and method |
| `programs` | id | training programs the user made or copied |
| `sessions` | id | completed workouts |
| `photos`, `clphotos` | id | progress photo records (the image is an uploaded asset) |
| `cl` | id | a coach's client records |

A diary entry: `{id, n, b, g, k, p, c, f, fi, su, sf, na, m, u, q, us, sv, src, t, ports?, fid?, cf?, via?, liq?, nog?}`: name, brand, grams, nutrition for that amount, meal, display label, serving size, unit, servings, source code, time, and the food's portions so the amount can be edited later.

Shared between users (prototype only): `clients/{uid}`, `assign/{uid}`, `squad/{uid}`, `reviews/{uid}`, `coach/profile`.

In local mode the same documents live in `localStorage` under `ember:<kind>:<id>`.

## Phase 1 target: keep the document shape

The fastest safe port keeps documents as they are and changes only where they live. One table mirrors `Store`:

```sql
create table user_docs (
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null,
  id         text not null default '',
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table user_docs enable row level security;
create policy "own rows" on user_docs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

`Store.get`, `list`, `put` and `del` map one to one onto this table. Nothing else in the app needs to know.

Also in Phase 1:

- a private Storage bucket for progress photos, path `user_id/photo_id.jpg`, read through signed URLs
- `ai_usage (user_id, day, calls, tokens)` so free limits can be enforced on the server

## What to split out later, and why

Move a field out of JSON only when something needs to query it:

| When | Split out | Reason |
|---|---|---|
| Before the profile gets large | `day_summaries (user_id, date, kcal, protein, …, recovery, strain, sleep)` and `weights (user_id, date, kg)` from `P.hist` and `P.wts` | charts and coach views read ranges; the profile stops growing |
| Phase 3 | `products (barcode, name, brand, per-100 values, serving, pack, source, checked_at)` | live lookups get cached and shared between users; search moves to the database |
| Coach phase | `coach_clients`, `assignments`, `messages`, `shared_photos` | access between two accounts needs real policies, not shared documents |
| Gym phase | `gyms`, `gym_staff`, `memberships`, `classes`, `class_sessions`, `bookings`, `payments` | bookings need constraints (capacity, no double booking) and Stripe records |

## Rules for any table holding user data

- Row-level security on, with a policy test for each table: a second user must get nothing.
- Health and body data stays in an EU region.
- Account deletion removes rows and stored photos. Export returns everything as JSON.
- The service-role key is used only inside server functions.

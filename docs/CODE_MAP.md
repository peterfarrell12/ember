# Code map of the prototype

Everything in `prototype/` is the app as last published inside Claude on 18 November 2026.

## How it is built

`scripts/build.py` joins `src/shell.html`, `src/style.css` and every `src/0*.js` file, in name order, into one page: `app/index.html`. All the JavaScript sits inside a single function, so **every file shares one scope** and a file can only use what an earlier file declared at load time. The three food data files sit beside the page and are fetched on demand.

The code is dense: long lines, short names, no modules, no types. It works and it is tested, but Phase 0 of the build plan formats it and gives it module boundaries before anything else is added.

## Files

| File | Size | What it holds |
|---|---|---|
| `shell.html` | 10 KB | page skeleton, header chips, tab bar, icon sprite, hidden file inputs |
| `style.css` | 58 KB | all styling; colour and type tokens as CSS variables; light and dark |
| `01-core.js` | 18 KB | helpers, `LS` (localStorage), `Store` (cloud or local persistence, write queue), default profile `P`, day shape, targets maths |
| `02-foods.js` | 34 KB | food database loading and search, branded matching (`brandFind`, `matchItem`, `matchAll`), `AI` wrapper, photo and text parsing prompts, label reading, recents (`remember`, `lastUse`) |
| `03-ui.js` | 15 KB | `render()`, sheets (`openSheet`, `closeSheet`), toasts, menus, celebrations, icons |
| `03b-home.js` | 16 KB | Today screen: calorie gauge, next-up card, one-tap usuals, meals, trackers, quests |
| `04-flows.js` | 63 KB | actions and inputs (`A`, `I`, `SEG`), amounts and units, food sheet, entry editor, describe-by-voice, review sheet, recipes, custom foods, targets, boot |
| `04b-add.js` | 12 KB | the Add sheet: search, tabs, quick add, footer |
| `05-plus.js` | 68 KB | exercise logging, weight and progress, imports, wearable sync, barcode, photo logging, "what can I eat" chef ideas, AI coach |
| `05c-caffeine.js` | 20 KB | drinks, milks, caffeine tracking linked to diary entries |
| `06-traindata.js` | 29 KB | exercise library, program templates, rehab protocols |
| `07-train.js` | 48 KB | programs, live workout, sets and rest timer, personal records, rehab sessions, readiness check-in |
| `07b-trainplus.js` | 11 KB | warm-up and interval timers, extras |
| `07c-trainview.js` | 12 KB | Train tab layout, week strip, hero states |
| `07d-calendar.js` | 24 KB | plan and month calendar, training days, moving and skipping sessions, events |
| `08-coach.js` | 29 KB | header and navigation for athlete, coach and gym views; coach home; publishing a client's status |
| `08b-community.js` | 16 KB | squad and reviews |
| `08c-demo.js` | 15 KB | sample coach catalogue, labelled as sample |
| `08d-clients.js` | 24 KB | coach's client workspace |
| `08e-chat.js` | 10 KB | coach and client messaging |
| `08f-photos.js` | 13 KB | progress photos, compare slider, sharing with a coach |
| `08g-assistant.js` | 24 KB | voice assistant: conversation, confirmations, the actions it can take |
| `08h-gym.js` | 39 KB | gym prototype: sample gym, classes, bookings, register, members |
| `08i-user.js` | 15 KB | body card (recovery, strain, sleep), sample-data preview, rest-day guidance, You page |
| `09-boot.js` | 0.1 KB | calls `boot()` |

## Patterns to know

- **Events:** one delegated listener. `data-act="name"` calls `A.name(dataset)`. `data-on="name"` calls `I.name(element)` on input. Segmented controls come from `segHtml(name, options, value)` and call `SEG.name(value)`.
- **Sheets:** bottom sheets stack. `openSheet(html)`, `closeSheet(n)`, `closeAll()`, `sh(title)` for the header.
- **Rendering:** `render()` rebuilds the current tab from state as an HTML string. No virtual DOM. Sheets update the parts they own.
- **State:** `P` is the profile. `S` holds the session: `S.date`, `S.days[date]`, `S.foods`, `S.recipes`, `S.progs`. `TR` is training data. `G` is the gym. Each sheet keeps a small module-level object while open (`FD` food sheet, `REV` review, `ADD` add sheet, `CAL` calendar, and so on).
- **Saving:** `commitDay(day)` and `saveProfile()` call `Store.put(kind, id, data)`. Writes are queued per document, last write wins.
- **Sample preview:** `A.preview` swaps `P`, `S.days` and `TR` for clones filled with sample data and sets `DEMO`; while `DEMO` is set `Store.put` and `Store.del` do nothing.

## Food data

Three JSON files, each one array of rows:

- `foods-generic.json`: about 13,000 USDA foods. Row: `[name, kcal, protein, carbs, fat, fibre, sugars, saturates, sodium_mg, portions, source]`, all per 100 g. `portions` is `[[label, grams], ...]`. Some portion labels are US-centric or wrong; `unitsFor` in `04-flows.js` filters them.
- `foods-brands.json` (about 42,000) and `foods-brands-more.json` (about 72,000): labelled products from Open Food Facts, weighted to Ireland and the UK. Row: `[name, brand, kcal, protein, carbs, fat, fibre, sugars, saturates, salt_g, serving_g, pack_g, barcode, popularity]`. Negative means unknown. Drinks are per 100 ml.

The scripts that made these are in `prototype/data-pipeline/` for reference. They have hard-coded paths and the raw downloads are not in the repo.

**Matching a described or photographed product** (`02-foods.js`): Claude names the brand and the product words. `brandFind` takes every row for that brand, weights each product word by how rare it is within the brand, penalises candidates carrying variant words the description lacks (zero, light, diet), and returns a sure match, a shortlist, or nothing. `matchAll` sends shortlists to Claude in one quick call. With no match, Claude's own figures are used and labelled Estimate or Recalled. `test/b1.py` prints the outcome for 38 real products.

**Amounts** (`04-flows.js`): `unitsFor(food)` builds the unit list: g or ml, the food's portions, drink sizes, spoonfuls, weighed-raw conversions, and convert-from units. An amount is serving size × unit × number of servings. Entries store `q`, `us`, `sv` and the display label `u`.

## Claude calls

All go through `AI.sample(prompt, opts)` (text back) or `AI.sample.json(prompt, opts)` (parsed JSON back). Options used: `images` (photos as blobs), `onText` (streaming), `modelTier` (`quick` or `default`), `cache`. References by file (calls and availability checks): `02-foods.js` 9, `04-flows.js` 5, `05-plus.js` 14, `07-train.js` 5, `08-coach.js` 2, `08e-chat.js` 2, `08g-assistant.js` 3. Prompts are built in the client today.

Errors arrive as `{code, message}`; `AI_MSG` in `02-foods.js` maps codes to wording.

## Tests

`prototype/test/` holds Python Playwright scripts. Each opens the built page against `python3 -m http.server 8765`, with three injected scripts:

- `mock.js` fakes `window.claude`: a `db` backed by `localStorage` key `mockdb`, a `user`, and a scripted `sample` whose answers depend on words in the prompt
- `seed.js` and `seed3.js` create a month of history, recents and yesterday's diary
- `ff/` and `zx/` hold local copies of the two libraries the app loads from unpkg at runtime (fflate for Apple Health exports, ZXing for barcodes on browsers without a built-in detector), so tests run offline. Bundle both properly in Phase 0

The tests print what they see. `run-tests.sh` compares each test's printed output with a stored baseline in `test/golden/<name>.txt`, so a run passes only when it finishes with no traceback and prints exactly what it printed before. When a change is meant to alter what a test prints, run `prototype/run-tests.sh --update <name>`, read the diff of the baseline file, and commit it with the change.

To make the output repeatable, `test/harness.py` gives every browser context a fixed start time (Thursday 19 November 2026, 09:42; time then runs at normal speed) and a seeded `Math.random`. `test/normalise.py` masks the few values that still vary: timings, the clock-derived tail of ids, seconds in saved timestamps, and the sample gym's attendance figures.

| Test | Covers |
|---|---|
| `t1`, `t2` | logging by search, voice text, photo; recipes; barcode; custom food from a label; editing an entry |
| `t4` | barcode decoding from an image |
| `t5` | weight, progress, wearable setup and sync against a fake connector |
| `t6` | live workout, rest timer, hold, resume and draft restore, progression tip, AI and custom programs, rehab, routines, tasks. Moves the clock on a day twice, because the Train tab has no link to the program once today's session is done |
| `t8`, `t9` | coach view, clients, squad, catalogue, reviews |
| `t7` | older coach walkthrough; stops at a step written for an older layout. **Stale** |
| `t10`, `t13` | caffeine and drinks, linked calories |
| `t11` | Today usuals and undo (needs a morning clock, which the fixed test time provides) |
| `t14`, `t26` | calendar, training days, rest-day view on Train |
| `t15` | messaging and progress photos |
| `t16` | voice assistant |
| `t17`, `t22` | photo logging, label reading, branded matching |
| `t18` | gym view |
| `t19`, `t20`, `t21` | targets with revert, chef ideas, calorie fit |
| `t23`, `t25` | top bar, You page, sample preview, body card, light and dark |
| `t24`, `t27` | units, serving size and number of servings, entry editor |
| `b1` | prints branded matching results for 38 products |

`t3`, `t6b` and `t12` are older layout checks kept for reference.

The core set that `run-tests.sh` runs by default is every test in the table except `t7`, 25 in all. `t7` is still stale and belongs to the coach phase. `t1` reports two blocked font requests, which is the test blocking Google Fonts on purpose.

## Known gaps in the prototype

- Only ever tested in simulated Chrome with a scripted Claude. Real Claude answers, real photo uploads, real wearable sync and spoken replies on a phone are untested.
- `P` (the profile) also carries history summaries, weights and recents, so it grows without limit.
- Coach and gym features rely on shared documents that only work between members of one Claude organisation. They need a real multi-user backend.
- No reminders, no payments, no offline handling beyond the write queue.
- No live internet lookup for products missing from the lists.

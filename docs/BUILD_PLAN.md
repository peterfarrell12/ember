# Build plan

Goal: a functional MVP of Ember for the everyday user, on the web first, then in the App Store and Play Store. Coach and gym come after.

Work the phases in order. Each ends with the app working end to end and the checks passing. Where a line says **verify**, look up the current terms or documentation first: those facts were written from memory in November 2026 and may have moved.

## Target stack

| Part | Choice | Why |
|---|---|---|
| App | the existing interface as ES modules, built with Vite | keeps every screen; no rewrite |
| Accounts, database, files | Supabase (EU region) | auth, Postgres with row-level security, storage and server functions in one place |
| Claude | Anthropic API, called only from a server function | key stays off the device; limits enforced per user |
| Food data | bundled lists plus live Open Food Facts lookup | instant search offline; new products found online |
| Phone | Capacitor for iOS and Android | wraps the web app; plugins for push, camera, health data |
| Hosting | any static host with a CDN | the app is static files plus Supabase |
| Payments | Stripe, in the coach and gym phases only | not needed for the free app |

---

## Phase 0: repo and tooling

Make the prototype a normal project without changing what it does.

- Create `web/` with Vite. Turn the numbered files into ES modules, keeping load order. Start with explicit imports and exports for what each file uses from earlier ones; do not restructure logic yet.
- Format with Prettier. Add ESLint with a light rule set. Add `// @ts-check` and JSDoc types to `Store`, the entry and food shapes and the amount functions first.
- Keep the Python Playwright tests running against the Vite build, or port them to Playwright for Node one at a time. Turn the most important printed checks into assertions (food matching, amounts, entry editing, calendar).
- Add CI that builds and runs the core tests on every push.
- Put coach and gym entry points behind a `features` flag, off by default.

**Done when:** `web/` builds; the app looks and behaves the same as `prototype/app/index.html` at 320 and 390 px in light and dark; core tests pass in CI.

## Phase 1: accounts and sync

- Supabase project in an EU region. Email sign-in with a magic link to start. Apple and Google sign-in can wait for Phase 5.
- Table `user_docs` and policies from `docs/DATA_MODEL.md`. Write a test that a second account cannot read or write the first account's rows.
- New `Store` backend for Supabase beside the local one. Keep the per-document write queue. Add retry with backoff and an offline state: writes made offline are kept locally and sent on reconnect.
- First sign-in on a device that already has local data: offer to move it into the account.
- Sign-out, account deletion (rows and photos) and data export.
- Progress photos to a private bucket with signed URLs.

**Done when:** two browsers signed in as the same person show the same diary within a few seconds; airplane-mode logging syncs on reconnect; the policy test passes; deletion leaves no rows or files.

## Phase 2: Claude on the server

- One server function, `ai`, that checks the session, applies per-user limits, calls the Anthropic API and streams the reply back. Map `modelTier: 'quick'` to the current small model and `'default'` to the current mid model. **Verify** model ids and vision limits in the Anthropic docs.
- Client shim so `AI.sample(prompt, opts)` and `AI.sample.json` keep their shape: text, JSON, streaming through `onText`, photos, error codes.
- **Step one** may forward prompts built in the client, protected by sign-in, a daily cap per user and a token ceiling. This is acceptable for a closed test group only.
- **Step two, before any public launch:** move prompts to the server as named tasks (`parse_text`, `parse_photo`, `read_label`, `pick_product`, `chef_ideas`, `assistant_turn`, and so on) so the function only accepts task inputs, never free prompts. Otherwise any signed-in user can use the endpoint as a free Claude proxy.
- **Product lookup with web search:** when a branded product has no match in the lists, call Claude with the web search tool to find the maker's or retailer's nutrition table, return per-100 figures with the source link, show them labelled with the source, and let the user save the product. **Verify** the web search tool's current name and pricing.
- Dictation: Web Speech API where the browser has it; hide the mic where it does not. Spoken replies: `speechSynthesis`.
- Record calls and tokens per user per day in `ai_usage`.

**Done when:** text, voice and photo logging, label reading, chef ideas and the assistant all work against the real API; a product missing from the lists comes back with figures and a source link; hitting the daily cap shows a clear message; no key appears in the built client.

## Phase 3: food data that stays current

- Barcode: scan with the device camera. On a miss in the bundled lists, look the code up live on Open Food Facts, show the product, and cache it. **Verify** their API rules: an identifying User-Agent, rate limits, and the database licence (ODbL) with its attribution and share-alike terms.
- `products` table for cached lookups, user-added products and corrections, searched together with the bundled lists.
- A "this is wrong" action on any product that stores a correction for that user and flags it for review.
- Serve the three bundled lists with long cache headers and load them in a web worker so search never blocks typing.

**Done when:** scanning a product that is not in the bundled lists logs it with label figures in a few seconds; the second scan is instant; search stays responsive on a mid-range phone.

## Phase 4: web release to a test group

- Deploy to a domain. Installable to the home screen with an icon and splash screen. Service worker caches the app shell and the food lists.
- Privacy policy, terms and consent on sign-up. Ember stores health-related data about people in the EU, which GDPR treats as a special category; the owner needs proper advice on wording and lawful basis. Claude is not a lawyer and should not write these as final.
- Error reporting that excludes diary contents and photos.
- An onboarding pass with real first-time users.

**Done when:** 10 to 20 invited people can sign up from a link, log food for a week and their data survives a phone change. **This is the functional MVP.**

## Phase 5: App Store and Play Store

- Add Capacitor. Fix safe areas, keyboard behaviour, back gesture and file inputs inside the native shell. Auth redirects need app links, not web-only redirects.
- Reminders through native push (APNs and FCM): meal nudges, streak at risk, session today. Web push inside the iOS shell is not dependable.
- Native barcode scanner and camera. Native speech recognition for the assistant.
- Apple Health and Health Connect: read weight, workouts, steps, sleep and heart-rate variability; write nutrition if the owner wants it. **Verify** current plugin choice and Apple's rules on health data use.
- Sign in with Apple alongside any other social sign-in. **Verify** the current App Store guideline.
- Store listing, screenshots, privacy labels, TestFlight and internal testing track. Apple rejects apps that are only a wrapped website, so push, camera and health data need to be in the first submission.
- Costs to the owner: Apple Developer Program (US$99 a year) and Google Play registration. **Verify** both.

**Done when:** TestFlight and Play internal builds are in testers' hands with reminders, scanning and health data working.

## Phase 6: wearables

- WHOOP through its OAuth API: recovery, strain, sleep, workouts. A new WHOOP app is limited to a small number of members until WHOOP approves it, so apply at the start of Phase 5. **Verify** the limit and the review process.
- Garmin through its health API, which needs an application to Garmin's developer programme. **Verify**.
- Or one aggregator service covering many devices for a monthly fee. Put both options and prices to the owner.
- Fill the body card, readiness and exercise from real data. The sample preview stays, labelled as sample.

## Phase 7: coach

Real second accounts. Invitations, client list, assignments, messaging, shared photos, check-ins. Tables and policies per `docs/DATA_MODEL.md`. Coach subscriptions through Stripe.

## Phase 8: gym

Classes, capacity, bookings, waitlists, memberships, register, member app view, Stripe payments and payouts. This is the product meant to compete with gym management software and deserves its own plan when it starts.

---

## Open decisions for the owner

1. **Free AI limits.** Every photo and voice log costs money. What does a free user get per day, and what happens after?
2. **Sign-in methods** for the test group and for launch.
3. **Wearables:** direct integrations or an aggregator, and which device first.
4. **Privacy policy and consent**, with proper advice.
5. **Name, domain and store listing.**
6. **When coach and gym start** relative to the public launch of the free app.

## Accounts the owner needs to create

GitHub repository, Supabase project (EU region), Anthropic API account with a spending limit, a domain, a static host, and later Apple Developer, Google Play, WHOOP developer and Stripe accounts.

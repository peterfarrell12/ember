# Ember

Ember is a calorie, training and coaching app with game mechanics (streaks, XP, quests). Owner: Peter Farrell, Castlerea, Ireland. First users are Irish and UK.

This repo starts from a working prototype that ran as a single HTML page inside Claude. The job now is to turn it into a real product: real accounts, a real database, Claude called from a server, and App Store and Play Store builds.

Read these before changing anything:

- `docs/BUILD_PLAN.md`: the phases, in order, with checks for each
- `docs/CODE_MAP.md`: how the prototype is put together
- `docs/DATA_MODEL.md`: what is stored today and where it goes

## What matters most

1. **Port, do not redesign.** The interface and behaviour in `prototype/` were tuned over many rounds with the owner. Keep screens, wording and flows as they are unless a phase says otherwise. No framework migration in the MVP.
2. **Everyday user first.** The free, single-user app (food, training, calendar, assistant) is the MVP. Coach and gym screens exist in the prototype but stay behind a flag until their phase.
3. **Keep the tests green.** `prototype/run-tests.sh` runs the browser tests. Run it before and after each change to food matching, amounts, the calendar or the Train tab.
4. **Small steps.** One phase at a time. Each phase ends with the app working end to end.

## Rules the owner has set

- **Nothing fake presented as real.** Sample data is labelled as sample. No invented reviews. A figure Claude estimated is labelled Estimate; one recalled from memory is labelled Recalled; only database or label figures look verified.
- **Rehab and health content is general guidance**, never diagnosis.
- **Progress photos are private by default.** Sharing with a coach is opt-in per photo.
- **Design:** premium and restrained. No emoji in the interface, no decorative gradients, nothing that looks machine-generated. The floating voice button stays bottom right above the tab bar.
- **Check every screen at 320 px and 390 px wide, in light and dark.**
- **Locale:** metric, kcal, pints for beer, Irish and UK products and portion sizes.

## Commands

```bash
python3 prototype/scripts/build.py     # joins prototype/src into prototype/app/index.html
cd prototype/app && python3 -m http.server 8765   # then open http://localhost:8765
prototype/run-tests.sh                 # build, serve, run the core browser tests
prototype/run-tests.sh t22 t27         # run named tests
prototype/run-tests.sh --update t22    # rewrite a test's baseline after an intended change; read the diff
```

Tests need Python 3, Node, `pip install playwright pillow` and Google Chrome.

The product is built in `web/`. It starts from a copy of the prototype's source and is built with Vite:

```bash
cd web && npm ci
npm run dev          # serves the app on http://localhost:8765 with live reload
npm test             # builds, then runs the same browser tests against the build
npm run lint         # ESLint
npm run typecheck    # TypeScript over the files that opt in with // @ts-check
npm run format       # Prettier
```

`prototype/` is now a frozen reference: do not change its source. Where the web app is meant to behave differently from the prototype, the difference is recorded as a test baseline in `prototype/test/golden/web/`.

Everyone signs in before using the web app (owner's decision): signed out, the only screen is the sign-in screen. The browser tests ask for the old device-only mode with the `localStorage` key `ember:device-only`; accounts are tested in `supabase/tests/`.

Coach and gym are behind `FEATURES` in `web/src/app/01-core.js`, off by default. With a flag off, the entry points are hidden, the actions do nothing and the shared documents are neither read nor written. `web/src/app/08z-features.js` lists the gated actions.

The prototype runs without Claude: with no `window.claude` it stores everything in `localStorage` and hides the AI features. That makes it a usable reference at every stage.

## The platform seams

Everything the prototype got from the Claude page runtime comes through `window.claude.use(name)`. These seven are the whole porting surface:

| Prototype | Used for | Replace with |
|---|---|---|
| `db` + `user` | per-user documents, shared coach and gym data, who is signed in | Supabase Auth and Postgres with row-level security |
| `sample` | every Claude call, text and photo (referenced in about 40 places) | a server function that calls the Anthropic API; key never in the client |
| `dictation` | speech to text for logging and the assistant | Web Speech API on the web, a native speech plugin under Capacitor |
| `tts` | spoken assistant replies | `speechSynthesis` (already the fallback) or a native plugin |
| `assets` | progress photo upload | Supabase Storage, private bucket, signed URLs |
| `mcp` (athletedata) | wearable sync | direct WHOOP and Garmin integrations, Apple Health on device |

Storage already goes through one object, `Store` in `prototype/src/01-core.js`. Claude calls already go through `AI.sample` in `prototype/src/02-foods.js`. Swap those two and most of the app follows.

## Do not

- put an API key, service-role key or any secret in client code or in git
- ship an open Claude proxy to the public: see Phase 2 in the build plan
- remove the Estimate, Recalled, Label and Sample markers
- change food matching (`brandFind`, `matchItem`, `matchAll`) without running `b1.py`, `t22` and `t17`
- add analytics or third-party trackers without asking the owner
- store health data outside the EU region without asking the owner

## Decisions that are the owner's, not yours

Ask before settling any of these: pricing and free AI limits, sign-in methods, the privacy policy and consent wording, which wearables come first, app name and store listing, anything that costs money each month.

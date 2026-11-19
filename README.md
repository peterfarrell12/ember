# Ember

A calorie, training and coaching app with streaks, XP and quests. This repo holds the working prototype and the plan for turning it into a real product.

## What is here

```
CLAUDE.md             brief for Claude Code: rules, commands, what to replace
docs/BUILD_PLAN.md    the phases, in order, with checks
docs/CODE_MAP.md      how the prototype is put together, and its tests
docs/DATA_MODEL.md    what is stored today and the target database
prototype/
  src/                the app source: shell.html, style.css, numbered .js files
  app/                the built page (index.html) and the three food data files
  scripts/build.py    joins src/ into app/index.html
  test/               browser tests, a stand-in for Claude, seed data, fixtures
  data-pipeline/      the scripts that made the food data (reference only)
  run-tests.sh        build, serve and run the tests
```

## Try the prototype

```bash
python3 prototype/scripts/build.py
cd prototype/app && python3 -m http.server 8765
```

Open http://localhost:8765 on a phone-sized window. Outside Claude it keeps data in the browser and hides the AI features (photo, voice, assistant, chef ideas). Search, logging, amounts, training, calendar and the sample preview all work.

## Run the tests

```bash
pip install playwright pillow      # once; Google Chrome must be installed
prototype/run-tests.sh
```

## Start in Claude Code

1. Create an empty private GitHub repository and push this folder to it.
2. Open the repository in Claude Code.
3. First message:

> Read CLAUDE.md and everything in docs/. Then build and run the prototype tests to confirm your environment works. Do not change any code yet. Tell me what you found, anything in the plan you disagree with, and what you need from me before Phase 0.

4. Work through `docs/BUILD_PLAN.md` one phase at a time. Start each phase by asking for a short plan and approve it before code is written.

## State of the prototype

Published inside Claude on 18 November 2026. Tested only in simulated Chrome with scripted Claude answers. Not yet tested with real Claude calls, real photo uploads or real wearable data outside the Claude page it was built in. See "Known gaps" in `docs/CODE_MAP.md`.

Food data comes from USDA FoodData Central and Open Food Facts. Open Food Facts data carries its own licence terms; check them before launch.

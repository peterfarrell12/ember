"""Shared test setup: every browser context gets a fixed start time and a seeded Math.random.

The tests print what they see and run-tests.sh compares that with a stored baseline, so the
output has to be the same on every run and every day. Time starts at NOW and then runs at
normal speed, so timers and waits behave as usual.

Tests import async_playwright from here instead of from playwright.async_api.
"""
import datetime, os, sys
from playwright.async_api import async_playwright, Browser, BrowserContext  # noqa: F401  (re-exported)

NOW = datetime.datetime(2026, 11, 19, 9, 42, 0)   # a Thursday morning, before the 11:00 cut-off t11 relies on, and off the hour and half hour when sample classes start
TODAY = NOW.date()

# mulberry32: a small seeded generator, so ids and sample data are the same on every run
SEEDED_RANDOM = """(() => { let a = 0x9e3779b9; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();"""

# Coach and gym are switched off in the web app until their phase (FEATURES in web/src/app/01-core.js).
# These tests are about those screens, so they switch them on. Every other test runs as a new user would see the app.
# The prototype has no such switch and ignores the key.
FEATURE_TESTS = {'t7', 't8', 't9', 't10', 't15', 't16', 't18'}
FEATURES_ON = """try { localStorage.setItem('ember:features', JSON.stringify({ coach: true, gym: true })); } catch (e) {}"""

# The web app asks everyone to sign in before using it. These tests are about the app itself, not accounts,
# so they ask for the device-only mode instead (accounts are covered by supabase/tests/account.e2e.mjs).
# Tests that load mock.js are unaffected either way; the prototype ignores the key.
DEVICE_ONLY = """try { localStorage.setItem('ember:device-only', '1'); } catch (e) {}"""

_new_context = Browser.new_context


async def new_context(self, *args, **kwargs):
    ctx = await _new_context(self, *args, **kwargs)
    await ctx.clock.install(time=NOW)
    await ctx.add_init_script(SEEDED_RANDOM)
    await ctx.add_init_script(DEVICE_ONLY)
    if os.path.splitext(os.path.basename(sys.argv[0]))[0] in FEATURE_TESTS:
        await ctx.add_init_script(FEATURES_ON)
    return ctx


async def new_page(self, *args, **kwargs):
    ctx = await new_context(self, *args, **kwargs)
    return await ctx.new_page()


# Every prompt the app sends to the stand-in for Claude is written to out/<test>.prompts, one per line,
# with clock-derived parts left in (the clock is fixed). Compare the files before and after a change that
# is not meant to alter any prompt.
_ctx_new_page = BrowserContext.new_page
_test = os.path.splitext(os.path.basename(sys.argv[0]))[0]


async def ctx_new_page(self, *args, **kwargs):
    pg = await _ctx_new_page(self, *args, **kwargs)
    os.makedirs('out', exist_ok=True)
    log = open(os.path.join('out', _test + '.prompts'), 'a', encoding='utf-8')

    def on_console(m):
        if m.text.startswith('EMBER_PROMPT '):
            log.write(m.text[len('EMBER_PROMPT '):] + '\n')
            log.flush()

    pg.on('console', on_console)
    return pg


BrowserContext.new_page = ctx_new_page
Browser.new_context = new_context
Browser.new_page = new_page


async def open_chat(pg):
    """Tap the talk button and end up in the assistant's chat.
    In the prototype the button opens the chat. In the web app it opens the voice panel over the screen,
    and the chat is one tap further (covered on its own by web/test/browser/voice.e2e.mjs)."""
    await pg.click('#asFab')
    await pg.wait_for_selector('#asBody .bub, [data-act="voChat"]')
    if await pg.query_selector('[data-act="voChat"]'):
        await pg.click('[data-act="voChat"]')
    await pg.wait_for_selector('#asBody .bub')


async def start_tracking(pg):
    """Get through the first-run targets sheet and press Start tracking.
    The prototype opens it filled in (30, 178 cm, 80 kg, male); the web app opens it empty and asks for real
    numbers. Typing those same four details gives the same targets in both."""
    await pg.wait_for_selector('#tgBody')
    await pg.click('#tgBody button:has-text("Male")')
    for k, v in (('age', '30'), ('cm', '178'), ('kg', '80')):
        await pg.fill(f'#tgBody [data-k="{k}"]', v)
    await pg.click('[data-act="saveTargets"]')


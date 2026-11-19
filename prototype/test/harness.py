"""Shared test setup: every browser context gets a fixed start time and a seeded Math.random.

The tests print what they see and run-tests.sh compares that with a stored baseline, so the
output has to be the same on every run and every day. Time starts at NOW and then runs at
normal speed, so timers and waits behave as usual.

Tests import async_playwright from here instead of from playwright.async_api.
"""
import datetime
from playwright.async_api import async_playwright, Browser  # noqa: F401  (re-exported)

NOW = datetime.datetime(2026, 11, 19, 9, 42, 0)   # a Thursday morning, before the 11:00 cut-off t11 relies on, and off the hour and half hour when sample classes start
TODAY = NOW.date()

# mulberry32: a small seeded generator, so ids and sample data are the same on every run
SEEDED_RANDOM = """(() => { let a = 0x9e3779b9; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();"""

_new_context = Browser.new_context


async def new_context(self, *args, **kwargs):
    ctx = await _new_context(self, *args, **kwargs)
    await ctx.clock.install(time=NOW)
    await ctx.add_init_script(SEEDED_RANDOM)
    return ctx


async def new_page(self, *args, **kwargs):
    ctx = await new_context(self, *args, **kwargs)
    return await ctx.new_page()


Browser.new_context = new_context
Browser.new_page = new_page

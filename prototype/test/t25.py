import asyncio, json
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        for dark in (False, True):
            ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
            for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
            pg = await ctx.new_page(); errs=[]
            pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
            await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
            await pg.goto(URL+'#train'); await pg.wait_for_selector('nav.tabs'); await cont(pg); await pg.click('nav.tabs [data-tab="train"]'); await pg.wait_for_timeout(500)
            if not dark:
                print('TRAIN as seeded:', (await pg.inner_text('main')).replace('\n',' | ')[:330])
                # make today a rest day: training days are every weekday except today
                await pg.click('#chipCal'); await pg.wait_for_selector('.sheet'); await pg.wait_for_timeout(300)
                print('has pattern button:', bool(await pg.query_selector('[data-act="calPat"]')))
            await pg.evaluate("window.__noop = 1")
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
            await pg.click('#chipYou'); await pg.wait_for_selector('.phero'); await pg.click('[data-act="preview"]'); await pg.wait_for_timeout(500); await cont(pg)
            # in the preview, tomorrow is a rest day: look at it through the Train tab on a rest day by moving today's session
            await pg.click('nav.tabs [data-tab="train"]'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'250-train-{"d" if dark else "l"}.png')
            await pg.click('nav.tabs [data-tab="today"]'); await pg.wait_for_timeout(400); await pg.evaluate("document.querySelector('main').scrollTo && window.scrollTo(0, 520)"); await pg.wait_for_timeout(200); await pg.screenshot(path=f'251-today-{"d" if dark else "l"}.png')
            print('dark' if dark else 'light', 'ERRS', errs); await ctx.close()
        await b.close()
asyncio.run(main())

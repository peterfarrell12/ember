import asyncio, json, datetime
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        wd = datetime.date.today().weekday(); days = sorted({(wd+1)%7, (wd+3)%7, (wd+5)%7})
        await pg.goto(URL+'#train'); await pg.wait_for_selector('.thero'); await cont(pg)
        await pg.click('[data-act="progs"]'); await pg.click('[data-act="tplView"][data-id="t-full3"]'); await pg.click('[data-act="progUse"]'); await pg.wait_for_timeout(300)
        print('NO DAYS SET:', (await pg.inner_text('.thero')).replace('\n',' | ')[:300])
        await pg.click('.th-links [data-act="cal"]'); await pg.wait_for_selector('#calBody .pwk'); await pg.click('[data-seg="calMode"] [data-val="month"]'); await pg.wait_for_selector('#calBody .calgrid')
        for d in days: await pg.click(f'.wds [data-wd="{d}"]'); await pg.wait_for_timeout(120)
        while await pg.query_selector('.scrim'): await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.wait_for_timeout(300); print('REST DAY:', (await pg.inner_text('.thero')).replace('\n',' | ')[:700]); await pg.screenshot(path='260-rest.png')
        sug = await pg.query_selector_all('.thero .th-sug'); print('suggestions:', len(sug), [await s.get_attribute('data-act') for s in sug])
        await pg.click('.thero [data-act="trainToday"]') if await pg.query_selector('.thero [data-act="trainToday"]') else None; await pg.wait_for_timeout(500)
        print('AFTER train today instead:', (await pg.inner_text('.scrim:last-child .sheet') if await pg.query_selector('.scrim') else await pg.inner_text('.thero')).replace('\n',' | ')[:260])
        print('ERRS', errs); await b.close()
asyncio.run(main())

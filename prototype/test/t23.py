import asyncio, json, sys
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390; DARK = len(sys.argv) > 2
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':W,'height':844}, device_scale_factor=2, color_scheme='dark' if DARK else 'light')
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        tag = f'{W}{"d" if DARK else ""}'
        print('TOP:', await pg.evaluate("[...document.querySelectorAll('header .chip, header button')].filter(e => e.offsetParent).map(e => e.id + ':' + e.innerText.trim()).join(' | ')"))
        print('body card before preview:', bool(await pg.query_selector('.card.body')))
        await pg.screenshot(path=f'230-today-{tag}.png')
        before = await pg.evaluate("localStorage.getItem('mockdb')")
        await pg.click('#chipYou'); await pg.wait_for_selector('.phero'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'231-you-{tag}.png', full_page=True)
        print('YOU:', (await pg.inner_text('main')).replace('\n',' | ')[:900])
        await pg.click('[data-act="preview"]'); await pg.wait_for_timeout(600); await cont(pg)
        print('banner:', (await pg.inner_text('.banner.demo')).replace('\n',' ') if await pg.query_selector('.banner.demo') else None)
        await pg.click('nav.tabs [data-tab="today"]'); await pg.wait_for_selector('.card.body'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'232-today-demo-{tag}.png', full_page=True)
        print('BODY:', (await pg.inner_text('.card.body')).replace('\n',' | '))
        await pg.click('.card.body'); await pg.wait_for_selector('.sheet'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'233-body-sheet-{tag}.png'); print('BODY SHEET:', (await pg.inner_text('.sheet')).replace('\n',' | ')[:500]); await pg.click('.sheet [data-act="close"]'); await pg.wait_for_timeout(350)
        await pg.click('nav.tabs [data-tab="train"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=f'234-train-demo-{tag}.png', full_page=True)
        print('TRAIN demo:', (await pg.inner_text('main')).replace('\n',' | ')[:800])
        await pg.click('#chipCal'); await pg.wait_for_selector('.sheet'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'235-cal-demo-{tag}.png'); print('CAL demo:', (await pg.inner_text('.sheet')).replace('\n',' | ')[:500]); await pg.click('.sheet [data-act="close"]'); await pg.wait_for_timeout(350)
        # logging while in preview must not save
        await pg.click('nav.tabs [data-tab="today"]'); await pg.wait_for_timeout(300)
        wb = await pg.query_selector('[data-act="water"]')
        if wb: await wb.click(); await pg.wait_for_timeout(1500)
        mid = await pg.evaluate("localStorage.getItem('mockdb')"); print('saved while previewing:', mid != before)
        await cont(pg); await pg.click('[data-act="previewOff"]'); await pg.wait_for_timeout(1800); await cont(pg)
        after = await pg.evaluate("localStorage.getItem('mockdb')"); print('db unchanged after exit:', after == before, '| banner gone:', not await pg.query_selector('.banner.demo'), '| body card gone:', not await pg.query_selector('.card.body'))
        print('ERRS', errs); await b.close()
asyncio.run(main())

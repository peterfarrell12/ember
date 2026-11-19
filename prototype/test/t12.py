import asyncio, sys
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def run(p, dark, w=390):
    b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':w,'height':844 if w>330 else 568}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
    for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
    pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    s = ('-d' if dark else '') + (f'-{w}' if w!=390 else '')
    await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
    await pg.click('.next [data-act="copyYesterday"]'); await cont(pg); await pg.click('[data-act="cafAskNo"]'); await pg.wait_for_timeout(300)
    for m in ('l','d'):
        await pg.click(f'.ml-add[data-meal="{m}"]'); await pg.wait_for_selector('.yrow'); await pg.click('.yrow [data-act="copyYesterday"]'); await cont(pg)
    await pg.wait_for_timeout(5500); await cont(pg); await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.screenshot(path=f'140-home{s}.png'); print('hero:', (await pg.inner_text('.hero2')).replace('\n',' | ')[:150])
    await pg.evaluate("document.querySelector('#main').scrollTop=99999"); await pg.wait_for_timeout(200); await pg.screenshot(path=f'141-home-end{s}.png')
    # push into the zone, then over
    await pg.click('.fab'); await pg.wait_for_selector('#addList .frow'); await pg.click('[data-act="quick"]'); await pg.fill('#qaK','560'); await pg.click('[data-act="quickGo"]'); await cont(pg); await pg.wait_for_timeout(2900); await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.screenshot(path=f'142-zone{s}.png'); print('zone:', (await pg.inner_text('.hero2')).replace('\n',' | ')[:150])
    await pg.click('.fab'); await pg.wait_for_selector('#addList .frow'); await pg.screenshot(path=f'143-add{s}.png'); await pg.click('[data-act="quick"]'); await pg.fill('#qaK','700'); await pg.click('[data-act="quickGo"]'); await cont(pg); await pg.wait_for_timeout(2900); await pg.screenshot(path=f'144-over{s}.png'); print('over:', (await pg.inner_text('.hero2')).replace('\n',' | ')[:150])
    print('overflow-x:', await pg.evaluate("document.querySelector('#main').scrollWidth - document.querySelector('#main').clientWidth"), 'errs', errs); await b.close()
async def main():
    async with async_playwright() as p:
        await run(p, False); await run(p, True); await run(p, False, 320)
asyncio.run(main())

import asyncio
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
def t(s, n=300): return s.replace('\n',' | ')[:n]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        await pg.evaluate("document.querySelector('[data-act=\"ideas\"]').scrollIntoView()"); await pg.click('[data-act="ideas"]'); await pg.wait_for_selector('#idBud'); print('auto:', await pg.inner_text('#idBud'))
        for m in ('b', 's', 'd'):
            await pg.click(f'[data-seg="idMeal"] [data-val="{m}"]'); await pg.wait_for_timeout(100); print(m, '->', await pg.inner_text('#idBud'))
        await pg.click('#idSizes [data-v="200"]'); await pg.wait_for_timeout(100); print('snack 200:', await pg.inner_text('#idBud')); await pg.screenshot(path='230-chef-size.png')
        await pg.click('[data-act="ideasGo"]'); await pg.wait_for_timeout(1500); pm = await pg.evaluate('window.__chef'); i = pm.index('Size: each dish'); print('PROMPT:', pm[i:i+520].replace('\n',' / '))
        print('card (asked 200, mock gives 508):', t(await pg.inner_text('.idea >> nth=0'), 230))
        await pg.click('#idSizes [data-v="600"]'); await pg.click('[data-act="ideasGo"] >> nth=0'); await pg.wait_for_timeout(1500); await pg.evaluate("document.querySelector('#ideasOut').scrollIntoView()"); await pg.wait_for_timeout(200); await pg.screenshot(path='231-chef-fit.png'); print('card (asked 600):', t(await pg.inner_text('.idea >> nth=0'), 230))
        await pg.click('#idSizes [data-v="all"]'); await pg.wait_for_timeout(100); print('all:', await pg.inner_text('#idBud'))
        print('ERRS', errs); await b.close()
asyncio.run(main())

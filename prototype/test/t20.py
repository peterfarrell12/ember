import asyncio, json
from playwright.async_api import async_playwright
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
        # log something first so "already eaten" has content
        await pg.click('.rail .chipf >> nth=0'); await pg.wait_for_timeout(600); await cont(pg)
        await pg.evaluate("document.querySelector('[data-act=\"ideas\"]').scrollIntoView()"); await pg.click('[data-act="ideas"]'); await pg.wait_for_selector('#idMoods'); await pg.wait_for_timeout(300); await pg.screenshot(path='220-chef.png')
        await pg.click('#idMoods [data-v="spicy"]'); await pg.fill('#idHave', 'half a chorizo'); await pg.fill('#idAvoid', 'mushrooms'); await pg.click('[data-act="ideasGo"]'); await pg.wait_for_timeout(1500)
        pm = await pg.evaluate('window.__chef'); i = pm.index('They want real heat'); print('PROMPT:', pm[i:i+820].replace('\n',' / '))
        await pg.evaluate("document.querySelector('#ideasOut').scrollIntoView()"); await pg.wait_for_timeout(200); await pg.screenshot(path='221-chef-ideas.png'); print('cards:', len(await pg.query_selector_all('.idea')), '|', t(await pg.inner_text('.idea >> nth=0'), 220))
        await pg.click('.idea [data-act="ideaCook"] >> nth=0'); await pg.wait_for_selector('#cookOut'); await pg.wait_for_timeout(500); await pg.screenshot(path='222-chef-recipe.png'); print('METHOD:', t(await pg.inner_text('#cookOut'), 200))
        await pg.click('[data-act="ideaSave"]'); await pg.wait_for_timeout(500); d = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); rs = [v for k, v in d.items() if '/recipes/' in k]; print('recipes:', [(r['n'], len(r['items']), bool(r.get('how'))) for r in rs])
        await pg.click('[data-act="close"] >> nth=-1'); await pg.click('#ideasOut [data-act="ideasGo"]'); await pg.wait_for_timeout(1400); pm2 = await pg.evaluate('window.__chef'); print('second ask avoids:', 'Already suggested' in pm2, '| leave out saved:', (d['data/users/u_test123/profile'].get('avoid')))
        await pg.click('.idea [data-act="ideaLog"] >> nth=1'); await pg.wait_for_selector('#revGo'); print('review:', await pg.inner_text('#revGo'))
        print('ERRS', errs); await b.close()
asyncio.run(main())

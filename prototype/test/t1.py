import asyncio, sys, json
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        pg = await ctx.new_page()
        errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL)
        await pg.wait_for_selector('#tgBody')
        await pg.screenshot(path='01-onboarding.png')
        await pg.click('#tgBody button:has-text("Male")'); await pg.fill('[data-k="age"]','34'); await pg.fill('[data-k="cm"]','183'); await pg.fill('[data-k="kg"]','86')
        print('target', await pg.input_value('#tgK'), await pg.input_value('#tgP'), await pg.input_value('#tgC'), await pg.input_value('#tgF'))
        await pg.click('[data-act="saveTargets"]')
        await pg.click('[data-act="celeNext"]')
        await pg.screenshot(path='02-today-empty.png')
        # add via search
        await pg.click('.fab'); await pg.wait_for_selector('#q')
        await pg.screenshot(path='03-add.png')
        await pg.fill('#q','banana'); await pg.wait_for_selector('#addList .res', timeout=15000)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='04-search.png')
        print('results', [await x.inner_text() for x in (await pg.query_selector_all('#addList .res .n'))[:6]])
        await pg.click('#addList .res >> nth=0'); await pg.wait_for_selector('#fdNut')
        await pg.screenshot(path='05-detail.png')
        await pg.click('#fdGo')
        await pg.wait_for_selector('.cele'); await pg.screenshot(path='06-streak.png')
        while await pg.query_selector('.cele'):
            await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(150)
        # describe with local parser
        await pg.click('[data-act="add"][data-meal="l"]'); await pg.click('[data-act="say"]')
        await pg.fill('#sayText','2 eggs, 150g chicken breast, a slice of wholemeal bread and porridge')
        await pg.screenshot(path='07-say.png')
        await pg.click('[data-act="sayGo"]'); await pg.wait_for_selector('#revBody .rev', timeout=20000)
        await pg.screenshot(path='08-review.png')
        print('review', [await x.inner_text() for x in await pg.query_selector_all('#revBody .rev .ell')])
        await pg.click('#revGo'); await pg.wait_for_timeout(400)
        while await pg.query_selector('.cele'):
            await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="water"][data-n="250"]')
        await pg.screenshot(path='09-today.png', full_page=False)
        await pg.evaluate("document.querySelector('#main').scrollTop=600"); await pg.screenshot(path='10-today-scrolled.png')
        await pg.click('[data-tab="quests"]'); await pg.screenshot(path='11-quests.png')
        await pg.evaluate("document.querySelector('#main').scrollTop=700"); await pg.screenshot(path='12-quests2.png')
        await pg.click('[data-tab="progress"]'); await pg.screenshot(path='13-progress.png')
        await pg.click('[data-tab="you"]'); await pg.screenshot(path='14-you.png')
        # persistence
        await pg.goto(URL+'#today'); await pg.reload(); await pg.wait_for_selector('.hero2')
        print('after reload eaten:', await pg.inner_text('.h-kv'))
        print('ERRS', errs)
        await b.close()
asyncio.run(main())

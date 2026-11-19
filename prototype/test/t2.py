import asyncio, json
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark')
        await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL); await pg.wait_for_selector('#tgBody')
        await pg.click('[data-act="saveTargets"]'); await cont(pg)
        print('sync class:', await pg.get_attribute('#sync','class'))
        # describe via AI + dictation
        await pg.click('.fab'); await pg.click('[data-act="say"]'); await pg.wait_for_selector('#micBtn')
        await pg.click('#micBtn'); await pg.wait_for_timeout(500); print('dictated:', await pg.input_value('#sayText'))
        await pg.screenshot(path='20-say.png')
        await pg.click('[data-act="sayGo"]'); await pg.wait_for_selector('#revBody .rev', timeout=20000); await pg.wait_for_timeout(400)
        rows = await pg.eval_on_selector_all('#revBody .rev', "els=>els.map(e=>e.innerText.replace(/\\n+/g,' | '))"); print('\n'.join(rows))
        await pg.screenshot(path='21-review.png')
        await pg.click('#revGo'); await pg.wait_for_selector('.cele'); await pg.wait_for_timeout(500); await pg.screenshot(path='22-cele.png'); await cont(pg)
        # barcode
        await pg.click('.fab'); await pg.click('[data-act="barcode"]'); await pg.fill('#bcNum','5099801003339'); await pg.click('[data-act="bcFind"]')
        await pg.wait_for_selector('#fdNut', timeout=20000); await pg.wait_for_timeout(300); await pg.screenshot(path='23-barcode-food.png')
        print('barcode food:', await pg.inner_text('.sheet-h h3 >> nth=-1'), '| units:', await pg.eval_on_selector('#fdUnit', 'e=>[...e.options].map(o=>o.text)'))
        await pg.click('#fdGo'); await cont(pg)
        # unknown barcode -> new food with label scan
        await pg.click('.fab'); await pg.click('[data-act="barcode"]'); await pg.fill('#bcNum','9990001112223'); await pg.click('[data-act="bcFind"]')
        await pg.wait_for_timeout(6000); await pg.screenshot(path='dbg.png'); print('bcOut:', await pg.inner_html('#bcOut')); await pg.wait_for_selector('#bcOut [data-act="newFood"]', timeout=3000); await pg.click('#bcOut [data-act="newFood"]'); await pg.wait_for_selector('#cfN')
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="labelPhoto"]')
        await (await fc.value).set_files('01-onboard.png'); await pg.wait_for_timeout(600)
        print('label ->', await pg.input_value('#cfN'), await pg.input_value('#cfK'), await pg.input_value('#cfSalt'), await pg.input_value('#cfSv'), await pg.input_value('#cfCode'))
        await pg.click('[data-act="saveFood"]'); await pg.wait_for_selector('#fdNut'); await pg.wait_for_timeout(300)
        print('custom food sheet:', await pg.inner_text('.sheet-h h3 >> nth=-1')); await pg.click('#fdGo'); await cont(pg)
        # recipe
        await pg.click('[data-tab="you"]'); await pg.click('[data-act="openRecipes"]'); await pg.click('[data-act="newRecipe"]'); await pg.fill('#reName','Chicken rice bowl'); await pg.fill('#reSv','2')
        for q in ['chicken breast grilled','rice white cooked']:
            await pg.click('[data-act="reAdd"]'); await pg.fill('#q',q); await pg.wait_for_selector('#addList .res'); await pg.click('#addList .res >> nth=0'); await pg.wait_for_selector('#fdQty')
            await pg.select_option('#fdUnit','0'); await pg.fill('#fdQty','300'); await pg.click('#fdGo'); await pg.wait_for_timeout(250)
        await pg.screenshot(path='24-recipe.png'); print('recipe per serving:', await pg.inner_text('#rePerK'))
        await pg.click('[data-act="saveRecipe"]'); await cont(pg)
        await pg.click('[data-tab="today"]'); await pg.click('[data-act="add"][data-meal="d"]'); await pg.click('[data-seg="addTab"] [data-val="recipes"]'); await pg.click('#addList .res >> nth=0'); await pg.wait_for_selector('#fdNut')
        print('recipe log units:', await pg.eval_on_selector('#fdUnit', 'e=>[...e.options].map(o=>o.text)'), await pg.inner_text('#fdNut .bigk')); await pg.click('#fdGo'); await cont(pg)
        # quick add, exercise, edit, weight
        await pg.click('[data-act="add"][data-meal="s"]'); await pg.click('[data-act="quick"]'); await pg.fill('#qaK','210'); await pg.click('[data-act="quickGo"]'); await cont(pg)
        await pg.click('[data-act="addExercise"]'); await pg.fill('#exMin','75'); print('padel 75min kcal:', await pg.input_value('#exK')); await pg.click('[data-act="saveExercise"]'); await cont(pg)
        await pg.click('.entry[data-act="editEntry"] >> nth=0'); await pg.wait_for_selector('#fdQty'); await pg.select_option('#fdUnit', index=0); await pg.fill('#fdQty','200'); await pg.click('#fdGo'); await cont(pg)
        await pg.click('[data-act="mealMenu"][data-meal="l"]'); await pg.wait_for_timeout(100); await pg.screenshot(path='25-menu.png'); await pg.click('.menu [data-act="copyYesterday"]'); await pg.wait_for_timeout(300)
        for i in range(12): await pg.click('[data-act="water"][data-n="250"]')
        await cont(pg)
        await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.wait_for_timeout(3000); await pg.screenshot(path='26-today-dark.png')
        await pg.click('[data-act="closeDay"]'); await pg.wait_for_selector('.cele'); await pg.wait_for_timeout(500); await pg.screenshot(path='27-close.png'); await cont(pg)
        await pg.click('[data-tab="progress"]'); await pg.click('[data-act="pview"][data-v="weight"]'); await pg.click('[data-act="addWeight"]'); await pg.fill('#wtKg','79.4'); await pg.fill('#wtD','2026-11-10'); await pg.click('[data-act="saveWeight"]'); await cont(pg)
        await pg.wait_for_timeout(3000); await pg.screenshot(path='28-progress-dark.png'); await pg.evaluate("document.querySelector('#main').scrollTop=560"); await pg.screenshot(path='29-progress2.png')
        await pg.click('[data-tab="quests"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='30-quests-dark.png'); await pg.evaluate("document.querySelector('#main').scrollTop=900"); await pg.screenshot(path='31-ach.png')
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))")
        print('db paths:', list(st.keys())); prof = st['data/users/u_test123/profile']
        print('xp', prof['xp'], 'gems', prof['gems'], 'hist', prof['hist'], 'st', prof['st'], 'writes', await pg.evaluate('window.__writes'))
        await pg.reload(); await pg.wait_for_selector('.lvl'); await pg.click('[data-tab="today"]'); await pg.wait_for_selector('.hero2'); print('reload kv:', (await pg.inner_text('.h-kv')).replace('\n',' '))
        print('ERRS', errs); await b.close()
asyncio.run(main())

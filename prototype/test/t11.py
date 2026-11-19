import asyncio, json, sys
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg, show=True):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        if show: print('  cele:', await pg.inner_text('.cele h3'))
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def day(pg):
    st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); ks=sorted(k for k in st if '/days/' in k); return st[ks[-1]], st
async def main():
    dark = len(sys.argv)>1
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        sfx = '-d' if dark else ''
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg, False); await pg.wait_for_timeout(600)
        await pg.screenshot(path=f'130-home-empty{sfx}.png'); print('NEXT:', (await pg.inner_text('.next')).replace('\n',' | ')); print('RAIL:', (await pg.inner_text('.rail-w')).replace('\n',' | ')[:300])
        # same again from the next card
        await pg.click('.next [data-act="copyYesterday"]'); await cont(pg); await pg.wait_for_selector('[data-act="cafAskYes"]'); await pg.click('[data-act="cafAskYes"]'); await pg.wait_for_timeout(400); d,_ = await day(pg); print('after same-again entries:', [(e['n'],e['m']) for e in d['e']])
        # rail one tap + undo
        n0=len(d['e']); await pg.click('.rail .chipf >> nth=1'); await pg.wait_for_timeout(500); d,_=await day(pg); print('rail add:', len(d['e'])-n0, '| toast:', (await pg.inner_text('#toasts')).replace('\n',' | '))
        await pg.click('#toasts [data-act="undoLog"]'); await pg.wait_for_timeout(500); d,_=await day(pg); print('after undo:', len(d['e'])-n0)
        await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.wait_for_timeout(2900); await pg.screenshot(path=f'131-home-logged{sfx}.png')
        print('HERO:', (await pg.inner_text('.hero2')).replace('\n',' | ')); nx = await pg.query_selector('.next'); print('NEXT2:', (await nx.inner_text()).replace('\n',' | ') if nx else None)
        # add sheet
        await cont(pg); await pg.click('.fab'); await pg.wait_for_selector('#addList .frow'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'132-add{sfx}.png')
        print('ADD default:', (await pg.inner_text('#addList')).replace('\n',' | ')[:400])
        await pg.click('[data-seg="addMeal"] [data-val="l"]'); await pg.wait_for_timeout(200); print('ADD lunch:', (await pg.inner_text('#addList')).replace('\n',' | ')[:330])
        await pg.screenshot(path=f'133-add-lunch{sfx}.png')
        await pg.click('#addList .yrow [data-act="copyYesterday"]') if False else None
        await pg.click('#addList .qadd >> nth=0'); await pg.wait_for_timeout(500); await pg.click('#addList .qadd >> nth=1'); await pg.wait_for_timeout(1400); await cont(pg, False)
        print('FOOT:', (await pg.inner_text('#addFoot')).replace('\n',' | '), '| left pill:', await pg.inner_text('#addLeft')); await pg.screenshot(path=f'134-add-foot{sfx}.png')
        d,_=await day(pg); print('lunch entries:', [(e['n'],e['u'],e['k']) for e in d['e'] if e['m']=='l'])
        await pg.click('[data-act="addUndo"]'); await pg.wait_for_timeout(500); d,_=await day(pg); print('after addUndo lunch:', [e['n'] for e in d['e'] if e['m']=='l'], '| foot:', (await pg.inner_text('#addFoot')).replace('\n',' | '))
        # search with quick add
        await pg.fill('#q','chicken breast'); await pg.wait_for_selector('#addList .frow', timeout=20000); await pg.wait_for_timeout(700); await pg.screenshot(path=f'135-add-search{sfx}.png'); print('SEARCH:', (await pg.inner_text('#addList')).replace('\n',' | ')[:300])
        await pg.click('#addList .qadd >> nth=0'); await pg.wait_for_timeout(600); print('FOOT2:', (await pg.inner_text('#addFoot')).replace('\n',' | '))
        # meal-like query
        await pg.fill('#q','2 eggs and toast with butter'); await pg.wait_for_selector('[data-act="sayQ"]'); await pg.wait_for_timeout(500); await pg.screenshot(path=f'136-add-meal{sfx}.png'); await pg.click('[data-act="sayQ"]'); await pg.wait_for_selector('#revGo', timeout=20000); print('REVIEW:', await pg.inner_text('#revGo')); await pg.click('[data-act="close"] >> nth=-1'); await pg.wait_for_timeout(200)
        # water from add
        await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.click('#addList .qadd >> nth=0'); await pg.wait_for_timeout(500); await cont(pg, False); await pg.click('[data-act="addOther"][data-k="water"]'); await pg.wait_for_timeout(400); d,_=await day(pg); print('water:', d['w'])
        await pg.click('#addFoot [data-act="close"]'); await pg.wait_for_timeout(300); print('sheets after Done:', len(await pg.query_selector_all('.scrim')))
        # detail path still works
        await pg.click('.ml-add[data-meal="d"]'); await pg.wait_for_selector('#addList .frow'); print('dinner usual:', (await pg.inner_text('#addList')).replace('\n',' | ')[:200]); await pg.click('#addList .res >> nth=0'); await pg.wait_for_selector('#fdGo'); print('detail btn:', await pg.inner_text('#fdGo')); await pg.click('#fdGo'); await cont(pg, False)
        await pg.wait_for_timeout(2900); await pg.screenshot(path=f'137-home-full{sfx}.png')
        for i in range(1,3): await pg.evaluate(f"document.querySelector('#main').scrollTop={i*620}"); await pg.wait_for_timeout(200); await pg.screenshot(path=f'13{7+i}-home-s{i}{sfx}.png')
        print('main h', await pg.evaluate("document.querySelector('#main').scrollHeight"))
        # pick mode has no quick add
        await pg.click('#chipYou'); await pg.click('[data-act="openRecipes"]'); await pg.click('[data-act="newRecipe"]'); await pg.wait_for_timeout(300)
        ing = await pg.query_selector('[data-act="reAdd"]') or await pg.query_selector('[data-act="recAdd"]'); print('ingredient btn found:', ing is not None)
        if ing:
            await ing.click(); await pg.wait_for_selector('#addList'); await pg.wait_for_timeout(300); print('pick mode: qadd', len(await pg.query_selector_all('#addList .qadd')), 'seg', len(await pg.query_selector_all('[data-seg="addMeal"]')), 'tiles', len(await pg.query_selector_all('#addTiles')))
        d,st=await day(pg); rec=st['data/users/u_test123/profile']['rec']; print('rec top:', [(r['n'],r.get('ct'),r.get('ms')) for r in rec[:4]])
        print('ERRS', errs); await b.close()
asyncio.run(main())

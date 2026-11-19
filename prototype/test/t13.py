import asyncio, json, sys
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def day(pg):
    st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); ks=sorted(k for k in st if '/days/' in k); return st[ks[-1]], st
def brief(d): return 'cf=' + str([(c['n'],c['mg'],c.get('src'),bool(c.get('eid'))) for c in d.get('cf',[])]) + ' e=' + str([(e['n'],e['k'],e['m'],e.get('via'),bool(e.get('cf'))) for e in d['e']])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        await pg.evaluate("document.querySelector('.trks').scrollIntoView()")
        print('tile btn:', await pg.inner_text('.trks [data-act="cafAdd"]'))
        await pg.click('.trks [data-act="cafAdd"]'); await pg.wait_for_selector('#dkBody'); print('1st coffee nut:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:80], '| foot:', (await pg.inner_text('#dkFoot')).replace('\n',' | '))
        await pg.click('#dkMilk [data-v="semi"]'); await pg.wait_for_timeout(100); print('semi dash:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:70], '| ml', await pg.input_value('#dkMl'), '| foot:', (await pg.inner_text('#dkFoot')).replace('\n',' | '))
        await pg.screenshot(path='150-drink-coffee.png'); await pg.click('[data-act="dkGo"][data-cal="1"]'); await cont(pg); d,_=await day(pg); print('A', brief(d))
        await pg.wait_for_timeout(300); await pg.click('.trks [data-act="cafAdd"]'); await pg.wait_for_timeout(500); print('instant: sheets', len(await pg.query_selector_all('.scrim')), '| toast:', (await pg.inner_text('#toasts')).replace('\n',' | ')); d,_=await day(pg); print('B', brief(d))
        await pg.click('#toasts [data-act="cafUndo"]'); await pg.wait_for_timeout(500); d,_=await day(pg); print('C undo', brief(d))
        # caffeine sheet
        await pg.click('.trks [data-act="caf"] >> nth=0'); await pg.wait_for_selector('#cfBody'); await pg.wait_for_timeout(200)
        await pg.click('#cfBody [data-act="cafAdd"][data-id="flat"]'); await pg.wait_for_selector('#dkBody'); print('flat semi:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:70])
        await pg.click('#dkMilk [data-v="whole"]'); print('flat whole:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:70]); await pg.click('#dkMilk [data-v="oat"]'); await pg.fill('#dkMl','180'); await pg.click('[data-seg="dkSu"] [data-val="1"]'); await pg.wait_for_timeout(100); print('flat oat 180 +1 sugar:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:70])
        await pg.screenshot(path='151-drink-flat.png'); await pg.click('[data-seg="dkMeal"] [data-val="s"]'); await pg.click('[data-act="dkGo"][data-cal="1"]'); await cont(pg); await pg.wait_for_timeout(300)
        await pg.click('#cfBody [data-act="cafAdd"][data-id="amer"]'); await pg.wait_for_selector('#dkBody'); print('americano:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:60], '| foot:', (await pg.inner_text('#dkFoot')).replace('\n',' | ')); await pg.click('[data-act="dkGo"]'); await pg.wait_for_timeout(400)
        await pg.click('#cfBody [data-act="cafAdd"][data-id="esp"]'); await pg.wait_for_timeout(400); print('espresso instant: sheets', len(await pg.query_selector_all('.scrim')))
        await pg.click('#cfBody [data-act="cafAdd"][data-id="cola"]'); await pg.wait_for_selector('#dkBody'); print('cola:', (await pg.inner_text('#dkNut')).replace('\n',' | ')[:50]); await pg.click('[data-seg="dkZero"] [data-val="1"]'); await pg.wait_for_timeout(100); print('cola zero foot:', await pg.inner_text('#dkFoot')); await pg.click('[data-act="close"] >> nth=-1')
        d,_=await day(pg); print('D', brief(d))
        await pg.evaluate("document.querySelector('#cfBody').scrollTop=250"); await pg.wait_for_timeout(200); await pg.screenshot(path='152-caf-sheet.png'); print('DRINKS:', (await pg.inner_text('#cfBody section:nth-of-type(2)')).replace('\n',' | ')[:330]); print('ADD:', (await pg.inner_text('#cfBody section:nth-of-type(3)')).replace('\n',' | ')[:420])
        # remove flat white from caffeine list -> its calories go too
        await pg.click('#cfBody .entry:has-text("Flat white")'); await pg.wait_for_timeout(500); d,_=await day(pg); print('E del flat', brief(d), '| toast', (await pg.inner_text('#toasts')).replace('\n',' | ')[-60:])
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(200)
        # food side: flat white from the database asks about caffeine
        await pg.click('.fab'); await pg.fill('#q','flat white'); await pg.wait_for_selector('#addList .frow', timeout=20000); await pg.wait_for_timeout(600); await pg.click('#addList .qadd >> nth=0'); await pg.wait_for_selector('[data-act="cafAskYes"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='153-ask.png'); print('ASK:', (await pg.inner_text('.scrim:last-child .sheet')).replace('\n',' | ')[:260])
        await pg.click('[data-act="cafAskAlways"]'); await pg.click('[data-act="cafAskYes"]'); await pg.wait_for_timeout(500); d,st=await day(pg); print('F', brief(d), '| cafAuto', st['data/users/u_test123/profile'].get('cafAuto'))
        await pg.wait_for_timeout(1500); await pg.click('#addList .qadd >> nth=0'); await pg.wait_for_timeout(1500); d,_=await day(pg); print('G auto: sheets', len(await pg.query_selector_all('.scrim')), brief(d))
        await pg.click('#addFoot [data-act="close"]'); await cont(pg); await pg.wait_for_timeout(300)
        # delete the food entry -> caffeine goes with it
        await pg.click('.entry[data-act="editEntry"]:has-text("Latte") >> nth=0'); await pg.click('[data-act="delEntry"]'); await pg.wait_for_timeout(500); d,_=await day(pg); print('H del food: cf n', len(d['cf']), '| toast', (await pg.inner_text('#toasts')).replace('\n',' | ')[-40:])
        await pg.evaluate("document.querySelector('.trks').scrollIntoView()"); await pg.wait_for_timeout(2500); await pg.screenshot(path='154-home-caf.png'); print('tile btn now:', await pg.inner_text('.trks [data-act="cafAdd"]'))
        print('ERRS', errs); await b.close()
asyncio.run(main())

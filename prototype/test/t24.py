import asyncio, json, sys
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':W,'height':844}, device_scale_factor=2)
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        async def open_food(q, nth=0):
            await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.fill('#q', q); await pg.wait_for_timeout(900)
            rows = await pg.query_selector_all('#addList .frow .res'); await rows[nth].click(); await pg.wait_for_selector('#fdQty'); await pg.wait_for_timeout(200)
        async def state():
            return await pg.evaluate("({sv: document.querySelector('#fdSv').value, title: document.querySelector('.scrim:last-child h2, .scrim:last-child .sheet-h b, .scrim:last-child .sheet-h')?.innerText.split('\\n')[0], qty: document.querySelector('#fdQty').value, unit: document.querySelector('#fdUnit').selectedOptions[0].text, eq: document.querySelector('#fdEq').innerText, chips: [...document.querySelectorAll('#fdChips button')].map(b => b.innerText).join(' '), kcal: (document.querySelector('#fdNut').innerText.match(/[\\d,.]+/)||[''])[0], units: [...document.querySelectorAll('#fdUnit option')].map(o => o.text)})")
        async def close_all():
            while await pg.query_selector('.scrim'): await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        # 1 a branded drink
        await open_food('guinness 0.0'); s = await state(); print('DRINK', s); await pg.screenshot(path=f'240-drink-{W}.png')
        await pg.select_option('#fdUnit', label='1 pint'); print('  -> pint', {k: (await state())[k] for k in ('qty','sv','eq','kcal')})
        await pg.click('[data-act="fdStep"][data-d="1"]'); print('  -> +', {k: (await state())[k] for k in ('qty','sv','eq','kcal')})
        await pg.select_option('#fdUnit', label='ml'); print('  -> ml keeps amount', {k: (await state())[k] for k in ('qty','sv','eq','kcal')})
        await pg.select_option('#fdUnit', label='litres'); print('  -> litres', {k: (await state())[k] for k in ('qty','sv','eq','kcal')})
        await pg.click('#fdGo'); await cont(pg); d = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); dk = sorted(k for k in d if '/days/' in k)[-1]; print('  diary:', [(e['n'], e['u'], e['g'], round(e['k'])) for e in d[dk]['e']][-1])
        await close_all()
        # 2 cooked rice weighed dry
        await open_food('rice white cooked'); s = await state(); print('RICE', s['title'], '|', s['qty'], s['unit'], s['eq'], '|', s['units'])
        raw = [u for u in s['units'] if 'weighed' in u]
        if raw:
            await pg.select_option('#fdUnit', label=raw[0]); print('  -> dry', {k: (await state())[k] for k in ('qty','sv','eq','kcal')}); await pg.fill('#fdQty', '80'); print('  -> 80 g dry', {k: (await state())[k] for k in ('qty','sv','eq','kcal')}); await pg.screenshot(path=f'241-rice-{W}.png')
        await close_all()
        # 3 butter by the spoon, then ounces
        await open_food('kerrygold butter'); s = await state(); print('BUTTER', s['title'], '|', s['qty'], s['unit'], s['eq'], '|', s['units'])
        await pg.click('[data-act="fdSet"][data-q="2"]'); print('  -> 2', {k: (await state())[k] for k in ('qty','sv','unit','eq','kcal')})
        await pg.select_option('#fdUnit', label='g'); print('  -> g converts', {k: (await state())[k] for k in ('qty','sv','eq','kcal')})
        await pg.select_option('#fdUnit', label='oz'); print('  -> oz converts', {k: (await state())[k] for k in ('qty','sv','eq','kcal')}); await pg.screenshot(path=f'242-butter-{W}.png')
        await close_all()
        # 4 bread
        await open_food('bread white'); s = await state(); print('BREAD', s['title'], '|', s['qty'], s['unit'], s['eq'], '|', s['chips'], '|', s['units'][:6])
        await close_all()
        print('ERRS', errs); await b.close()
asyncio.run(main())

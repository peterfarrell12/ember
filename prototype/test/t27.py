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
        async def st():
            return await pg.evaluate("({qty: document.querySelector('#fdQty').value, sv: document.querySelector('#fdSv').value, unit: document.querySelector('#fdUnit').selectedOptions[0].text, eq: document.querySelector('#fdEq').innerText, kcal: (document.querySelector('#fdNut').innerText.match(/[\\d,.]+/)||[''])[0], go: document.querySelector('#fdGo').innerText.trim()})")
        async def diary():
            d = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); dk = sorted(k for k in d if '/days/' in k)[-1]; return [(e['n'][:28], e.get('u'), e['g'], round(e['k']), e.get('q'), e.get('us'), e.get('sv')) for e in d[dk]['e']]
        async def close_all():
            while await pg.query_selector('.scrim'): await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        # 1 log bread as 2 medium slices through the food sheet
        await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.fill('#q', 'bread white'); await pg.wait_for_timeout(900)
        await (await pg.query_selector_all('#addList .frow .res'))[0].click(); await pg.wait_for_selector('#fdQty'); await pg.click('[data-act="fdSet"][data-q="2"]'); print('ADD', await st()); await pg.click('#fdGo'); await cont(pg); await close_all()
        print(' diary:', (await diary())[-1])
        # 2 edit it from the diary
        await pg.click('.entry[data-act="editEntry"] >> nth=-1'); await pg.wait_for_selector('#fdQty'); await pg.wait_for_timeout(200); print('EDIT opens', await st()); await pg.screenshot(path=f'270-edit-{W}.png')
        await pg.click('[data-act="fdStep"][data-d="1"]'); print(' +', await st())
        await pg.select_option('#fdUnit', label='g'); print(' -> g', await st())
        await pg.select_option('#fdUnit', label='1 large or thick slice (43 g)'); print(' -> thick', await st())
        await pg.fill('#fdSv', '2'); await pg.click('#fdGo'); await pg.wait_for_timeout(600); await cont(pg); print(' saved:', (await diary())[-1]); print(' row:', (await pg.inner_text('.entry[data-act="editEntry"] >> nth=-1')).replace('\n', ' | '))
        await pg.click('.entry[data-act="editEntry"] >> nth=-1'); await pg.wait_for_selector('#fdQty'); print(' reopen', await st()); await close_all()
        await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.fill('#q', 'organic jumbo oats'); await pg.wait_for_timeout(900); await (await pg.query_selector_all('#addList .frow .res'))[0].click(); await pg.wait_for_selector('#fdQty'); print('OATS opens', await st())
        await pg.select_option('#fdUnit', index=0); await pg.fill('#fdQty', '45'); await pg.click('[data-act="fdStep"][data-d="1"]'); await pg.click('[data-act="fdStep"][data-d="1"]'); print(' 45 g x 2', await st()); await pg.screenshot(path=f'274-servings-{W}.png'); await pg.click('#fdGo'); await cont(pg); await close_all(); print(' diary:', (await diary())[-1]); print(' row:', (await pg.inner_text('.entry[data-act="editEntry"] >> nth=-1')).replace('\n', ' | '))
        await pg.click('.entry[data-act="editEntry"] >> nth=-1'); await pg.wait_for_selector('#fdQty'); print(' reopen', await st()); await close_all()
        await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.wait_for_timeout(500); print(' recent row:', (await pg.inner_text('#addList .frow >> nth=0')).replace('\n', ' | ')); await close_all()
        # 3 quick add with the plus, then Amount in the footer
        await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.fill('#q', 'guinness 0.0'); await pg.wait_for_timeout(900); await pg.click('#addList .frow .qadd >> nth=0'); await pg.wait_for_selector('#addFoot [data-act="editEntry"]'); await pg.wait_for_timeout(300)
        print('QUICK', (await diary())[-1], '| foot:', (await pg.inner_text('#addFoot')).replace('\n', ' | ')); await pg.screenshot(path=f'271-foot-{W}.png')
        await pg.click('#addFoot [data-act="editEntry"]'); await pg.wait_for_selector('#fdQty'); print(' opens', await st()); await pg.select_option('#fdUnit', label='1 can, 440 ml'); await pg.click('#fdGo'); await pg.wait_for_timeout(600); await cont(pg)
        print(' saved:', (await diary())[-1], '| foot:', (await pg.inner_text('#addFoot')).replace('\n', ' | ') if await pg.query_selector('#addFoot') else None); await close_all()
        # 4 an older entry that only has grams
        rows = await pg.query_selector_all('.entry[data-act="editEntry"]'); print('entries today:', len(rows), (await diary())[0])
        await rows[0].click(); await pg.wait_for_timeout(500); print('OLD entry editor has quantity:', bool(await pg.query_selector('#fdQty')), await st() if await pg.query_selector('#fdQty') else (await pg.inner_text('.scrim:last-child .sheet-b')).replace('\n',' | ')[:200]); await close_all()
        await pg.click('[data-act="prevDay"], .datenav button >> nth=0'); await pg.wait_for_timeout(700); rows = await pg.query_selector_all('.entry[data-act="editEntry"]'); print('yesterday entries:', len(rows))
        if rows:
            print(' legacy row:', (await rows[0].inner_text()).replace('\n', ' | ')); await rows[0].click(); await pg.wait_for_timeout(500); print(' LEGACY editor:', await st() if await pg.query_selector('#fdQty') else (await pg.inner_text('.scrim:last-child .sheet-b')).replace('\n',' | ')[:200], await pg.evaluate("[...document.querySelectorAll('#fdUnit option')].map(o => o.text).slice(0,6)") if await pg.query_selector('#fdQty') else ''); await close_all()
        await pg.click('.datenav button >> nth=-1'); await pg.wait_for_timeout(600)
        # 5 photo review: amount and unit
        await pg.click('.fab'); await pg.wait_for_selector('#addList')
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="photo"]')
        await (await fc.value).set_files('p1.jpg'); await pg.wait_for_selector('#phGo:not([disabled])'); await pg.fill('#phNote', 'heineken'); await pg.click('#phGo'); await pg.wait_for_selector('#revGo', timeout=30000); await pg.wait_for_timeout(300)
        await pg.click('[data-act="revAmt"]'); await pg.wait_for_selector('#fdQty'); print('REVIEW amount opens', await st()); await pg.select_option('#fdUnit', label='1 pint'); await pg.click('#fdGo'); await pg.wait_for_timeout(400)
        print(' review row:', (await pg.inner_text('.scrim:last-child .rev')).replace('\n', ' | '), '|', await pg.inner_text('#revGo')); await pg.screenshot(path=f'272-review-{W}.png'); await pg.click('#revGo'); await cont(pg); print(' diary:', (await diary())[-1]); await close_all()
        # 6 a custom food with a named serving and a pack
        await pg.click('.fab'); await pg.wait_for_selector('#addList'); await pg.fill('#q', 'zzqq bar'); await pg.wait_for_timeout(700); await pg.click('[data-act="newFood"]'); await pg.wait_for_selector('#cfN'); await pg.fill('#cfN', 'Castlerea protein bar'); await pg.fill('#cfK', '380'); await pg.fill('#cfP', '30'); await pg.fill('#cfC', '35'); await pg.fill('#cfF', '13'); await pg.fill('#cfSvN', 'bar'); await pg.fill('#cfSv', '60'); await pg.fill('#cfPk', '180'); await pg.screenshot(path=f'273-newfood-{W}.png', full_page=True)
        await pg.click('[data-act="saveFood"]'); await pg.wait_for_selector('#fdQty'); await pg.wait_for_timeout(300); print('CUSTOM', await st(), await pg.evaluate("[...document.querySelectorAll('#fdUnit option')].map(o => o.text)")); await pg.click('#fdGo'); await cont(pg); print(' diary:', (await diary())[-1])
        print('ERRS', errs); await b.close()
asyncio.run(main())

import asyncio, json
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def prof(pg): return (await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"))['data/users/u_test123/profile']
def t(s, n=260): return s.replace('\n',' | ')[:n]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        # ---- targets
        p0 = await prof(pg); print('before:', p0['t'], 'rate', p0['rate'], 'kg', p0['kg'])
        await pg.click('#chipYou'); await pg.click('[data-act="openTargets"]'); await pg.wait_for_selector('#tgCard'); print('save btn:', await pg.inner_text('[data-act="saveTargets"]'), '| card head:', t(await pg.inner_text('#tgCard'), 160))
        await pg.select_option('#tgBody select[data-k="rate"]', index=2); await pg.wait_for_timeout(200); print('after pace -> k', await pg.input_value('#tgK'), '| banner:', t(await pg.inner_text('.tg-chg')), '| save:', await pg.inner_text('[data-act="saveTargets"]')); print('note:', await pg.inner_text('#tgNote'))
        await pg.screenshot(path='210-targets-changed.png')
        await pg.click('[data-act="tgRevert"]'); await pg.wait_for_timeout(200); print('after revert -> k', await pg.input_value('#tgK'), '| banner gone:', await pg.query_selector('.tg-chg') is None, '| save:', await pg.inner_text('[data-act="saveTargets"]'))
        await pg.fill('#tgBody input[data-k="kg"]', '92'); await pg.wait_for_timeout(200); print('after weight 92 -> k', await pg.input_value('#tgK'), 'p', await pg.input_value('#tgP'), '| kg field still', await pg.input_value('#tgBody input[data-k="kg"]'))
        await pg.fill('#tgP', '170'); await pg.wait_for_timeout(100); await pg.click('#tgBody h2 >> nth=0'); await pg.wait_for_timeout(300); print('custom protein kept:', await pg.input_value('#tgP'), '| head:', t(await pg.inner_text('#tgCard'), 90))
        await pg.click('[data-act="saveTargets"]'); await pg.wait_for_timeout(400); p1 = await prof(pg); print('saved:', p1['t'], 'rate', p1['rate'], 'kg', p1['kg'], '| toast:', t(await pg.inner_text('#toasts')))
        await pg.click('#toasts [data-act="tgUndo"]'); await pg.wait_for_timeout(400); p2 = await prof(pg); print('undo:', p2['t'] == p0['t'], p2['rate'], p2['kg'])
        # ---- ideas and menu
        await pg.click('nav [data-tab="today"]'); await pg.evaluate("document.querySelector('[data-act=\"ideas\"]').scrollIntoView()"); await pg.click('[data-act="ideas"]'); await pg.wait_for_selector('[data-act="ideasGo"]'); await pg.click('[data-act="ideasGo"]'); await pg.wait_for_timeout(250); print('mid-stream cards:', len(await pg.query_selector_all('.idea')), '| busy:', await pg.query_selector('#ideasOut .busy') is not None)
        await pg.wait_for_timeout(900); print('ideas cards:', len(await pg.query_selector_all('.idea')), t(await pg.inner_text('.idea >> nth=0'), 150))
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="menuPhoto"]')
        await (await fc.value).set_files('big.jpg'); await pg.wait_for_timeout(2500); print('menu cards:', len(await pg.query_selector_all('.idea')), '| image sent:', await pg.evaluate('window.__menuImg'), await pg.evaluate('window.__img'))
        await pg.click('.idea [data-act="ideaLog"] >> nth=0'); await pg.wait_for_selector('#revGo'); print('review:', await pg.inner_text('#revGo')); await pg.click('[data-act="close"] >> nth=-1'); await pg.wait_for_timeout(300)
        # cut-off answer and a failure
        for tag in ('IDEACUT', 'IDEAFAIL'):
            await pg.evaluate("t => { const d = JSON.parse(localStorage.getItem('mockdb')); d['data/users/u_test123/profile'].rec[0].n = t; localStorage.setItem('mockdb', JSON.stringify(d)); }", tag); await pg.reload(); await pg.wait_for_selector('.hero2'); await cont(pg)
            await pg.evaluate("document.querySelector('[data-act=\"ideas\"]').scrollIntoView()"); await pg.click('[data-act="ideas"]'); await pg.click('[data-act="ideasGo"]'); await pg.wait_for_timeout(1500); print(tag, 'cards:', len(await pg.query_selector_all('.idea')), '| out:', t((await pg.inner_text('#ideasOut'))[-150:], 150))
            if tag == 'IDEAFAIL': await pg.screenshot(path='211-ideas-fail.png')
            await pg.click('[data-act="close"]')
        print('ERRS', errs); await b.close()
asyncio.run(main())

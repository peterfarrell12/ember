import asyncio, json
from harness import async_playwright, TODAY
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2); await ctx.add_init_script(path='seed.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('http://127.0.0.1:8765/index.html#today'); await pg.wait_for_selector('.hero2'); await pg.wait_for_timeout(500)
        while await pg.query_selector('.cele'): await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
        await pg.click('#chipYou'); await pg.click('[data-act="modeGo"][data-m="coach"]'); await pg.wait_for_selector('.crow'); await pg.wait_for_timeout(2800); print('clients:', await pg.eval_on_selector_all('#main .crow b.ell', 'e=>e.map(x=>x.innerText)')); print('stats:', (await pg.inner_text('#main .grid3')).replace('\n',' ')); await pg.screenshot(path='95-clients.png')
        await pg.click('.crow[data-id="s5"]'); await pg.wait_for_selector('#ccBody .stat4'); await pg.evaluate("document.querySelector('#ccBody').scrollTop=620"); await pg.wait_for_timeout(150); await pg.screenshot(path='96-client-notes.png'); await pg.click('[data-act="close"]')
        await pg.click('[data-act="catalogue"]'); await pg.wait_for_selector('.ccard'); await pg.wait_for_timeout(300); await pg.screenshot(path='97-catalogue.png'); print('catalogue:', await pg.eval_on_selector_all('#catBody .ccard b.ell', 'e=>e.map(x=>x.innerText)'))
        await pg.click('[data-act="catVer"]'); await pg.wait_for_timeout(150); print('checked only:', len(await pg.query_selector_all('#catBody .ccard')))
        await pg.select_option('#catSpec','Rehab'); await pg.wait_for_timeout(150); print('rehab filter:', await pg.eval_on_selector_all('#catBody .ccard b.ell', 'e=>e.map(x=>x.innerText)')); await pg.select_option('#catSpec',''); await pg.click('[data-act="catVer"]')
        await pg.click('.ccard[data-id="d1"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='98-coach.png'); await pg.evaluate("document.querySelectorAll('.sheet-b')[document.querySelectorAll('.sheet-b').length-1].scrollTop=760"); await pg.wait_for_timeout(150); await pg.screenshot(path='99-coach-reviews.png')
        n_rev = len(await pg.query_selector_all('.sheet:last-child .entry .stars')); n_pill = await pg.evaluate("[...document.querySelectorAll('#sheets .scrim:last-child .entry')].filter(e=>e.querySelector('.stars') && e.innerText.includes('Sample')).length"); print('reviews shown', n_rev, 'labelled sample', n_pill)
        await pg.click('[data-act="catJoin"]'); await pg.click('[data-act="close"] >> nth=-1'); await pg.click('.ccard[data-id="d7"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='100-spoofer.png'); await pg.click('[data-act="close"] >> nth=-1')
        await pg.click('[data-act="catMe"]'); await pg.wait_for_timeout(200); print('my profile:', (await pg.inner_text('.sheet-b >> nth=-1')).replace('\n',' | ')[:330]); await pg.click('.sheet [data-act="coProfile"]'); await pg.wait_for_selector('#cpBody'); await pg.click('[data-act="cpPlan"]'); await pg.fill('#cplN','Hybrid coaching'); await pg.fill('#cplP','€160 a month'); await pg.click('[data-act="cpPlanSave"]'); await pg.wait_for_timeout(200); print('plans now:', await pg.eval_on_selector_all('#cpBody [data-act="cpPlanDel"] .n', 'e=>e.map(x=>x.innerText)')); await pg.click('[data-act="coProfileSave"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-tab="feed"]'); await pg.click('[data-act="squad"]'); await pg.wait_for_selector('#sqBody .crow'); await pg.wait_for_timeout(300); await pg.screenshot(path='101-squad.png'); await pg.click('[data-act="close"]')
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); print('shared reviews docs:', [k for k in st if k.startswith('reviews')], '| published plans:', st['coach/profile'].get('plans'))
        await pg.click('[data-tab="clients"]'); await pg.click('[data-act="coDropSamples"]'); await pg.wait_for_timeout(300); print('after remove:', await pg.eval_on_selector_all('#main .crow b.ell', 'e=>e.map(x=>x.innerText)')); await pg.click('[data-act="catalogue"]'); await pg.wait_for_timeout(200); print('catalogue cards after remove:', len(await pg.query_selector_all('#catBody .ccard'))); await pg.click('#catBody [data-act="coDemoOn"]'); await pg.wait_for_timeout(300); print('restored:', len(await pg.query_selector_all('#main .crow')))
        print('ERRS', errs); await b.close()
asyncio.run(main())

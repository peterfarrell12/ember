import asyncio, json, sys, datetime
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def gym(pg): return (await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))")).get('data/users/u_test123/profile/meta/gym')
def t(s, n=300): return s.replace('\n',' | ')[:n]
async def main():
    dark = len(sys.argv)>1; sfx='-d' if dark else ''
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        await pg.click('#chipYou'); await pg.click('[data-act="modeGo"][data-m="gym"]'); await pg.wait_for_selector('.thero'); await pg.wait_for_timeout(2800); await pg.screenshot(path=f'200-gym-today{sfx}.png'); print('HERO:', t(await pg.inner_text('.thero'), 260)); print('nav:', t(await pg.inner_text('nav.tabs')))
        await pg.evaluate("document.querySelector('#main').scrollTop=620"); await pg.wait_for_timeout(200); await pg.screenshot(path=f'201-gym-insights{sfx}.png')
        # timetable: tomorrow, open a class register
        await pg.click('nav [data-tab="gtime"]'); tm = (TODAY+datetime.timedelta(days=1)).isoformat(); 
        sel = f'.wds [data-date="{tm}"]'
        if not await pg.query_selector(sel): await pg.click('[data-act="gWeek"][data-n="1"]')
        await pg.click(sel); await pg.wait_for_timeout(200); await pg.screenshot(path=f'202-gym-timetable{sfx}.png'); rows = await pg.query_selector_all('.pr[data-act="gSess"]'); print('classes tomorrow:', len(rows), '|', t(await rows[-1].inner_text(), 120))
        await rows[-1].click(); await pg.wait_for_selector('#gsBody'); await pg.wait_for_timeout(200); print('REGISTER:', t(await pg.inner_text('#gsBody .stat4')))
        await pg.select_option('#gsAdd', 'me'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'203-gym-register{sfx}.png'); print('after adding You:', t(await pg.inner_text('#gsBody .stat4')), '| toast:', t(await pg.inner_text('#toasts'), 80))
        await pg.click('#gsBody [data-act="gsDrop"] >> nth=0'); await pg.wait_for_timeout(300); print('after drop:', t(await pg.inner_text('#gsBody .stat4')), '| toast:', t(await pg.inner_text('#toasts'), 120))
        await pg.click('[data-act="close"]')
        # new class
        await pg.click('nav .fab'); await pg.click('.menu [data-act="gClass"]'); await pg.fill('#gcN','Kettlebells'); await pg.fill('#gcC','8'); await pg.click('[data-act="gClassSave"]'); await pg.wait_for_timeout(300); g = await gym(pg); print('classes now', len(g['classes']), g['classes'][-1])
        # people
        await pg.wait_for_timeout(1600)  # the gym view reuses its visit stats for 1.5 s; wait so the list is worked out fresh
        await pg.click('nav [data-tab="gpeople"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'204-gym-members{sfx}.png'); print('MEMBERS:', t(await pg.inner_text('#main'), 330))
        await pg.click('[data-act="gFilter"][data-v="risk"]'); await pg.wait_for_timeout(150); print('at risk rows:', len(await pg.query_selector_all('.crow')))
        await pg.click('[data-seg="gPeople"] [data-val="coach"]'); await pg.wait_for_timeout(150); await pg.screenshot(path=f'205-gym-coaches{sfx}.png'); await pg.click('.crow >> nth=3'); await pg.click('[data-act="gCoachFlag"][data-f="ver"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="close"]'); g = await gym(pg); print('coach 4 verified now:', g['coaches'][3]['ver'])
        await pg.click('[data-seg="gPeople"] [data-val="plan"]'); await pg.wait_for_timeout(150); print('PLANS:', t(await pg.inner_text('#main'), 200))
        # member side
        await pg.click('nav [data-act="modeBack"]'); await pg.wait_for_selector('.hero2'); await pg.click('nav [data-tab="train"]'); await pg.wait_for_selector('[data-act="gym"]'); print('STRIP:', t(await pg.inner_text('.act[data-act="gym"]')))
        await pg.click('.act[data-act="gym"]'); await pg.wait_for_selector('#gmBody .ag'); await pg.click(f'#gmBody .wds [data-date="{tm}"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'206-mygym{sfx}.png'); print('MY GYM tomorrow:', t(await pg.inner_text('#gmBody section'), 420))
        bk = await pg.query_selector_all('#gmBody [data-act="gmBook"]'); await bk[0].click(); await pg.wait_for_timeout(300); print('book toast:', t(await pg.inner_text('#toasts'), 120))
        await pg.click('[data-seg="gmTab"] [data-val="pt"]'); await pg.wait_for_timeout(200); await pg.click('#gmBody .slots button:not([disabled]) >> nth=2'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'207-mygym-pt{sfx}.png')
        await pg.click('[data-seg="gmTab"] [data-val="sp"]'); await pg.wait_for_timeout(200); await pg.click('#gmBody .slots button:not([disabled]) >> nth=1'); await pg.wait_for_timeout(300)
        await pg.click('[data-seg="gmTab"] [data-val="mine"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'208-mygym-mine{sfx}.png'); print('MINE:', t(await pg.inner_text('#gmBody'), 520))
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(300)
        await pg.click('#chipCal'); await pg.wait_for_selector('#calBody .pwk'); print('CAL has class:', 'class' in (await pg.inner_text('#calBody')).lower(), '| rows ev', len(await pg.query_selector_all('.pr.ev'))); await pg.click('[data-act="close"]')
        # assistant books
        await pg.click('#asFab'); await pg.wait_for_selector('#asBody .bub'); await pg.fill('#asT', 'book me into spin'); await pg.click('[data-act="asGo"]'); await pg.wait_for_timeout(1200); print('ASSISTANT:', t((await pg.inner_text('#asBody'))[-200:], 200)); await pg.click('[data-act="close"]')
        g = await gym(pg); print('my bookings:', [(k, 'in' if 'me' in v['in'] else 'wait') for k, v in g['book'].items() if 'me' in v['in'] or 'me' in v['wait']], '| appts', [(a['type'], a['d'], a['tm']) for a in g['appts']], '| pass left', [m for m in g['members'] if m['id']=='me'][0]['left'])
        print('ERRS', errs); await b.close()
asyncio.run(main())

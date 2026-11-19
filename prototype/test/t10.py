import asyncio, json
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg, show=True):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        if show: print('  cele:', await pg.inner_text('.cele h3'), '|', await pg.inner_text('.cele .muted'))
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2); await ctx.add_init_script(path='seed.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg, False)
        # ---- caffeine
        await pg.evaluate("document.querySelector('#main').scrollTop=99999"); await pg.click('.trks [data-act="cafAdd"]'); await pg.wait_for_selector('#dkFoot'); await pg.click('[data-act="dkGo"]'); await cont(pg, False); await pg.click('[data-act="caf"] >> nth=0'); await pg.wait_for_selector('#cfBody'); await pg.fill('#cfN','Cold brew'); await pg.fill('#cfMg','180'); await pg.fill('#cfT','07:30'); await pg.click('[data-act="cafCustom"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='110-caffeine.png'); print('CAF:', (await pg.inner_text('#cfBody')).replace('\n',' | ')[:330]); await pg.click('[data-act="close"]')
        await pg.click('.fab'); await pg.fill('#q','flat white'); await pg.wait_for_selector('#addList .res', timeout=20000); await pg.wait_for_timeout(600); print('food:', await pg.inner_text('#addList .res >> nth=0 >> .n')); await pg.click('#addList .res >> nth=0'); await pg.click('#fdGo'); await cont(pg, False); await pg.wait_for_selector('[data-act="cafAskYes"]'); await pg.click('[data-act="cafAskYes"]'); await pg.wait_for_timeout(400)
        await pg.evaluate("document.querySelector('#main').scrollTop=99999"); await pg.wait_for_timeout(2800); await pg.screenshot(path='111-today-caf.png')
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); dk=[k for k in st if '/days/' in k][0]; print('cf entries:', [(c['n'],c['mg'],c.get('src')) for c in st[dk]['cf']], 'hist cf', st['data/users/u_test123/profile']['hist'][dk.split('/')[-1]].get('cf'))
        # ---- training upgrades
        await pg.click('[data-tab="train"]'); await pg.click('[data-act="progs"]'); await pg.click('[data-act="tplView"][data-id="t-full3"]'); await pg.click('[data-act="progUse"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='112-train.png')
        await pg.click('[data-act="trainStart"]'); await pg.wait_for_selector('#wkBody .setrow')
        for j in range(4): await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="w"]','100'); await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="r"]','6'); await pg.click(f'#wkBody [data-act="wkTick"][data-i="0"][data-j="{j}"]'); await pg.wait_for_timeout(80)
        await pg.click('[data-act="wkRestAdj"][data-n="15"]'); print('rest:', await pg.inner_text('#wkRestT'))
        await pg.click('#wkBody [data-act="wkMenu"][data-i="0"]'); await pg.click('.menu [data-act="wkTools"]'); await pg.wait_for_selector('#wtOut'); print('TOOLS:', (await pg.inner_text('#wtOut')).replace('\n',' | ')[:330]); await pg.screenshot(path='113-tools.png'); await pg.click('[data-act="close"] >> nth=-1')
        await pg.click('#wkBody [data-act="wkMenu"][data-i="0"]'); await pg.click('.menu [data-act="wkNote"]'); await pg.fill('#wnT','Low bar, belt on'); await pg.click('[data-act="wkNoteSave"]'); await pg.wait_for_timeout(150)
        await pg.fill('#wkRpe','9'); await pg.dispatch_event('#wkRpe','input'); await pg.click('[data-act="wkFinish"]'); await cont(pg)
        await pg.click('[data-act="sessView"] >> nth=0'); await pg.wait_for_selector('[data-act="sessAgain"]'); await pg.click('[data-act="sessAgain"]'); await pg.wait_for_selector('#wkBody .setrow'); print('again note shown:', 'Low bar' in await pg.inner_text('#wkBody')); await pg.click('[data-act="wkHide"]'); await pg.click('[data-act="wkDiscard"]')
        await pg.click('[data-act="timer"]'); await pg.click('[data-seg="itMode"] [data-val="tabata"]'); await pg.screenshot(path='114-timer.png'); await pg.click('[data-act="itStart"]'); await pg.wait_for_selector('#itN'); await pg.wait_for_timeout(700); await pg.screenshot(path='115-timer-run.png'); print('timer:', (await pg.inner_text('#itBody')).replace('\n',' | ')[:120]); await pg.click('[data-act="itStop"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-tab="progress"]'); await pg.click('[data-act="pview"][data-v="train"]'); await pg.wait_for_timeout(2800); await pg.screenshot(path='116-analytics.png'); print('ANALYTICS:', (await pg.inner_text('#main')).replace('\n',' | ')[:520])
        # ---- client management
        await pg.click('#chipYou'); await pg.click('[data-act="modeGo"][data-m="coach"]'); await pg.wait_for_selector('.crow'); await pg.click('nav .fab'); await pg.fill('#caN','Sean Murphy'); await pg.fill('#caG','First Hyrox'); await pg.fill('#caA','31'); await pg.fill('#caH','180'); await pg.fill('#caW','84'); await pg.click('[data-seg="ncGoal"] [data-val="lose"]'); await pg.select_option('#caP','t-hyrox'); await pg.screenshot(path='117-addclient.png'); await pg.click('[data-act="coAddGo"]'); await pg.wait_for_selector('#ccBody .stat4'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="ccTab"][data-t="plan"]'); await pg.wait_for_timeout(150); await pg.screenshot(path='118-client-plan.png'); print('PLAN:', (await pg.inner_text('#ccBody')).replace('\n',' | ')[:420])
        await pg.click('[data-act="coStart"]'); await pg.wait_for_selector('#wkBody .setrow'); print('player title:', (await pg.inner_text('.sheet-h h3')).replace('\n',' / '))
        for j in range(3): await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="w"]','120'); await pg.click(f'#wkBody [data-act="wkTick"][data-i="0"][data-j="{j}"]'); await pg.wait_for_timeout(80)
        await pg.click('[data-act="wkFinish"]'); await cont(pg); await pg.wait_for_selector('#ccBody'); await pg.click('[data-act="ccTab"][data-t="sess"]'); await pg.wait_for_timeout(150); await pg.screenshot(path='119-client-sess.png'); print('SESS TAB:', (await pg.inner_text('#ccBody')).replace('\n',' | ')[:330])
        await pg.click('[data-act="ccTab"][data-t="over"]'); await pg.click('[data-act="coWeigh"]'); await pg.fill('#cwK','83.2'); await pg.click('[data-act="coWeighSave"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="ccTab"][data-t="notes"]'); await pg.click('[data-act="coCheckin"]'); await pg.fill('#ckS','2'); await pg.fill('#ckR','64'); await pg.fill('#ckN','Good week'); await pg.click('[data-act="coCheckinSave"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='120-client-notes.png')
        await pg.click('[data-act="ccTab"][data-t="plan"]'); await pg.click('[data-act="coCopyPlan"]'); await pg.wait_for_timeout(300); cp = await pg.query_selector('textarea[readonly]'); print('copy fallback sheet:', cp is not None, '| text:', (await cp.input_value())[:160].replace('\n',' / ') if cp else '')
        if cp: await pg.click('[data-act="close"] >> nth=-1')
        await pg.click('[data-act="coEditProg"]'); await pg.wait_for_selector('#peBody'); await pg.click('[data-act="peItem"] >> nth=0'); await pg.fill('#piS','6'); await pg.click('[data-act="piOk"]'); await pg.click('[data-act="peSave"]'); await pg.wait_for_selector('#ccBody'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="ccTab"][data-t="plan"]'); await pg.click('[data-act="coPick"][data-what="rehab"]'); await pg.click('[data-act="coPickGo"][data-id="r-knee"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="coRehabGo"]'); await pg.wait_for_selector('#wkPain'); await pg.click('#wkBody [data-act="wkTick"][data-i="0"][data-j="0"]'); await pg.fill('#wkPain','6'); await pg.dispatch_event('#wkPain','input'); await pg.click('[data-act="wkFinish"]'); await cont(pg); await pg.wait_for_selector('#ccBody'); await pg.click('[data-act="ccTab"][data-t="over"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='121-client-over.png'); print('OVER:', (await pg.inner_text('#ccBody')).replace('\n',' | ')[:420]); await pg.click('[data-act="close"]')
        await pg.click('.crow[data-id="s5"]'); await pg.wait_for_selector('#ccBody .stat4'); await pg.wait_for_timeout(200); await pg.screenshot(path='122-sample-over.png'); await pg.click('[data-act="ccTab"][data-t="sess"]'); await pg.wait_for_timeout(150); await pg.screenshot(path='123-sample-sess.png'); await pg.click('[data-act="close"]')
        print('CLIENT LIST:', (await pg.inner_text('#main')).replace('\n',' | ')[:520])
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); print('cl docs:', len([k for k in st if '/cl/' in k]), '| meta has clients:', 'clients' in st['data/users/u_test123/profile/meta/coach']); m=[v for k,v in st.items() if '/cl/' in k and v['kind']=='manual'][0]; print('manual:', m['name'], m['t'], 'progAt', m['progAt'], 'sess', [(s['n'],s['kind'],s['sets']) for s in m['sess']], 'wts', m['wts'], 'lifts', list(m['lifts'].keys())[:3], 'rehab', m['rehab'], 'pain', m['st'].get('pain'), 'prog sets', m['prog']['days'][0]['items'][0]['sets'])
        prof = st['data/users/u_test123/profile']; print('own sessions untouched: sess', prof['st']['sess'], '| TR sess', len(st['data/users/u_test123/profile/meta/train']['sess']))
        await pg.reload(); await pg.wait_for_selector('.crow'); print('after reload clients:', len(await pg.query_selector_all('#main .crow'))); print('ERRS', errs); await b.close()
asyncio.run(main())

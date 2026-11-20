import asyncio, json
from harness import async_playwright, TODAY
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        print('  cele:', (await pg.inner_text('.cele h3')), '|', (await pg.inner_text('.cele ul')).replace('\n',' ') if await pg.query_selector('.cele ul') else ''); await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def next_day(pg):
    # Once today's session is done the Train hero shows "Done for today", which has no links to the
    # program. The steps that need them run on the following day, so move the clock on and reload.
    await pg.clock.fast_forward('24:00:00'); await pg.reload(); await pg.wait_for_selector('[data-act="ready"]'); await cont(pg); await pg.wait_for_timeout(300)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark')
        await ctx.add_init_script(path='seed.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#train'); await pg.wait_for_selector('[data-act="ready"]'); await cont(pg); await pg.wait_for_timeout(300); await pg.screenshot(path='60-train-empty.png')
        # readiness
        await pg.click('[data-act="ready"]'); await pg.wait_for_selector('#rdOut'); await pg.screenshot(path='61-ready.png'); print('ready:', (await pg.inner_text('#rdOut')).replace('\n',' ')); await pg.click('[data-act="readySave"]'); await cont(pg)
        # program from template
        await pg.click('[data-act="progs"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='62-progs.png'); await pg.click('[data-act="tplView"][data-id="t-full3"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='63-tpl.png'); await pg.click('[data-act="progUse"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='64-train-prog.png')
        await pg.click('[data-act="trainStart"]'); await pg.wait_for_selector('#wkBody .setrow')
        rows = await pg.query_selector_all('#wkBody section >> nth=0 >> .setrow'); print('squat rows', len(rows))
        for j in range(4):
            await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="w"]','100'); await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="r"]','8'); await pg.click(f'#wkBody [data-act="wkTick"][data-i="0"][data-j="{j}"]'); await pg.wait_for_timeout(120)
        await pg.fill('#wkBody [data-i="1"][data-j="0"][data-f="w"]','80'); await pg.click('#wkBody [data-act="wkTick"][data-i="1"][data-j="0"]'); await pg.wait_for_timeout(500)
        print('rest shown:', await pg.inner_text('#wkRest')); await pg.screenshot(path='65-player.png')
        await pg.click('[data-act="wkHold"][data-i="5"][data-j="0"]'); await pg.wait_for_timeout(300); print('hold:', (await pg.inner_text('#wkRestT')))
        await pg.click('[data-act="wkHide"]'); await pg.wait_for_timeout(200); print('resume card:', await pg.query_selector('[data-act="wkResume"]') is not None)
        await pg.reload(); await pg.wait_for_selector('[data-act="wkResume"]'); await pg.click('[data-act="wkResume"]'); await pg.wait_for_selector('#wkBody .setrow.on'); print('draft restored sets on:', len(await pg.query_selector_all('#wkBody .setrow.on')))
        await pg.click('[data-act="wkFinish"]'); await cont(pg)
        await pg.screenshot(path='66-train-after.png')
        # progression tip on repeating day A
        await next_day(pg); await pg.click('[data-act="progView"]'); await pg.click('[data-act="trainDay"][data-i="0"]'); await pg.wait_for_selector('#wkBody .setrow'); print('tip:', await pg.inner_text('#wkBody section >> nth=0 >> .pill.good'), '| prefill:', await pg.input_value('#wkBody [data-i="0"][data-j="0"][data-f="w"]'))
        for j in range(4):
            await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="r"]','6'); await pg.click(f'#wkBody [data-act="wkTick"][data-i="0"][data-j="{j}"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-act="wkFinish"]'); await cont(pg)
        # AI program
        await next_day(pg); await pg.click('[data-act="progs"]'); await pg.click('[data-act="progAI"]'); await pg.click('[data-act="progAIGo"]'); await pg.wait_for_selector('[data-act="progUse"]', timeout=15000); print('AI program:', (await pg.inner_text('.sheet-b >> nth=-1')).replace('\n',' | ')[:260]); await pg.click('[data-act="close"] >> nth=-1')
        # custom program editor
        await pg.click('[data-act="progs"]'); await pg.click('[data-act="progNew"]'); await pg.fill('#peBody [data-on="peName"]','My push day'); await pg.click('[data-act="peAdd"]'); await pg.fill('#pkQ','bench'); await pg.wait_for_timeout(150); await pg.click('#pkList .res >> nth=0'); await pg.wait_for_timeout(150)
        await pg.click('[data-act="peItem"]'); await pg.fill('#piS','5'); await pg.fill('#piR','5'); await pg.click('[data-act="piOk"]'); await pg.wait_for_timeout(150); await pg.screenshot(path='67-editor.png'); await pg.click('[data-act="peSave"]'); await pg.wait_for_timeout(300)
        # rehab
        await pg.click('[data-act="rehabList"]'); await pg.wait_for_timeout(150); await pg.screenshot(path='68-rehablist.png'); await pg.click('[data-act="rehabView"][data-id="r-hip"]'); await pg.wait_for_timeout(150); await pg.screenshot(path='69-rehab.png'); await pg.click('[data-act="rehabStart"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="rehabGo"]'); await pg.wait_for_selector('#wkPain'); 
        for i in range(2): await pg.click(f'#wkBody [data-act="wkTick"][data-i="{i}"][data-j="0"]'); await pg.wait_for_timeout(100)
        await pg.fill('#wkPain','4'); await pg.dispatch_event('#wkPain','input'); await pg.screenshot(path='70-rehabplayer.png'); await pg.click('[data-act="wkFinish"]'); await cont(pg)
        # physio plan via AI
        await pg.click('[data-act="rehabEnd"]'); await pg.click('[data-act="rehabList"]'); await pg.click('[data-act="rehabCustom"]'); await pg.fill('#rcText','Weeks 1-2: clamshells 3x15 each side, standing hip hikes 2x12 slow'); await pg.click('[data-act="rcGo"]'); await pg.wait_for_selector('#peBody', timeout=15000); print('physio plan:', (await pg.inner_text('#peBody')).replace('\n',' | ')[:200]); await pg.click('[data-act="peSave"]'); await pg.wait_for_timeout(300)
        # routine
        await pg.click('[data-act="routine"][data-id="q-desk"]'); await pg.click('[data-act="rtStart"]'); await pg.wait_for_selector('#rtN'); await pg.wait_for_timeout(1200); await pg.screenshot(path='71-routine.png')
        for i in range(8): await pg.click('[data-act="rtNext"]'); await pg.wait_for_timeout(80)
        await cont(pg)
        # tasks
        await pg.click('[data-act="taskManage"]'); await pg.fill('#tmNew','Creatine'); await pg.click('[data-act="taskAdd"]'); await pg.click('[data-act="taskToggle"][data-k="steps"]'); await pg.click('[data-act="close"]'); await pg.click('button.task[data-act="taskTick"] >> nth=0'); await cont(pg)
        await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.wait_for_timeout(2800); await pg.screenshot(path='72-train-full.png'); await pg.evaluate("document.querySelector('#main').scrollTop=640"); await pg.screenshot(path='73-train-full2.png')
        print('TRAIN:', (await pg.inner_text('#main')).replace('\n',' | ')[:1500])
        await pg.click('[data-act="exLib"]'); await pg.fill('#pkQ','squat'); await pg.wait_for_timeout(150); await pg.click('#pkList [data-id="squat"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='74-exinfo.png'); print('exinfo:', (await pg.inner_text('.sheet-b >> nth=-1')).replace('\n',' | ')[:300])
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); print('db keys:', [k.split('u_test123/')[-1] for k in st.keys()]); tr = st['data/users/u_test123/profile/meta/train']; print('lifts squat', tr['lifts'].get('squat'), 'sess', [(s['n'],s['dur'],s['vol'],s['sets'],s['prs'],s['kind']) for s in tr['sess']], 'rlog', tr['rlog'], 'rehab', tr['rehab'])
        prof = st['data/users/u_test123/profile']; print('prog', prof['prog'], 'st', {k:prof['st'][k] for k in ['sess','prs','rehab','mob','ready','work']}, 'tasks', prof['tasks'])
        print('ERRS', errs); await b.close()
asyncio.run(main())

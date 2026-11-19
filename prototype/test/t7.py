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
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='light')
        await ctx.add_init_script(path='seed.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg); await pg.wait_for_timeout(300); await pg.screenshot(path='80-today-light.png')
        print('header widths ok:', await pg.evaluate("document.querySelector('.top').scrollWidth <= document.querySelector('.top').clientWidth"))
        await pg.click('#chipMode'); await pg.wait_for_selector('.crow'); await pg.wait_for_timeout(2800); await pg.screenshot(path='81-clients.png')
        print('CLIENTS:', (await pg.inner_text('#main')).replace('\n',' | ')[:700])
        await pg.click('.crow[data-id="s1"]'); await pg.wait_for_selector('#ccBody .stat4'); await pg.screenshot(path='82-client.png'); print('CLIENT:', (await pg.inner_text('#ccBody')).replace('\n',' | ')[:900])
        await pg.click('[data-act="coPick"][data-what="prog"]'); await pg.click('[data-act="coPickGo"][data-id="t-ul4"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="coTasks"]'); await pg.click('[data-act="coTaskT"][data-k="steps"]'); await pg.click('[data-act="coTasksSave"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="coTargets"]'); await pg.fill('#ctK','2600'); await pg.fill('#ctP','165'); await pg.click('[data-act="coTargetsSave"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="coDraft"]'); await pg.wait_for_timeout(500); print('draft:', await pg.input_value('#ccMsg')); await pg.click('[data-act="coSend"][data-as="msg"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelector('#ccBody').scrollTop=500"); await pg.screenshot(path='83-client2.png'); await pg.click('[data-act="close"]')
        # add manual client + check-in
        await pg.click('.fab'); await pg.fill('#caN','Sean Murphy'); await pg.fill('#caG','First Hyrox'); await pg.click('[data-act="coAddGo"]'); await pg.wait_for_selector('[data-act="coCheckin"]'); await pg.click('[data-act="coCheckin"]'); await pg.fill('#ckS','3'); await pg.fill('#ckW','81.5'); await pg.fill('#ckN','Solid week'); await pg.click('[data-act="coCheckinSave"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="close"]')
        # library assign to me
        await pg.click('[data-tab="library"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='84-library.png'); await pg.click('[data-act="tplView"][data-id="t-hyrox"]'); await pg.click('[data-act="coAssignFrom"]'); await pg.click('[data-act="coAssignTo"][data-id="me"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="rehabView"][data-id="r-calf"]'); await pg.click('[data-act="coAssignFrom"]'); await pg.click('[data-act="coAssignTo"][data-id="me"]'); await pg.wait_for_timeout(300)
        # message to me
        await pg.click('[data-tab="clients"]'); await pg.click('.crow[data-id="me"]'); await pg.fill('#ccMsg','Deload this week. Two sessions only.'); await pg.click('[data-act="coSend"][data-as="msg"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="close"]')
        # feed + squad
        await pg.click('[data-tab="feed"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='85-feed.png'); await pg.click('[data-act="squad"]'); await pg.wait_for_selector('#sqBody .crow'); await pg.fill('#sqWin','Ten days of logging'); await pg.click('[data-act="squadPost"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="squadKudos"] >> nth=0'); await pg.wait_for_timeout(2800); await pg.screenshot(path='86-squad.png'); print('SQUAD:', (await pg.inner_text('#sqBody')).replace('\n',' | ')[:600])
        await pg.click('[data-act="squadEdit"]'); await pg.fill('#chG','20'); await pg.click('[data-act="squadEditSave"]'); await pg.wait_for_timeout(200); await pg.click('[data-act="close"]')
        # profile
        await pg.click('[data-tab="clients"]'); await pg.click('[data-act="coProfile"]'); await pg.wait_for_selector('#cpBody'); await pg.fill('#cpBody [data-k="name"]','Peter Farrell'); await pg.fill('#cpBody [data-k="tag"]','Strength and conditioning coach'); await pg.fill('#cpBody [data-k="spec"]','Hyrox, field sports'); await pg.fill('#cpBody [data-k="bio"]','I coach hybrid athletes.')
        await pg.click('[data-act="cpQual"]'); await pg.fill('#cqT','Level 4 S&C'); await pg.fill('#cqB','Awarding Body'); await pg.fill('#cqY','2022'); await pg.fill('#cqR','A12345'); await pg.click('[data-act="cpQualSave"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelector('#cpBody').scrollTop=0"); await pg.screenshot(path='87-profile.png'); await pg.evaluate("document.querySelector('#cpBody').scrollTop=900"); await pg.wait_for_timeout(100); await pg.screenshot(path='88-profile2.png'); print('PROFILE PREVIEW:', (await pg.inner_text('#cpPrev')).replace('\n',' | ')[:400]); await pg.click('[data-act="coProfileSave"]'); await pg.wait_for_timeout(300)
        # back to my view
        await pg.click('nav [data-act="modeToggle"]'); await pg.wait_for_selector('.hero2'); await pg.click('[data-tab="train"]'); await pg.wait_for_timeout(2800); await pg.screenshot(path='89-train-coachmsg.png'); print('TRAIN TOP:', (await pg.inner_text('#main')).replace('\n',' | ')[:420])
        await pg.click('[data-tab="quests"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='90-quests-squad.png')
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); print('db keys:', [k.replace('data/users/u_test123/','~') for k in st.keys()])
        co = st['data/users/u_test123/profile/meta/coach']; print('clients:', {k:(v['name'], v.get('prog',{}) and v['prog']['n'], v.get('tasks'), v.get('t')) for k,v in co['clients'].items()}); print('coach/profile:', {k:st['coach/profile'][k] for k in ['name','quals','ch']})
        print('squad doc:', st.get('squad/u_test123')); print('ERRS', errs); await b.close()
asyncio.run(main())

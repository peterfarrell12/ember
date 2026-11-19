import asyncio, json
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        print('  cele:', (await pg.inner_text('.cele h3'))); await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark')
        await ctx.add_init_script(path='seed.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.route('**/unpkg.com/fflate**', lambda r: r.fulfill(path='ff/package/umd/index.js', content_type='application/javascript'))
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg); await pg.wait_for_timeout(300)
        await pg.screenshot(path='40-today.png')
        await pg.click('[data-tab="progress"]'); await pg.click('[data-act="pview"][data-v="weight"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='41-weight.png')
        print('WEIGHT:', (await pg.inner_text('#main')).replace('\n',' | ')[:900])
        await pg.evaluate("document.querySelector('#main').scrollTop=620"); await pg.screenshot(path='42-weight2.png')
        # weigh-in crossing a milestone
        await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.click('[data-act="addWeight"]'); await pg.fill('#wtKg','84.0'); await pg.click('[data-act="saveWeight"]'); await cont(pg)
        await pg.click('[data-act="retune"]'); await pg.wait_for_timeout(200)
        # activity + imports
        await pg.click('[data-act="pview"][data-v="move"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='43-move.png')
        await pg.click('[data-act="openConnections"]')
        for f in ['garmin.csv','strava.csv','whoop.csv','happyscale.csv']:
            async with pg.expect_file_chooser() as fc: await pg.click('[data-act="pickCsv"]')
            await (await fc.value).set_files(f); await pg.wait_for_selector('#impOut .banner'); await pg.wait_for_timeout(250); print(f, '->', await pg.inner_text('#impOut'))
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="pickHealth"]')
        await (await fc.value).set_files('export.zip'); await pg.wait_for_selector('#impOut .banner', timeout=60000); print('health ->', await pg.inner_text('#impOut'))
        # athletedata: setup state then data
        await pg.evaluate("window.__adSetup=true"); await pg.click('.sheet [data-act="adSync"]'); await pg.wait_for_selector('#adOut .card'); print('ad setup ->', (await pg.inner_text('#adOut'))[:200]); await pg.screenshot(path='44-conn.png')
        await pg.evaluate("window.__adSetup=false"); await pg.click('.sheet [data-act="adSync"]'); await pg.wait_for_selector('#adOut .banner', timeout=20000); print('ad sync ->', await pg.inner_text('#adOut')); print('mcp calls:', await pg.evaluate("JSON.stringify(window.__mcp.slice(-4))"))
        await cont(pg); await pg.click('[data-act="close"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='45-move2.png')
        print('MOVE:', (await pg.inner_text('#main')).replace('\n',' | ')[:700])
        # coach
        await pg.click('[data-tab="today"]'); await pg.click('[data-act="coach"]'); await pg.click('[data-act="coachReview"]'); await pg.wait_for_selector('#coachOut h4'); await pg.screenshot(path='46-coach.png')
        ctxp = await pg.evaluate("window.__prompts[window.__prompts.length-1]"); print('COACH CONTEXT tail:', ctxp[-700:])
        await pg.click('[data-act="close"]')
        # ideas
        await pg.click('[data-act="ideas"]'); await pg.click('[data-act="ideasGo"]'); await pg.wait_for_selector('#ideasOut .idea', timeout=20000); await pg.screenshot(path='47-ideas.png')
        await pg.click('[data-act="ideaLog"] >> nth=0'); await pg.wait_for_selector('#revBody .rev'); print('idea review:', await pg.eval_on_selector_all('#revBody .rev .ell', 'e=>e.map(x=>x.innerText)'))
        await pg.fill('#revFix','it was three eggs only'); await pg.click('[data-act="revFix"]'); await pg.wait_for_timeout(600); print('after fix:', await pg.eval_on_selector_all('#revBody .rev .ell', 'e=>e.map(x=>x.innerText)'))
        await pg.click('#revGo'); await cont(pg)
        # photo flow
        await pg.click('.fab')
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="photo"]')
        await (await fc.value).set_files(['barcode.jpg','01-onboard.png']); await pg.wait_for_selector('#phThumbs img'); await pg.fill('#phNote','I ate half'); await pg.screenshot(path='48-photo.png')
        await pg.click('#phGo'); await pg.wait_for_selector('#revBody .rev'); print('photo prompt:', (await pg.evaluate("window.__prompts[window.__prompts.length-1]"))[:260]); await pg.click('#revGo'); await cont(pg)
        # boss
        await pg.click('[data-tab="quests"]'); await pg.click('[data-act="bossPick"]'); await pg.screenshot(path='49-bosspick.png'); await pg.click('[data-act="bossStart"][data-id="still"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-tab="today"]'); await pg.click('[data-act="addExercise"]'); await pg.select_option('#exAct','Running, steady'); await pg.fill('#exMin','160'); await pg.click('[data-act="saveExercise"]'); await cont(pg)
        await pg.click('[data-tab="quests"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='50-quests.png')
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); prof = st['data/users/u_test123/profile']
        print('wts', len(prof['wts']), 'xlog', [(x['d'],x['n'],x['min'],x['k'],x['src']) for x in prof['xlog'][:9]]); print('ms', prof['ms'], 't', prof['t'], 'boss', prof['boss'], 'st', prof['st'], 'ad', prof['ad'])
        print('ERRS', errs); await b.close()
asyncio.run(main())

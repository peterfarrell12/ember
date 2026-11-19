import asyncio, json, sys
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def db(pg): return await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))")
async def main():
    dark = len(sys.argv)>1; sfx='-d' if dark else ''
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.route('**/_blob/**', lambda r: r.fulfill(path='p2.jpg', content_type='image/jpeg'))
        await pg.goto(URL+'#progress'); await pg.wait_for_selector('#main .seg'); await cont(pg)
        # ---- photos, athlete side
        await pg.click('[data-act="pview"][data-v="weight"]'); await pg.wait_for_selector('[data-act="photos"]'); await pg.evaluate("document.querySelector('#main').scrollTop=99999"); await pg.wait_for_timeout(300); await pg.screenshot(path=f'170-weight-photos{sfx}.png')
        await pg.click('[data-act="photos"]'); await pg.wait_for_selector('#phBody [data-act="phAdd"]')
        for i,(f,pose,date,share) in enumerate((('p1.jpg','front','2026-10-20',False),('p3.jpg','side','2026-11-04',False),('p2.jpg','front','',True))):
            async with pg.expect_file_chooser() as fc: await pg.click('#phBody [data-act="phAdd"]')
            await (await fc.value).set_files(f); await pg.wait_for_selector('#phGoBtn'); await pg.click(f'[data-seg="phPose"] [data-val="{pose}"]')
            if date: await pg.fill('#phD', date)
            if share: await pg.click('[data-act="phShareNew"]')
            if i==2: await pg.screenshot(path=f'171-photo-new{sfx}.png')
            await pg.click('#phGoBtn'); await pg.wait_for_selector('#phGoBtn', state='detached'); await cont(pg)
        st = await db(pg); ph = [v for k,v in st.items() if '/photos/' in k]; print('photos:', [(x['d'],x['pose'],x.get('kg'),x.get('sh'),bool(x.get('aid')),bool(x.get('src'))) for x in ph], '| uploads', await pg.evaluate('window.__up'))
        await pg.wait_for_timeout(2700); await pg.screenshot(path=f'172-gallery{sfx}.png')
        await pg.click('#phBody [data-act="phCompare"]'); await pg.wait_for_selector('#cmpBody .cmp'); await pg.fill('#cmpBody input[type=range]','30'); await pg.dispatch_event('#cmpBody input[type=range]','input'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'173-compare{sfx}.png'); print('CMP:', (await pg.inner_text('#cmpBody')).replace('\n',' | ')[:200], '| clip', await pg.evaluate("document.querySelector('#cmpTop').style.clipPath"))
        await pg.click('[data-act="close"] >> nth=-1'); await pg.click('#phBody .pht >> nth=1'); await pg.wait_for_selector('[data-act="phShare"]'); await pg.click('[data-act="phShare"]'); await pg.wait_for_timeout(300)
        await pg.click('#phBody .pht >> nth=2'); await pg.click('[data-act="phDel"]'); await pg.wait_for_timeout(400); st = await db(pg); print('after share+delete:', [(v['d'],v.get('sh')) for k,v in st.items() if '/photos/' in k], '| asset deletes', await pg.evaluate('window.__del'))
        await pg.click('[data-act="close"]')
        # ---- coach view: photos tab for "You", manual client photo, messaging
        await pg.click('#chipYou'); await pg.click('[data-act="modeGo"][data-m="coach"]'); await pg.wait_for_selector('.crow'); await pg.click('.crow[data-id="me"]'); await pg.wait_for_selector('#ccBody'); await pg.click('[data-act="ccTab"][data-t="photos"]'); await pg.wait_for_timeout(300); print('coach sees my shared photos:', len(await pg.query_selector_all('#ccBody .pht'))); await pg.screenshot(path=f'174-coach-photos{sfx}.png')
        await pg.click('[data-act="ccTab"][data-t="notes"]'); await pg.wait_for_timeout(200); await pg.click('#ccBody [data-act="chat"]'); await pg.wait_for_selector('#chBody'); await pg.fill('#chT','Nice work on Day A. Keep the squat depth honest this week.'); await pg.click('[data-act="chatGo"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="close"] >> nth=-1'); await pg.click('[data-act="close"]')
        # sample client thread, manual client message with reply logged
        await pg.click('.crow[data-id="s0"]'); await pg.wait_for_selector('#ccBody'); await pg.click('[data-act="ccTab"][data-t="notes"]'); await pg.click('#ccBody [data-act="chat"]'); await pg.wait_for_selector('#chBody .bub'); print('sample thread bubbles:', len(await pg.query_selector_all('#chBody .bub')), '| mine', len(await pg.query_selector_all('#chBody .bub.me')))
        await pg.fill('#chT','How are the legs after Sunday?'); await pg.click('[data-act="chatGo"]'); await pg.wait_for_timeout(300); await pg.click('[data-seg="chatAs"] [data-val="u"]'); await pg.fill('#chT','Tired but fine. Ready for Thursday.'); await pg.click('[data-act="chatGo"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'175-chat-coach{sfx}.png'); print('after: bubbles', len(await pg.query_selector_all('#chBody .bub')))
        await pg.click('[data-act="chatDraft"]'); await pg.wait_for_timeout(800); print('draft:', (await pg.input_value('#chT'))[:80]); await pg.click('[data-act="close"] >> nth=-1'); await pg.click('[data-act="close"]')
        await pg.click('nav [data-tab="feed"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'176-inbox{sfx}.png'); print('INBOX:', (await pg.inner_text('#main section >> nth=0')).replace('\n',' | ')[:300])
        # ---- back to my view: unread message, reply
        await pg.click('nav [data-act="modeToggle"]'); await pg.wait_for_selector('.hero2'); await pg.wait_for_timeout(300); print('TODAY strip:', (await pg.inner_text('.pstrip.hot')).replace('\n',' | ')); await pg.screenshot(path=f'177-today-msg{sfx}.png')
        await pg.click('.pstrip.hot'); await pg.wait_for_selector('#chBody .bub'); await pg.fill('#chT','Will do. Depth felt better with the pause.'); await pg.click('[data-act="chatGo"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'178-chat-me{sfx}.png'); await pg.click('[data-act="close"]'); await pg.wait_for_timeout(300)
        print('unread strip gone on Today:', await pg.query_selector('.pstrip.hot') is None)
        await pg.click('#chipYou'); await pg.click('[data-act="modeGo"][data-m="coach"]'); await pg.wait_for_selector('.crow'); print('coach row badge:', (await pg.inner_text('.crow[data-id="me"] .cr')).replace('\n',' '))
        st = await db(pg); pr = st['data/users/u_test123/profile']; print('thread:', [(m['f'], m['t'][:24]) for m in pr['thread']]); cl=[v for k,v in st.items() if '/cl/' in k and v.get('id')=='s0'][0]; print('s0 thread len', len(cl.get('thread',[])))
        await pg.reload(); await pg.wait_for_selector('.crow'); await pg.click('nav [data-act="modeToggle"]'); await pg.wait_for_selector('.hero2'); await pg.click('#chipYou'); await pg.click('[data-act="photos"]'); await pg.wait_for_selector('#phBody .pht'); print('after reload photos:', len(await pg.query_selector_all('#phBody .pht')))
        print('ERRS', errs); await b.close()
asyncio.run(main())

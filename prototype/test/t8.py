import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}); await ctx.add_init_script(path='seed2.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('http://127.0.0.1:8765/index.html#train'); await pg.wait_for_selector('[data-act="ready"]'); await pg.wait_for_timeout(1200)
        while await pg.query_selector('.cele'): await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
        print('mode chip hidden:', await pg.evaluate("document.querySelector('#chipMode').classList.contains('hide')"))
        print('TRAIN:', (await pg.inner_text('#main')).replace('\n',' | ')[:330]); print('COACH CARD:', (await pg.inner_text('#main')).replace('\n',' | ')[-420:])
        await pg.click('[data-act="review"]'); await pg.click('[data-seg="rvS"] [data-val="4"]'); await pg.fill('#rvT','Clear plans and honest feedback.'); await pg.click('[data-act="reviewSave"]'); await pg.wait_for_timeout(600)
        await pg.click('#chipYou'); await pg.click('[data-act="setCoachName"]'); await pg.fill('#cnN','Aoife'); await pg.click('[data-act="setCoachNameSave"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-tab="quests"]'); await pg.click('[data-act="squad"]'); await pg.wait_for_selector('#sqBody .crow'); await pg.wait_for_timeout(400); print('SQUAD:', (await pg.inner_text('#sqBody')).replace('\n',' | ')[:420])
        st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); print('keys:', [k for k in st.keys() if not k.startswith('data/')]); print('review:', st.get('reviews/u_test123')); c = st.get('clients/u_test123'); print('client status:', c and {k:c[k] for k in ['name','goal']}, c and {k:c['st'][k] for k in ['progN','plan7','kcalT','protT']})
        prof = st['data/users/u_test123/profile']; print('prog', prof['prog'], 'tasks', prof['tasks'], 't', prof['t'], 'asg', prof['asg']); print('ERRS', errs); await b.close()
asyncio.run(main())

import asyncio, json, sys
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def db(pg): return await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))")
async def say(pg, text, wait=900):
    await pg.fill('#asT', text); await pg.click('[data-act="asGo"]'); await pg.wait_for_timeout(wait); await cont(pg)
async def last(pg, n=3): return ' || '.join([ (await e.inner_text()).replace('\n',' ') for e in (await pg.query_selector_all('#asBody > *'))[-n:] ])[:520]
async def main():
    dark = len(sys.argv)>1; sfx='-d' if dark else ''
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg); await pg.wait_for_selector('#asFab:not(.hide)'); await pg.screenshot(path=f'180-fab{sfx}.png')
        await pg.click('#asFab'); await pg.wait_for_selector('#asBody .bub'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'181-as-open{sfx}.png'); print('speaker btn visible:', await pg.is_visible('#asSpk'), '| mic:', await pg.is_visible('#asMic'))
        await say(pg, 'I had a fry this morning'); print('1:', await last(pg, 2), '| chips:', (await pg.inner_text('#asChips')).replace('\n',' | '))
        await pg.click('#asChips [data-act="asChip"] >> nth=0'); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'182-as-card{sfx}.png'); print('2 card:', (await pg.inner_text('.as-card')).replace('\n',' | ')[:420])
        await say(pg, 'It was three sausages', 1500); print('3 card:', (await pg.inner_text('.as-card')).replace('\n',' | ')[:200])
        await say(pg, 'yes', 1200); d = await db(pg); dk = sorted(k for k in d if '/days/' in k)[-1]; print('4:', await last(pg, 1)); print('   diary:', [(e['n'][:28], e['g'], e['k'], e['m'], e['src']) for e in d[dk]['e']])
        await pg.wait_for_timeout(300); await pg.screenshot(path=f'183-as-logged{sfx}.png')
        await say(pg, 'add 500 ml of water'); await say(pg, 'a flat white with oat milk', 1200); await say(pg, 'padel tomorrow at eight'); await say(pg, 'I weighed 85.4 this morning'); print('5:', await last(pg, 8))
        await say(pg, 'remove the butter', 1000); print('6 card:', (await pg.inner_text('.as-card')).replace('\n',' | ')); await pg.click('[data-act="asYes"]'); await pg.wait_for_timeout(600)
        await say(pg, 'how am I doing today?'); print('7:', await last(pg, 2))
        d = await db(pg); day = d[dk]; pr = d['data/users/u_test123/profile']; print('water', day['w'], '| cf', [(c['n'], c['mg']) for c in day.get('cf', [])], '| entries', [(e['n'][:22], e['k']) for e in day['e']], '| events', [(e['t'], e['d'], e['tm']) for e in pr['plan']['ev']], '| last weight', pr['wts'][-1])
        print('spoken:', len(await pg.evaluate('window.__spoken || []')), '| e.g.', (await pg.evaluate('(window.__spoken || []).slice(-1)[0]'))[:90])
        pm = await pg.evaluate('(window.__asPrompts || []).slice(-1)[0]'); i = pm.index('Now:'); print('PROMPT STATE:', pm[i:i+700].replace('\n',' / '))
        # voice in: mic -> dictation stand-in -> auto send
        await pg.click('#asMic'); await pg.wait_for_timeout(600); await pg.screenshot(path=f'184-as-listen{sfx}.png'); print('live:', await pg.inner_text('#asLive')); await pg.wait_for_timeout(2600); print('8 voice:', await last(pg, 2))
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(500); print('sheets:', len(await pg.query_selector_all('.scrim')), '| hero:', (await pg.inner_text('.hero2 .h-kv')).replace('\n',' '))
        await pg.click('#chipYou'); await pg.click('[data-act="modeGo"][data-m="coach"]'); await pg.wait_for_selector('.crow'); print('fab hidden in coach view:', not await pg.is_visible('#asFab'))
        print('ERRS', errs); await b.close()
asyncio.run(main())

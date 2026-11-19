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
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(URL+'#today'); await pg.wait_for_selector('.hero2'); await cont(pg)
        for i, note in enumerate(['a can of guinness', 'heineken', 'dunnes tikka']):
            await pg.evaluate('window.__pickPrompt = null')
            await pg.click('.fab'); await pg.wait_for_selector('#addList')
            async with pg.expect_file_chooser() as fc: await pg.click('[data-act="photo"]')
            await (await fc.value).set_files('p1.jpg'); await pg.wait_for_selector('#phGo:not([disabled])')
            await pg.fill('#phNote', note); await pg.click('#phGo'); await pg.wait_for_selector('#revGo', timeout=30000); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'22{i}-brand.png')
            print(note.upper(), '=>', (await pg.inner_text('.scrim:last-child .sheet-b')).replace('\n',' | ')[:420])
            print('   tie-break asked:', bool(await pg.evaluate('window.__pickPrompt')), '| link:', await pg.evaluate("(document.querySelector('.scrim:last-child .banner a')||{}).href || null"))
            if i == 0:
                await pg.click('#revGo'); await cont(pg); d = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); dk = sorted(k for k in d if '/days/' in k)[-1]; print('   diary:', [(e['n'], e['b'], e['g'], round(e['k']), e['src']) for e in d[dk]['e']][-1])
            else:
                await pg.evaluate("document.querySelectorAll('.scrim').forEach(s => s.querySelector('[data-act=\"close\"]') && s.querySelector('[data-act=\"close\"]').click())"); await pg.wait_for_timeout(400)
                while await pg.query_selector('.scrim'): await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        print('ERRS', errs); await b.close()
asyncio.run(main())

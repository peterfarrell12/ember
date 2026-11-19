import asyncio, json
from playwright.async_api import async_playwright
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
        await pg.click('.fab'); await pg.wait_for_selector('#addList')
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="photo"]')
        await (await fc.value).set_files('big.jpg'); await pg.wait_for_selector('#phGo:not([disabled])')
        # failure keeps the photo
        await pg.fill('#phNote', 'ITEMFAIL'); await pg.click('#phGo'); await pg.wait_for_selector('.sheet .banner'); print('FAIL banner:', (await pg.inner_text('.sheet .banner')).replace('\n',' '), '| thumbs', len(await pg.query_selector_all('#phThumbs img')), '| btn:', await pg.inner_text('#phGo')); await pg.screenshot(path='190-photo-fail.png')
        print('image sent:', await pg.evaluate('window.__img'))
        await pg.fill('#phNote', 'my pret sandwich'); await pg.click('#phGo'); await pg.wait_for_selector('#revGo', timeout=20000); await pg.wait_for_timeout(300); await pg.screenshot(path='191-photo-label.png'); print('REVIEW:', (await pg.inner_text('.scrim:last-child .sheet-b')).replace('\n',' | ')[:330])
        await pg.click('#revGo'); await cont(pg); d = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); dk = sorted(k for k in d if '/days/' in k)[-1]; print('diary:', [(e['n'], e['b'], e['g'], e['k'], e['p'], e['c'], e['f'], e['src']) for e in d[dk]['e']]); print('recent top:', d['data/users/u_test123/profile']['rec'][0]['n'], d['data/users/u_test123/profile']['rec'][0]['src'])
        await pg.wait_for_timeout(300); print('entry row:', (await pg.inner_text('.entry >> nth=0')).replace('\n',' | '))
        print('ERRS', errs); await b.close()
asyncio.run(main())

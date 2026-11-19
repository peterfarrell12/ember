import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        async def zx(route):
            print('zxing requested:', route.request.url); await route.fulfill(path='zx/package/umd/index.min.js', content_type='application/javascript')
        await pg.route('**/unpkg.com/**', zx)
        await pg.goto('http://127.0.0.1:8765/index.html'); await pg.wait_for_selector('#tgBody'); await pg.click('[data-act="saveTargets"]'); await pg.wait_for_timeout(400); await pg.click('[data-act="celeNext"]')
        print('BarcodeDetector in window:', await pg.evaluate("'BarcodeDetector' in window"))
        await pg.click('.fab'); await pg.click('[data-act="barcode"]')
        async with pg.expect_file_chooser() as fc: await pg.click('[data-act="bcPhoto"]')
        await (await fc.value).set_files('barcode.jpg')
        await pg.wait_for_selector('#fdNut', timeout=30000)
        print('decoded ->', await pg.inner_text('.sheet-h h3 >> nth=-1')); print('ERRS', errs); await b.close()
asyncio.run(main())

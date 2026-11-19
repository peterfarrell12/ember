import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}); await ctx.add_init_script(path='seed.js'); await ctx.add_init_script(path='mock.js')
        pg = await ctx.new_page(); pg.on('console', lambda m: print('CONSOLE', m.type, m.text[:300]) if 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('http://127.0.0.1:8765/index.html#train'); await pg.wait_for_selector('[data-act="ready"]'); await pg.wait_for_timeout(500)
        while await pg.query_selector('.cele'): await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act="progs"]'); await pg.click('[data-act="progNew"]'); await pg.fill('#peBody [data-on="peName"]','My push day'); await pg.click('[data-act="peAdd"]'); await pg.fill('#pkQ','bench'); await pg.wait_for_timeout(200)
        print('list:', (await pg.inner_text('#pkList'))[:120]); await pg.click('#pkList .res >> nth=0'); await pg.wait_for_timeout(300)
        print('sheets:', await pg.evaluate("document.querySelectorAll('#sheets .scrim').length"), '| peBody:', (await pg.inner_text('#peBody'))[:200] if await pg.query_selector('#peBody') else None)
        await b.close()
asyncio.run(main())

import asyncio, json, sys
from playwright.async_api import async_playwright
QS=sys.argv[1:] or ['rice','chicken breast','egg','eggs','milk','semi skimmed milk','bread','apple','porridge','pasta','coffee','potato','cheddar','salmon','avocado','olive oil','butter','yoghurt','crisps','tayto','brennans','guinness','pizza','mince','chips','rasher','weetabix','protein bar','banana','steak','toast','tea','orange juice','beef']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox']); pg = await b.new_page()
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('http://127.0.0.1:8765/index.html'); await pg.wait_for_function('window.EmberDebug')
        await pg.evaluate("Promise.all([EmberDebug.loadDB('gen'),EmberDebug.loadDB('br')])")
        for q in QS:
            r = await pg.evaluate("q=>{const t=performance.now();const r=EmberDebug.searchAll(q,5);return {ms:Math.round(performance.now()-t),gen:r.gen.map(x=>x.food.n+' ['+x.food.k+']'),br:r.br.slice(0,3).map(x=>x.food.n+' ('+x.food.b+') ['+x.food.k+']')}}", q)
            print(f"{q} ({r['ms']}ms)\n   GEN: "+' | '.join(r['gen'])+"\n   BR:  "+' | '.join(r['br']))
        await b.close()
asyncio.run(main())

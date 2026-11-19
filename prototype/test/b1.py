import asyncio, json
from harness import async_playwright, TODAY
CASES = [
 ("Guinness","Draught 0.0 alcohol free stout",17),("Guinness","0.0 non-alcoholic stout",20),("Guinness","Guinness 0.0",35),("Guinness","Draught stout",36),
 ("Coca-Cola","Zero Sugar",0),("Coca-Cola","Original Taste",42),("Heinz","Baked Beanz in tomato sauce",80),("Tayto","Cheese & Onion crisps",520),
 ("Cadbury","Dairy Milk chocolate",534),("Fulfil","Chocolate Salted Caramel protein bar",370),("Avonmore","Protein Milk",50),("Brennans","Wholemeal bread",230),
 ("Glenisk","Organic Greek style natural yoghurt 0% fat",60),("Kerrygold","Butter",720),("Pret A Manger","Chicken Caesar and bacon baguette",240),("Red Bull","Sugarfree energy drink",3),
 ("Monster","Ultra Zero energy drink",2),("Flahavan's","Progress Oatlets porridge oats",370),("Lucozade","Sport Orange",28),("Barry's","Gold Blend tea",1),
 ("Heineken","0.0 alcohol free lager",21),("Dunnes Stores","Chicken tikka masala with rice ready meal",130),("Zzyzx Farms","Mystery bar",400),("Ballygowan","Still water",0),
 ("Nutella","Hazelnut spread",539),("Weetabix","Original",362),("Koka","Chicken noodles",450),("Pringles","Sour Cream & Onion",530),("Red Bull","Energy Drink",46),("Coca-Cola","Coke",42),("Coca-Cola","Diet Coke",0),("Guinness","Draught",36),("Jacob's","Cream Crackers",440),("Denny","Gold Medal sausages",280),("Clonakilty","Blackpudding",300),("Fulfil","Peanut Butter protein bar",380),("Cadbury","Dairy Milk Caramel",490),("Avonmore","Fresh Milk",64)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome'); pg = await b.new_page()
        await pg.add_init_script(path='mock.js'); await pg.add_init_script(path='seed.js')
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_selector('nav.tabs'); 
        res = await pg.evaluate('''async (cases) => { const E = window.EmberDebug; await Promise.all([E.loadDB('gen'), E.loadDB('br'), E.loadDB('more')]); const t0 = performance.now();
          const out = cases.map(([b, n, k]) => { const bf = E.brandFind(b, n, {k}); const m = E.matchItem({brand: b, name: n, grams: 100, kcal100: k, p100: 1, c100: 1, f100: 1, packaged: true, known: true});
            return [b + ' | ' + n, bf ? (bf.conf ? 'SURE ' : 'maybe ') + bf.cov.toFixed(2) + ' ' + bf.food.n + ' (' + bf.food.b + ') ' + bf.food.k : 'no brand', '=> ' + m.food.src + ' ' + m.food.n + ' ' + m.food.k + (m.unsure ? ' [ask: ' + m.alts.map(a => a.n).join(' / ').slice(0, 150) + ']' : '')]; });
          return { ms: Math.round(performance.now() - t0), out }; }''', CASES)
        print('ms', res['ms'])
        for r in res['out']: print(r[0]); print('   ', r[1]); print('   ', r[2])
        await b.close()
asyncio.run(main())

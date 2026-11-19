import asyncio, json, sys, datetime
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8765/index.html'
async def cont(pg):
    await pg.wait_for_timeout(350)
    while await pg.query_selector('.cele'):
        await pg.click('[data-act="celeNext"]'); await pg.wait_for_timeout(200)
async def prof(pg):
    st = await pg.evaluate("JSON.parse(localStorage.getItem('mockdb'))"); return st['data/users/u_test123/profile']
async def main():
    dark = len(sys.argv)>1; sfx='-d' if dark else ''
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme='dark' if dark else 'light')
        for f in ('seed.js','seed3.js','mock.js'): await ctx.add_init_script(path=f)
        pg = await ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'ERR_FAILED' not in m.text else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        wd = datetime.date.today().weekday(); days = sorted({wd, (wd+2)%7, (wd+4)%7})
        await pg.goto(URL+'#train'); await pg.wait_for_selector('.thero'); await cont(pg)
        await pg.click('[data-act="progs"]'); await pg.click('[data-act="tplView"][data-id="t-full3"]'); await pg.click('[data-act="progUse"]'); await pg.wait_for_timeout(300)
        await pg.click('.th-links [data-act="cal"]'); await pg.wait_for_selector('#calBody .pwk'); await pg.screenshot(path=f'160-plan-empty{sfx}.png'); await pg.click('[data-seg="calMode"] [data-val="month"]'); await pg.wait_for_selector('#calBody .calgrid')
        for d in days: await pg.click(f'.wds [data-wd="{d}"]'); await pg.wait_for_timeout(120)
        await pg.fill('#calTm','18:00'); await pg.dispatch_event('#calTm','input'); await pg.wait_for_timeout(200)
        pr = await prof(pg); print('plan:', {k:v for k,v in pr['plan'].items() if k in ('days','tm','since','rehab')})
        await pg.evaluate("document.querySelector('#calBody').scrollTop=0"); print('TODAY ITEMS:', (await pg.inner_text('#calBody section:nth-of-type(1)')).replace('\n',' | ')[:260])
        marks = await pg.evaluate("[...document.querySelectorAll('.cd')].filter(c=>c.querySelector('.cm i')).length"); print('cells with marks:', marks)
        # select the next planned day, move it, skip, put back
        nxt = (datetime.date.today()+datetime.timedelta(days=2)).isoformat(); await pg.click(f'.cd[data-date="{nxt}"]'); await pg.wait_for_timeout(150); print('NEXT DAY:', (await pg.inner_text('#calBody section:nth-of-type(1)')).replace('\n',' | ')[:200])
        await pg.click('[data-act="calMove"]'); await pg.wait_for_selector('[data-act="calMoveTo"]'); tgt = (datetime.date.today()+datetime.timedelta(days=3)).isoformat(); await pg.click(f'[data-act="calMoveTo"][data-to="{tgt}"]'); await pg.wait_for_timeout(300); print('after move sel:', (await pg.inner_text('#calBody section:nth-of-type(1)')).replace('\n',' | ')[:160]); pr = await prof(pg); print('moved:', pr['plan']['moved'])
        await pg.click('[data-act="calSkip"]'); await pg.wait_for_timeout(300); pr = await prof(pg); print('skip:', pr['plan']['skip'], 'moved:', pr['plan']['moved'])
        await pg.click(f'.cd[data-date="{nxt}"]'); await pg.wait_for_timeout(150); print('skipped day:', (await pg.inner_text('#calBody section:nth-of-type(1)')).replace('\n',' | ')[:160]); await pg.click('[data-act="calUnskip"]'); await pg.wait_for_timeout(200)
        # events: weekly match today, one-off physio tomorrow
        await pg.click('[data-act="calToday"]'); await pg.click('#calBody [data-act="calEv"]'); await pg.fill('#evT','Padel doubles'); await pg.click('[data-seg="evRep"] [data-val="week"]'); await pg.fill('#evTm','20:00'); await pg.fill('#evMin','90'); await pg.screenshot(path=f'161-event{sfx}.png'); await pg.click('[data-act="calEvSave"]'); await pg.wait_for_timeout(300)
        tm = (datetime.date.today()+datetime.timedelta(days=1)).isoformat(); await pg.click(f'.cd[data-date="{tm}"]'); await pg.click('#calBody [data-act="calEv"]'); await pg.click('#evKinds [data-v="appt"]'); await pg.fill('#evT','Physio'); await pg.fill('#evTm','09:30'); await pg.click('[data-act="calEvSave"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="calToday"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'162-cal-month{sfx}.png'); print('TODAY NOW:', (await pg.inner_text('#calBody section:nth-of-type(1)')).replace('\n',' | ')[:300])
        await pg.click('[data-act="calTick"]'); await pg.wait_for_timeout(300); print('tick toast:', (await pg.inner_text('#toasts')).replace('\n',' | ')); pr = await prof(pg); print('done keys:', list(pr['plan']['done'].keys()), 'ev:', [(e['t'],e['k'],e.get('wd'),e.get('d'),e['tm']) for e in pr['plan']['ev']])
        await pg.click('[data-seg="calMode"] [data-val="plan"]'); await pg.wait_for_selector('#calBody .pwk'); await pg.wait_for_timeout(2600); await pg.screenshot(path=f'163-plan{sfx}.png'); print('plan rows:', len(await pg.query_selector_all('.pr')), '| weeks', len(await pg.query_selector_all('.pwk')), '| HEAD:', (await pg.inner_text('#calBody .thero')).replace('\n',' | ')[:200])
        print('THIS WEEK:', (await pg.inner_text('.pwk >> nth=0')).replace('\n',' | ')[:330])
        await pg.click('.pr.train:not(.done) >> nth=1'); await pg.wait_for_selector('.sheet-f [data-act="calMove"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'168-plan-detail{sfx}.png'); print('DETAIL:', (await pg.inner_text('.scrim:last-child .sheet')).replace('\n',' | ')[:260]); await pg.click('[data-act="close"] >> nth=-1')
        await pg.click('[data-act="calMore"][data-n="1"]'); await pg.wait_for_timeout(150); print('weeks after more:', len(await pg.query_selector_all('.pwk')))
        await pg.click('[data-seg="calMode"] [data-val="month"]'); await pg.click('[data-act="calNav"][data-n="1"]'); await pg.wait_for_timeout(150); print('next month:', await pg.inner_text('#calBody .sec-h'), 'cells', len(await pg.query_selector_all('.cd'))); await pg.click('[data-act="calNav"][data-n="-1"]')
        await pg.evaluate("document.querySelector('#calBody').scrollTop=99999"); await pg.wait_for_timeout(200); await pg.screenshot(path=f'164-cal-pattern{sfx}.png')
        await pg.click('[data-act="close"]'); await pg.wait_for_timeout(4600)
        await pg.evaluate("document.querySelector('#main').scrollTop=0"); await pg.screenshot(path=f'165-train-plan{sfx}.png'); print('STRIP:', (await pg.inner_text('.tweek-w')).replace('\n',' | ')); print('HERO k:', await pg.inner_text('.thero .th-k'))
        await pg.click('[data-tab="today"]'); await pg.wait_for_selector('.hero2'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'166-today-plan{sfx}.png'); print('PSTRIP:', (await pg.inner_text('.pstrip')).replace('\n',' | ')); nx = await pg.query_selector('.next'); print('NEXT:', (await nx.inner_text()).replace('\n',' | ') if nx else None)
        # do the session from the calendar, then check it shows done
        await pg.click('#chipCal'); await pg.wait_for_selector('#calBody .pwk'); await pg.click('.pr.train:not(.done) >> nth=0'); await pg.click('[data-act="calStart"]'); await pg.wait_for_selector('#wkBody .setrow')
        for j in range(2): await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="w"]','100'); await pg.fill(f'#wkBody [data-i="0"][data-j="{j}"][data-f="r"]','6'); await pg.click(f'#wkBody [data-act="wkTick"][data-i="0"][data-j="{j}"]'); await pg.wait_for_timeout(80)
        await pg.click('[data-act="wkFinish"]'); await cont(pg); await pg.click('[data-tab="today"]'); await pg.click('.datenav [data-act="cal"]'); await pg.wait_for_selector('#calBody'); print('AFTER SESSION:', (await pg.inner_text('.pwk >> nth=0')).replace('\n',' | ')[:260]); await pg.wait_for_timeout(2600); await pg.screenshot(path=f'167-cal-done{sfx}.png')
        await pg.reload(); await pg.wait_for_selector('.hero2'); await cont(pg); print('after reload pstrip:', (await pg.inner_text('.pstrip')).replace('\n',' | '))
        print('ERRS', errs); await b.close()
asyncio.run(main())

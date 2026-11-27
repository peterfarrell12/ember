// The first run in a real browser: the health information screen with a date of birth, the targets sheet
// with its floors, one thing logged straight away, "Day 1", the reminder time, Ember AI asked at first use,
// and the training set-up. Ember AI is scripted (prototype/test/mock.js).
//   node web/test/browser/onboarding.e2e.mjs  (after a build)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const web = fileURLToPath(new URL('../..', import.meta.url));
const proto = fileURLToPath(new URL('../../../prototype/test/', import.meta.url));

const server = spawn('python3', ['-m', 'http.server', '8796'], { cwd: path.join(web, 'dist'), stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const APP = 'http://127.0.0.1:8796/index.html#today';
const results = [];
const step = async (name, run) => {
  try {
    await run();
    results.push(['ok  ', name]);
  } catch (e) {
    results.push([
      'FAIL',
      name +
        '\n      ' +
        String(e && e.message)
          .split('\n')
          .slice(0, 4)
          .join(' | '),
    ]);
  }
};

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
const errs = [];
/** A new person on a new device. `phone` makes the page believe it is inside the phone app. */
const open = async ({ width = 390, phone = false, ai = false } = {}) => {
  const ctx = await browser.newContext({
    viewport: { width, height: 844 },
    permissions: phone ? ['notifications'] : [],
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('ember:device-only', '1');
    localStorage.setItem('ember:guided', '1');
  });
  if (ai) await ctx.addInitScript({ path: proto + 'mock.js' });
  if (phone)
    await ctx.addInitScript(() => {
      // the Capacitor runtime sets isNativePlatform itself when it loads, so the stub holds on to its answer;
      // the plugins then run their browser versions (notifications are allowed for this page)
      const cap = {};
      Object.defineProperty(cap, 'isNativePlatform', { get: () => () => true, set() {}, enumerable: true });
      window.Capacitor = cap;
    });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(APP);
  await pg.waitForSelector('#hcCard');
  return pg;
};
const text = async (pg, sel) => (await pg.innerText(sel)).replace(/\s*\n+\s*/g, ' | ');
const born = async (pg, d, m, y) => {
  await pg.fill('#hcD', d);
  await pg.fill('#hcM', m);
  await pg.fill('#hcY', y);
  await pg.click('#hcGo');
};
const details = async (pg, { sex = 'Female', cm = '168', kg = '74' } = {}) => {
  await pg.waitForSelector('#tgBody');
  await pg.click(`#tgBody button:has-text("${sex}")`);
  await pg.fill('[data-k="cm"]', cm);
  await pg.fill('[data-k="kg"]', kg);
};
const stored = (pg, key) => pg.evaluate(k => JSON.parse(localStorage.getItem('ember:' + k) || 'null'), key);
const logFirstFood = async pg => {
  await pg.waitForSelector('#addBody');
  await pg.fill('#q', 'porridge');
  await pg.waitForSelector('.qadd[data-act="quickPick"]');
  await pg.click('.qadd[data-act="quickPick"]');
};

try {
  const pg = await open();

  await step('health information has its own screen before any question, with nothing ticked for you', async () => {
    const t = await text(pg, '#hcCard');
    assert.match(t, /Your health information/);
    assert.match(t, /kept in the EU/);
    assert.match(t, /Date of birth/);
    assert.match(t, /aged 18 and over/);
    assert.equal(await pg.$('#hcCard input[type="checkbox"]'), null);
    assert.equal(await pg.$('#tgBody'), null, 'the targets sheet waits');
    assert.equal(await pg.isVisible('#tabbar'), false, 'no tab bar yet');
  });

  await step('a date that is not a date is asked for again', async () => {
    await born(pg, '31', '02', '1990');
    assert.match(await text(pg, '#hcMsg'), /date of birth as day, month and year/);
    assert.equal(await pg.$('#tgBody'), null);
  });

  await step('agreeing with a real date opens the targets sheet with the goal first and no age box', async () => {
    await born(pg, '03', '03', '1990');
    await pg.waitForSelector('#tgBody');
    const t = await text(pg, '#tgBody');
    assert.ok(t.indexOf('Goal') < t.indexOf('Sex'), 'goal comes before the details');
    assert.equal(await pg.$('[data-k="age"]'), null, 'age comes from the date of birth');
    assert.match(t, /from your date of birth/);
    const c = await stored(pg, 'meta:consent');
    assert.equal(c.health, true);
    assert.equal(c.ai, undefined, 'Ember AI has not been asked yet');
    assert.ok(!c.mkt, 'no marketing by default');
  });

  await step('the worked-out targets are labelled Estimate and promise no date', async () => {
    await details(pg);
    await pg.waitForFunction(() => /Estimate/.test(document.querySelector('#tgBody').innerText));
    const t = await text(pg, '#tgBody');
    assert.doesNotMatch(t, /Worked out for you/);
    assert.match(t, /Results vary from person to person/);
    assert.doesNotMatch(t, /\b(by|around) \d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
  });

  await step('saving goes straight to logging one thing, not to a celebration', async () => {
    await pg.click('[data-act="saveTargets"]');
    await pg.waitForSelector('#addBody');
    assert.equal(await pg.$('.cele'), null);
    assert.match(await text(pg, '#sheets .scrim:last-child'), /What have you eaten today\?/);
    assert.match(await text(pg, '#obIntro'), /One thing is enough/);
    assert.match(await text(pg, '#obLinks'), /Bring your diary.*Set up your programme.*Nothing yet today/);
    assert.equal((await stored(pg, 'meta:onboarding')).step, 'targets');
  });

  await step('the first food brings "Day 1"', async () => {
    await logFirstFood(pg);
    await pg.waitForSelector('.cele');
    const t = await text(pg, '.cele');
    assert.match(t, /Day 1/);
    assert.match(t, /first food is in/);
    const o = await stored(pg, 'meta:onboarding');
    assert.equal(o.first, 'food');
    assert.equal(o.step, 'reminder', 'in a browser there is no reminder to ask about');
  });

  await step('Today then points at the next meal, and no reminder sheet opens in a browser', async () => {
    while (await pg.$('.cele [data-act="celeNext"]')) {
      await pg.click('.cele [data-act="celeNext"]');
      await pg.waitForTimeout(350);
    }
    await pg.evaluate(() => document.querySelectorAll('#sheets .sheet [data-act="close"]')[0]?.click());
    await pg.waitForTimeout(500);
    assert.doesNotMatch(await text(pg, '#sheets'), /A nudge if you forget/);
    assert.match(await text(pg, '#main'), /Next: add your next meal/);
  });

  await step('You, Your data has Ember AI and emails, both off until chosen', async () => {
    await pg.click('#chipYou');
    await pg.click('[data-act="openData"]');
    await pg.waitForSelector('#consentRows');
    const t = await text(pg, '#consentRows');
    assert.match(t, /Ember AI/);
    assert.match(t, /Emails about Ember/);
    assert.equal(await pg.getAttribute('[data-act="aiToggle"]', 'aria-pressed'), 'false');
    assert.equal(await pg.getAttribute('[data-act="mktToggle"]', 'aria-pressed'), 'false');
    await pg.click('[data-act="mktToggle"]');
    assert.equal(await pg.getAttribute('[data-act="mktToggle"]', 'aria-pressed'), 'true');
    assert.equal((await stored(pg, 'meta:consent')).mkt, true);
  });
  await pg.context().close();

  await step('someone under 18 is stopped kindly and their date of birth is not kept', async () => {
    const p = await open();
    const y = String(new Date().getFullYear() - 16);
    await born(p, '01', '01', y);
    await p.waitForFunction(() => /aged 18 and over/.test(document.querySelector('#main h2')?.textContent || ''));
    assert.match(await text(p, '#main'), /date of birth has not been kept/);
    assert.equal(await stored(p, 'meta:consent'), null);
    await p.reload();
    await p.waitForSelector('.gate-card');
    assert.equal(await p.$('#hcGo'), null, 'still stopped after a reload');
    assert.equal(await p.$('#tgBody'), null);
    await p.context().close();
  });

  await step('a typed calorie target under the floor is not accepted', async () => {
    const p = await open();
    await born(p, '03', '03', '1990');
    await details(p);
    await p.waitForSelector('#tgK');
    await p.fill('#tgK', '900');
    await p.click('[data-act="saveTargets"]');
    await p.waitForTimeout(600);
    assert.equal(await p.$('#addBody'), null, 'not saved');
    assert.match(await text(p, 'body'), /1,?200/);
    await p.context().close();
  });

  await step('at a low body mass index, losing weight is not offered', async () => {
    const p = await open();
    await born(p, '03', '03', '1990');
    await details(p, { cm: '175', kg: '52' });
    await p.waitForTimeout(400);
    const t = await text(p, '#tgBody');
    assert.match(t, /does not set a weight-loss target/);
    assert.match(t, /holds your weight steady/);
    await p.click('[data-act="saveTargets"]');
    await p.waitForSelector('#addBody');
    assert.equal((await stored(p, 'profile')).goal, 'keep');
    await p.context().close();
  });

  await step('in the phone app, the reminder time is asked after Day 1 and saved', async () => {
    const p = await open({ phone: true });
    await born(p, '03', '03', '1990');
    await details(p);
    await p.click('[data-act="saveTargets"]');
    await logFirstFood(p);
    await p.waitForSelector('.cele');
    for (let i = 0; i < 12; i++) {
      if (/A nudge if you forget/.test(await p.innerText('#sheets'))) break;
      const next = await p.$('.cele [data-act="celeNext"]');
      if (next) await next.click();
      else await p.evaluate(() => document.querySelector('#sheets .scrim:last-child [data-act="close"]')?.click());
      await p.waitForTimeout(400);
    }
    assert.match(await text(p, '#sheets'), /A nudge if you forget/);
    await p.click('[data-seg="obRem"] button[data-val="21:00"]');
    await p.click('[data-act="obRemGo"]');
    await p.waitForFunction(() => !/A nudge if you forget/.test(document.querySelector('#sheets').innerText));
    assert.equal((await stored(p, 'meta:onboarding')).step, 'reminder');
    const prof = await stored(p, 'profile');
    if (prof && prof.rem) assert.equal(prof.rem.log.time, '21:00');
    await p.context().close();
  });

  await step('Ember AI asks the first time it is used, and "Not now" sends nothing', async () => {
    const p = await open({ ai: true });
    await born(p, '03', '03', '1990');
    await details(p);
    await p.click('[data-act="saveTargets"]');
    await p.waitForSelector('#addBody');
    const prompts = [];
    p.on('console', m => m.text().startsWith('EMBER_PROMPT') && prompts.push(m.text()));
    await p.fill('#q', '2 eggs and toast');
    await p.waitForSelector('[data-act="sayQ"]');
    await p.click('[data-act="sayQ"]');
    await p.waitForFunction(() => /Use Ember AI\?/.test(document.querySelector('#sheets').innerText));
    const t = await text(p, '#sheets .scrim:last-child');
    assert.match(t, /outside AI service in the United States/);
    assert.doesNotMatch(t, /Claude|Anthropic/);
    await p.click('#sheets .scrim:last-child button:has-text("Not now")');
    await p.waitForTimeout(600);
    assert.equal(prompts.length, 0, 'nothing was sent');
    await p.click('[data-act="sayGo"]');
    await p.waitForFunction(() => /Use Ember AI\?/.test(document.querySelector('#sheets').innerText));
    await p.click('[data-act="aiYes"]');
    await p.waitForFunction(() => !/Use Ember AI\?/.test(document.querySelector('#sheets').innerText));
    await p.waitForTimeout(800);
    assert.ok(prompts.length > 0, 'allowed, so the request went');
    await p.context().close();
  });

  await step('Train starts with three questions and shows the programme that fits first', async () => {
    const p = await open();
    await born(p, '03', '03', '1990');
    await details(p);
    await p.click('[data-act="saveTargets"]');
    await p.waitForSelector('#obLinks');
    await p.click('[data-act="obTrain"]');
    await p.waitForFunction(() => /Find your programme/.test(document.querySelector('#sheets').innerText));
    await p.click('[data-seg="tsGoal"] button[data-val="hyrox"]');
    await p.click('[data-seg="tsDays"] button[data-val="4"]');
    await p.click('[data-act="trainSetupGo"]');
    await p.waitForFunction(() => /Best fit/.test(document.querySelector('#sheets').innerText));
    const first = await text(p, '#sheets .scrim:last-child .list .res');
    assert.match(first, /Hyrox/i);
    assert.match(first, /Best fit/);
    await p.context().close();
  });

  await step('nothing is wider than the screen at 320 px', async () => {
    const p = await open({ width: 320 });
    const wide = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok((await wide()) <= 0, 'health information');
    await born(p, '03', '03', '1990');
    await details(p);
    assert.ok((await wide()) <= 0, 'targets');
    await p.click('[data-act="saveTargets"]');
    await p.waitForSelector('#obLinks');
    assert.ok((await wide()) <= 0, 'first log');
    await p.context().close();
  });

  await step('no errors on the page', async () => assert.deepEqual(errs, []));
} finally {
  await browser.close();
  server.kill();
}
for (const [s, n] of results) console.log(s, n);
if (errs.length) console.log(errs.join('\n'));
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed} of ${results.length} passed`);
process.exit(failed ? 1 : 0);

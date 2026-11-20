// The voice panel in a real browser: the talk button opens it over the screen you are on, it shows the
// words as they are heard, logs something simple at once with a tick and an Undo, answers a question in
// place, asks before removing anything, and hands the conversation to the chat.
// Speech and Claude are scripted (speech-stub.js and prototype/test/mock.js).
//   node web/test/browser/voice.e2e.mjs  (after a build)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const web = fileURLToPath(new URL('../..', import.meta.url));
const proto = fileURLToPath(new URL('../../../prototype/test/', import.meta.url));
const stub = fileURLToPath(new URL('./speech-stub.js', import.meta.url));

const server = spawn('python3', ['-m', 'http.server', '8794'], { cwd: path.join(web, 'dist'), stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const APP = 'http://127.0.0.1:8794/index.html#today';
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
const open = async (width = 390, height = 844) => {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => localStorage.setItem('ember:device-only', '1'));
  for (const f of ['seed.js', 'seed3.js', 'mock.js']) await ctx.addInitScript({ path: proto + f });
  await ctx.addInitScript({ path: stub });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(APP);
  await pg.waitForSelector('.hero2');
  await pg.waitForSelector('#asFab:not(.hide)');
  return pg;
};
const say = (pg, ...phrases) => pg.evaluate(p => (window.__phrases = p), phrases);
const panel = async pg => (await pg.innerText('#vo')).replace(/\s*\n+\s*/g, ' | ');
const eaten = pg => pg.evaluate(() => document.querySelector('.hero2').innerText.replace(/\s+/g, ' '));
const entries = pg => pg.$$eval('.entry', els => els.length);

try {
  const pg = await open();

  await step('the talk button opens the panel over Today and listens at once', async () => {
    await say(pg, 'I just had a flat white');
    await pg.click('#asFab');
    await pg.waitForSelector('#vo');
    assert.equal(await pg.isVisible('.hero2'), true, 'Today is still on screen');
    assert.equal(await pg.$('#sheets .sheet'), null, 'no sheet opened');
    assert.match(await panel(pg), /Listening/i);
    assert.equal(await pg.isVisible('#asFab'), false, 'the button gives way to the panel');
  });

  await step('the words appear as they are heard', async () => {
    await pg.waitForFunction(() => /I just had a flat white/.test(document.querySelector('#asLive').textContent));
  });

  await step('a coffee is logged straight away: a tick, what was logged, Undo, no toast and no sheet', async () => {
    await pg.waitForSelector('.vo-tick');
    const t = await panel(pg);
    assert.match(t, /Logged Flat white \| 130 mg of caffeine and 78 kcal\./);
    assert.match(t, /Undo/);
    assert.match(t, /\+15 XP/);
    assert.equal(await pg.$('#toasts .toast'), null, 'no toast over the panel');
    assert.equal(await pg.$('.cele'), null, 'the streak celebration waits');
    assert.match(await eaten(pg), /Eaten 78/);
  });

  await step('Undo takes it back off the day', async () => {
    await pg.click('[data-act="voUndo"]');
    await pg.waitForFunction(() => /Undone/.test(document.querySelector('#vo').innerText));
    assert.match(await eaten(pg), /Eaten 0/);
    assert.equal(await entries(pg), 0);
  });

  await step('the microphone in the panel takes the next thing: water', async () => {
    await say(pg, 'add some water');
    await pg.click('#asMic');
    await pg.waitForSelector('.vo-tick');
    assert.match(await panel(pg), /Added 500 ml of water \| 500 of [\d,]+ ml today\./);
  });

  await step('a meal is logged at once and the panel lists what was matched', async () => {
    await say(pg, 'two rashers two sausages an egg and toast');
    await pg.click('#asMic');
    await pg.waitForSelector('.vo-names');
    const t = await panel(pg);
    assert.match(t, /Logged 5 items, [\d,]+ kcal, to breakfast/);
    assert.match(t, /Undo/);
    assert.equal(await entries(pg), 5);
  });

  await step('a question is answered in the panel, and the microphone opens again for the reply', async () => {
    await say(pg, 'how am I doing today', 'remove the butter');
    await pg.click('#asMic');
    await pg.waitForSelector('.vo-say');
    assert.match(await panel(pg), /You have eaten [\d,]+ kcal so far today/);
  });

  await step('removing something asks first', async () => {
    await pg.waitForSelector('#vo [data-act="asYes"]');
    assert.match(await panel(pg), /Remove Butter.*from today\?/);
    assert.equal(await entries(pg), 5, 'nothing removed yet');
  });

  await step('Open chat carries the conversation and the waiting question into the chat', async () => {
    await pg.click('[data-act="voChat"]');
    await pg.waitForSelector('#asBody .bub');
    assert.equal(await pg.$('#vo'), null);
    const chat = (await pg.innerText('#asBody')).replace(/\s*\n+\s*/g, ' | ');
    assert.match(chat, /two rashers two sausages an egg and toast/);
    assert.match(chat, /how am I doing today/);
    assert.match(chat, /Remove Butter.*from today\?/);
  });

  await step('closing the panel lets the waiting celebration through', async () => {
    await pg.waitForSelector('.cele', { timeout: 3000 });
    while (await pg.$('.cele')) {
      await pg.click('[data-act="celeNext"]');
      await pg.waitForTimeout(250);
    }
  });

  await step('the question that came along can be answered in the chat', async () => {
    await pg.click('#asBody [data-act="asYes"]');
    await pg.waitForFunction(() => /Removed Butter/.test(document.querySelector('#asBody').innerText));
    await pg.keyboard.press('Escape');
  });

  await step('a vague meal gets a question with its likely answers as choices; tapping one logs it', async () => {
    const p3 = await open();
    await say(p3, 'I had a fry this morning');
    await p3.click('#asFab');
    await p3.waitForSelector('.vo-opts .vo-chip');
    const t = await panel(p3);
    assert.match(t, /Heard: I had a fry this morning/);
    assert.match(t, /What was in the fry/);
    await p3.click('.vo-opts .vo-chip >> nth=0');
    await p3.waitForSelector('.vo-names');
    assert.match(await panel(p3), /Logged 5 items/);
    await p3.close();
  });

  await step('voice works again after the panel has closed, as a fresh conversation', async () => {
    const p4 = await open();
    await say(p4, 'I had a fry this morning');
    await p4.click('#asFab');
    await p4.waitForSelector('.vo-opts .vo-chip'); // a question is left unanswered
    await p4.click('[data-act="voClose"]');
    await say(p4, 'I just had a flat white');
    await p4.click('#asFab');
    await p4.waitForSelector('.vo-tick');
    assert.match(await panel(p4), /Logged Flat white/);
    const prompts = await p4.evaluate(() => window.__asPrompts),
      talk = prompts[prompts.length - 1].split('Conversation so far:').pop();
    assert.doesNotMatch(talk, /fry/, 'the unanswered question is not carried into the new request');
    assert.match(talk, /flat white/);
    await p4.close();
  });

  await step('stopping the microphone by hand is not reported as a failure; silence is', async () => {
    const p2 = await open(320, 568);
    await p2.click('#asFab');
    await p2.waitForSelector('#vo');
    await p2.click('#asMic'); // stop listening with nothing said
    await p2.waitForFunction(() =>
      /Tap the microphone when you are ready/.test(document.querySelector('#vo').innerText),
    );
    await p2.evaluate(() => (window.__silence = true));
    await p2.click('#asMic'); // listen again: this time nothing is heard and the browser gives up
    await p2.waitForFunction(() => /Nothing heard/.test(document.querySelector('#vo').innerText));
    await p2.evaluate(() => (window.__silence = false));
    const box = await p2.$eval('#vo', el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, wide: document.documentElement.scrollWidth };
    });
    assert.ok(box.left >= 0 && box.right <= 320 && box.wide <= 320, 'fits a 320 px screen');
    await p2.keyboard.press('Escape');
    assert.equal(await p2.$('#vo'), null);
    assert.equal(await p2.isVisible('#asFab'), true, 'the talk button is back');
  });

  await step('no errors on the page', async () => assert.deepEqual(errs, []));
} finally {
  await browser.close();
  server.kill();
}
for (const [s, n] of results) console.log(s, n);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${failed} failed` : `all ${results.length} passed`);
process.exit(failed ? 1 : 0);

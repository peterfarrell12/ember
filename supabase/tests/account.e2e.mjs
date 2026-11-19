// End-to-end check of accounts and sync, in a real browser against the LOCAL Supabase:
// a device with a diary signs in, moves the diary into the account, keeps logging; a second
// browser signs in as the same person and sees the same diary; signing out returns to device-only.
//   cd supabase && npm run start && npm run test:e2e
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const { chromium } = createRequire(import.meta.url)('playwright');
const web = fileURLToPath(new URL('../../web', import.meta.url));
const env = Object.fromEntries(
  execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
    .split('\n')
    .map(l => l.match(/^(\w+)="?(.*?)"?$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]]),
);
assert.match(env.API_URL || '', /^http:\/\/(127\.0\.0\.1|localhost):/, 'this test only runs against a local Supabase');

// build the app pointed at the local Supabase, and serve it
execFileSync('npx', ['vite', 'build', '--outDir', 'dist-local', '--logLevel', 'error'], {
  cwd: web,
  env: { ...process.env, VITE_SUPABASE_URL: env.API_URL, VITE_SUPABASE_KEY: env.ANON_KEY },
  stdio: 'inherit',
});
const server = spawn('python3', ['-m', 'http.server', '8765'], { cwd: web + '/dist-local', stdio: 'ignore' });
const APP = 'http://127.0.0.1:8765/index.html';
await new Promise(r => setTimeout(r, 1000));

const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `e2e-${Date.now()}@example.test`;
const { data: made, error: madeErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (madeErr) throw madeErr;
const uid = made.user.id;
const link = async () => {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: APP },
  });
  if (error) throw error;
  return data.properties.action_link;
};
const rows = async () => (await admin.from('user_docs').select('kind, id, data').eq('user_id', uid)).data;
const until = async (what, test, ms = 8000) => {
  for (const end = Date.now() + ms; Date.now() < end;) {
    if (await test()) return;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('timed out waiting for: ' + what);
};
const logFood = async (pg, q) => {
  await closeSheets(pg);
  await pg.click('.fab');
  await pg.fill('#q', q);
  await pg.click('#addList .res >> nth=0');
  await pg.click('#fdGo');
  await pg.waitForTimeout(600);
  await closeSheets(pg);
};
// the tab bar is in the page from the start; the diary is ready when the start-up screen has gone
const ready = async pg => {
  await pg.waitForSelector('nav.tabs .tab');
  await pg.waitForFunction(
    () => !document.querySelector('#main .boot') && document.querySelector('#main').children.length > 0,
  );
};
const closeSheets = async pg => {
  for (let i = 0; i < 6; i++) {
    // a celebration (streak, level) or an open sheet sits over the screen: dismiss whichever is there
    if (await pg.locator('[data-act="celeNext"]').count()) await pg.click('[data-act="celeNext"]');
    else if (await pg.locator('.sheet').count()) await pg.keyboard.press('Escape');
    else break;
    await pg.waitForTimeout(300);
  }
};

const extra = [];
const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
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
          .slice(0, 6)
          .join(' | '),
    ]);
  }
};
try {
  const phone = { viewport: { width: 390, height: 844 } };
  const a = await (await browser.newContext(phone)).newPage();
  const errs = [];
  a.on('pageerror', e => errs.push(String(e)));
  const setUp = async pg => {
    await pg.waitForSelector('#tgBody');
    await pg.fill('[data-k="age"]', '34');
    await pg.fill('[data-k="cm"]', '183');
    await pg.fill('[data-k="kg"]', '86');
    await pg.click('[data-act="saveTargets"]');
    await pg.click('[data-act="celeNext"]');
  };
  const entries = async () => ((await rows()).find(x => x.kind === 'days') || { data: { e: [] } }).data.e.length;

  await step('before sign-in there is only the sign-in screen', async () => {
    await a.goto(APP);
    await a.waitForSelector('#siEmail');
    assert.match(await a.innerText('#main'), /Sign in to Ember[\s\S]*No password needed[\s\S]*Email me a link/);
    assert.equal(await a.locator('#tgBody').count(), 0, 'no setup before sign-in');
    for (const sel of ['nav.tabs', '#chipYou', '#chipCal', '#sync'])
      assert.equal(await a.isVisible(sel), false, sel + ' is hidden');
    await a.click('[data-act="signInGo"]');
    assert.equal(await a.locator('#siEmail').count(), 1, 'an empty email is not accepted');
  });
  await step(
    'opening the emailed link signs in; a new account goes through setup and saves to the account',
    async () => {
      await a.goto(await link());
      await setUp(a);
      await logFood(a, 'banana');
      await until('profile and day rows', async () => {
        const r = await rows();
        return r.some(x => x.kind === 'profile') && r.some(x => x.kind === 'days' && x.data.e.length === 1);
      });
      for (const sel of ['nav.tabs', '#chipYou']) assert.equal(await a.isVisible(sel), true, sel + ' is back');
      assert.equal(await a.locator('.banner[data-act="signIn"]').count(), 0);
    },
  );
  await step('what is logged next is saved to the account', async () => {
    await logFood(a, 'porridge');
    await until('two entries in the day row', async () => (await entries()) === 2);
  });
  await step('logging with no connection is kept, shown as offline, and sent on reconnect', async () => {
    await a.context().setOffline(true);
    await logFood(a, 'apple');
    await a.waitForTimeout(1500);
    assert.match(await a.getAttribute('#sync', 'title'), /^Offline\. Your changes are kept on this device/);
    assert.equal(await entries(), 2, 'nothing reached the server while offline');
    await a.context().setOffline(false);
    await until('three entries on the server', async () => (await entries()) === 3, 40000);
    await until(
      'the offline mark clears',
      async () => (await a.getAttribute('#sync', 'title')) === 'Saved to your account',
    );
  });
  await step('a write that never got through survives closing and reopening the app', async () => {
    // let reads through, drop every write
    const block = r => (r.request().method() === 'GET' ? r.continue() : r.abort());
    await a.route('**/rest/v1/user_docs**', block);
    await logFood(a, 'orange');
    await a.waitForTimeout(1200);
    assert.equal(await entries(), 3, 'the write did not reach the server');
    await a.reload();
    await ready(a);
    await closeSheets(a);
    // all four foods were logged in the same meal slot; the meal card counts them
    assert.match(await a.innerText('#main'), /4 foods/, 'the unsent entry still shows after reopening');
    await a.unroute('**/rest/v1/user_docs**', block);
    await a.evaluate(() => window.dispatchEvent(new Event('online')));
    await until('four entries on the server', async () => (await entries()) === 4, 40000);
  });
  await step('a second browser signed in as the same person sees the same diary, with no setup', async () => {
    const b = await (await browser.newContext(phone)).newPage();
    await b.goto(await link());
    await ready(b);
    await b.waitForTimeout(800);
    assert.equal(await b.locator('#tgBody').count(), 0, 'no setup');
    assert.equal(await b.locator('[data-act="moveYes"]').count(), 0, 'nothing to move');
    assert.match((await b.innerText('#main')).toLowerCase(), /4 foods/, 'all four entries show');
    await b.click('#chipYou');
    assert.match(await b.innerText('#main'), /Saved to your account/);
    await b.click('[data-act="openData"]');
    assert.match(await b.innerText('.sheet >> nth=-1'), new RegExp('Signed in as ' + email.replace(/[.+]/g, '\\$&')));
    await b.click('[data-act="signOut"]');
    await b.waitForSelector('#siEmail');
    assert.equal(await b.isVisible('nav.tabs'), false, 'signed out: back to the sign-in screen only');
  });
  await step('the first device is unaffected by the second one signing out', async () => {
    await a.reload();
    await ready(a);
    assert.equal(await a.locator('#siEmail').count(), 0);
  });
  await step('a device that already holds a diary is offered the move on first sign-in', async () => {
    // a diary made on the device before accounts existed (the device-only mode the tests and the prototype use)
    const c = await (await browser.newContext(phone)).newPage();
    await c.goto(APP);
    await c.evaluate(() => localStorage.setItem('ember:device-only', '1'));
    await c.reload();
    await setUp(c);
    await logFood(c, 'banana');
    await c.evaluate(() => localStorage.removeItem('ember:device-only'));
    const email2 = `e2e-move-${Date.now()}@example.test`;
    const { data: u2 } = await admin.auth.admin.createUser({ email: email2, email_confirm: true });
    extra.push(u2.user.id);
    const l2 = await admin.auth.admin.generateLink({ type: 'magiclink', email: email2, options: { redirectTo: APP } });
    await c.goto(l2.data.properties.action_link);
    await c.waitForSelector('[data-act="moveYes"]');
    assert.match(await c.innerText('#main'), /Bring your diary with you\?[\s\S]*1 day in it/);
    assert.equal(await c.isVisible('nav.tabs'), false, 'nothing else can be tapped while the question shows');
    await c.click('[data-act="moveYes"]');
    await ready(c);
    await until('the moved rows', async () => {
      const r = (await admin.from('user_docs').select('kind, data').eq('user_id', u2.user.id)).data;
      return r.some(x => x.kind === 'profile') && r.some(x => x.kind === 'days' && x.data.e.length === 1);
    });
    assert.equal(await c.isVisible('nav.tabs'), true);
  });
  await step('no page errors', async () => assert.deepEqual(errs, []));
} finally {
  await browser.close();
  server.kill();
  await admin.auth.admin.deleteUser(uid).catch(() => {});
  for (const id of extra) await admin.auth.admin.deleteUser(id).catch(() => {});
}
for (const [s, n] of results) console.log(s, n);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${failed} of ${results.length} steps failed` : `all ${results.length} steps passed`);
process.exit(failed ? 1 : 0);

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
  for (const end = Date.now() + ms; Date.now() < end; ) {
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
const closeSheets = async pg => {
  for (let i = 0; i < 6; i++) {
    // a celebration (streak, level) or an open sheet sits over the screen: dismiss whichever is there
    if (await pg.locator('[data-act="celeNext"]').count()) await pg.click('[data-act="celeNext"]');
    else if (await pg.locator('.sheet').count()) await pg.keyboard.press('Escape');
    else break;
    await pg.waitForTimeout(300);
  }
};

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
  const a = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [];
  a.on('pageerror', e => errs.push(String(e)));

  await step('a new device starts device-only and offers sign-in', async () => {
    await a.goto(APP);
    await a.waitForSelector('#tgBody');
    await a.fill('[data-k="age"]', '34');
    await a.fill('[data-k="cm"]', '183');
    await a.fill('[data-k="kg"]', '86');
    await a.click('[data-act="saveTargets"]');
    await a.click('[data-act="celeNext"]');
    await logFood(a, 'banana');
    await closeSheets(a);
    assert.match(await a.innerText('.banner'), /Saved on this device only\. Sign in to keep your diary safe/);
    await a.click('.banner');
    assert.match(await a.innerText('.sheet >> nth=-1'), /Sign in to Ember[\s\S]*Email me a link/);
    assert.deepEqual(await rows(), []);
  });
  await step('opening the emailed link signs in and offers to move the diary', async () => {
    await a.goto(await link());
    await a.waitForSelector('[data-act="moveYes"]');
    assert.match(await a.innerText('#main'), /Bring your diary with you\?[\s\S]*1 day in it/);
  });
  await step('moving puts the profile and the day in the account', async () => {
    await a.click('[data-act="moveYes"]');
    await a.waitForSelector('nav.tabs .tab');
    await until('profile and day rows', async () => {
      const r = await rows();
      return r.some(x => x.kind === 'profile') && r.some(x => x.kind === 'days' && x.data.e.length === 1);
    });
    assert.equal(await a.locator('.banner[data-act="signIn"]').count(), 0);
  });
  await step('what is logged next is saved to the account', async () => {
    await logFood(a, 'porridge');
    await until('two entries in the day row', async () =>
      (await rows()).some(x => x.kind === 'days' && x.data.e.length === 2),
    );
  });
  await step('a second browser signed in as the same person sees the same diary, with no setup', async () => {
    const b = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await b.goto(await link());
    await b.waitForSelector('nav.tabs .tab');
    await b.waitForTimeout(800);
    assert.equal(await b.locator('#tgBody').count(), 0, 'no onboarding');
    assert.equal(await b.locator('[data-act="moveYes"]').count(), 0, 'nothing to move');
    const text = (await b.innerText('#main')).toLowerCase();
    assert.ok(text.includes('banana'), 'the first entry shows');
    await b.click('#chipYou');
    assert.match(await b.innerText('#main'), /Saved to your account/);
    await b.click('[data-act="openData"]');
    assert.match(await b.innerText('.sheet >> nth=-1'), new RegExp('Signed in as ' + email.replace(/[.+]/g, '\\$&')));
    await b.click('[data-act="signOut"]');
    await b.waitForSelector('#tgBody');
  });
  await step('the first device is unaffected by the second one signing out', async () => {
    await a.reload();
    await a.waitForSelector('nav.tabs .tab');
    assert.equal(await a.locator('#tgBody').count(), 0);
  });
  await step('no page errors', async () => assert.deepEqual(errs, []));
} finally {
  await browser.close();
  server.kill();
  await admin.auth.admin.deleteUser(uid).catch(() => {});
}
for (const [s, n] of results) console.log(s, n);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${failed} of ${results.length} steps failed` : `all ${results.length} steps passed`);
process.exit(failed ? 1 : 0);

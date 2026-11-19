// The live barcode scanner in a real browser, with a simulated camera that shows the test barcode photo.
// Also checks what happens when there is no camera.   node web/test/browser/scanner.e2e.mjs  (after a build)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const web = fileURLToPath(new URL('../..', import.meta.url));
const photo = fileURLToPath(new URL('../../../prototype/test/barcode.jpg', import.meta.url));
// Chrome's simulated camera plays a Motion-JPEG file, which is simply JPEG frames one after another
const feed = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ember-scan-')), 'barcode.mjpeg');
fs.copyFileSync(photo, feed);

const server = spawn('python3', ['-m', 'http.server', '8793'], { cwd: path.join(web, 'dist'), stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const APP = 'http://127.0.0.1:8793/index.html';
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
const open = async (args, grant) => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', ...args] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: grant ? ['camera'] : [] });
  await ctx.addInitScript(() => localStorage.setItem('ember:device-only', '1'));
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto(APP);
  await pg.waitForSelector('#tgBody');
  await pg.click('[data-act="saveTargets"]');
  await pg.waitForTimeout(400);
  await pg.click('[data-act="celeNext"]');
  await pg.click('.fab');
  await pg.click('[data-act="barcode"]');
  return { browser, pg, errs };
};
try {
  await step('the camera opens with the sheet, reads the barcode by itself and shows the product', async () => {
    const { browser, pg, errs } = await open(
      [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${feed}`,
      ],
      true,
    );
    try {
      await pg.waitForSelector('#fdNut', { timeout: 30000 }); // the food sheet, with no tap and no photo taken
      assert.equal(await pg.innerText('.sheet-h h3 >> nth=-1'), 'Organic Jumbo Oats');
      const cameraOn = await pg.evaluate(
        () => !!(document.querySelector('#bcVideo') && document.querySelector('#bcVideo').srcObject),
      );
      assert.equal(cameraOn, false, 'the camera is closed once the barcode is read');
      assert.deepEqual(errs, []);
    } finally {
      await browser.close();
    }
  });
  await step('closing the sheet closes the camera', async () => {
    const blank = path.join(path.dirname(feed), 'blank.mjpeg');
    fs.copyFileSync(fileURLToPath(new URL('../../../prototype/test/p1.jpg', import.meta.url)), blank); // a photo with no barcode
    const { browser, pg } = await open(
      [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-video-capture=${blank}`,
      ],
      true,
    );
    try {
      await pg.waitForFunction(
        () => document.querySelector('#bcVideo') && document.querySelector('#bcVideo').srcObject,
        null,
        { timeout: 15000 },
      );
      assert.match(await pg.innerText('#bcHint'), /Point the camera at the barcode/);
      await pg.evaluate(() => (window.__tracks = document.querySelector('#bcVideo').srcObject.getTracks()));
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(400);
      assert.deepEqual(await pg.evaluate(() => window.__tracks.map(t => t.readyState)), ['ended']);
    } finally {
      await browser.close();
    }
  });
  await step('with no camera the sheet says so and typing the number still works', async () => {
    const { browser, pg, errs } = await open([], false);
    try {
      await pg.waitForFunction(
        () =>
          /camera/i.test(document.querySelector('#bcHint').textContent) &&
          !/Point the camera/.test(document.querySelector('#bcHint').textContent),
        null,
        { timeout: 15000 },
      );
      assert.match(await pg.innerText('#bcHint'), /Type the number under the bars, or read it from a photo\./);
      assert.equal(await pg.isVisible('#bcScan'), false);
      assert.equal(await pg.isVisible('#bcNum'), true);
      assert.deepEqual(errs, []);
    } finally {
      await browser.close();
    }
  });
} finally {
  server.kill();
}
for (const [s, n] of results) console.log(s, n);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${failed} of ${results.length} steps failed` : `all ${results.length} steps passed`);
process.exit(failed ? 1 : 0);

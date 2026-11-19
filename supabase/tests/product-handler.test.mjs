// Tests for the `product` server function (barcode lookup), with stand-ins for the session check, the saved
// products and Open Food Facts. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, fromOpenFoodFacts, cleanCode, OFF_AGENT } from '../functions/product/handler.js';

const snickers = {
  code: '5000159461122',
  product_name: 'Snickers',
  brands: 'Mars Wrigley Confectionery UK Limited, Snickers',
  serving_quantity: 50,
  product_quantity: 50,
  nutriments: {
    'energy-kcal_100g': 481,
    proteins_100g: 8.6,
    carbohydrates_100g: 60.5,
    fat_100g: 22.5,
    fiber_100g: 4.3,
    sugars_100g: 51.8,
    'saturated-fat_100g': 7.9,
    salt_100g: 0.62875,
  },
};
const expected = {
  found: true,
  name: 'Snickers',
  brand: 'Snickers',
  kcal: 481,
  p: 8.6,
  c: 60.5,
  f: 22.5,
  sf: 7.9,
  su: 51.8,
  fi: 4.3,
  salt: 0.62875,
  serving_g: 50,
  pack_g: 50,
};

function setup(over = {}) {
  const rows = new Map();
  const calls = [];
  let today = over.today || '2026-11-19T12:00:00Z';
  const handle = createHandler({
    whoIs: async t => (t === 'good' ? { id: 'u1' } : null),
    now: () => new Date(today),
    products: {
      byBarcode: async c => rows.get(c) || null,
      put: async p => void rows.set(p.barcode, { ...p, checked_at: today }),
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      if (over.fetch) return over.fetch(url);
      return new Response(JSON.stringify(over.off || { status: 1, product: snickers }), { status: 200 });
    },
  });
  return { handle, rows, calls, setToday: d => (today = d) };
}
const scan = (h, barcode = '5000159461122') => h({ token: 'good', body: { barcode } });

test('only real barcodes are looked up', () => {
  assert.equal(cleanCode('5000159461122'), '5000159461122');
  assert.equal(cleanCode(' 5000 1594 61122 '), '5000159461122');
  for (const bad of ['', '123', 'abc', null, '1'.repeat(15), '../../etc/passwd'])
    assert.equal(cleanCode(bad), '', String(bad));
});

test('an Open Food Facts product becomes per-100 figures, with the brand people know it by', () => {
  assert.deepEqual(fromOpenFoodFacts(snickers), expected);
  const kj = fromOpenFoodFacts({
    ...snickers,
    nutriments: { ...snickers.nutriments, 'energy-kcal_100g': undefined, 'energy-kj_100g': 2018 },
  });
  assert.equal(kj.kcal, 482);
});

test('a product without the basics, or with figures that cannot be right, is treated as not found', () => {
  const n = snickers.nutriments;
  assert.equal(fromOpenFoodFacts({ ...snickers, product_name: '' }), null);
  assert.equal(fromOpenFoodFacts({ ...snickers, nutriments: { ...n, fat_100g: undefined } }), null);
  assert.equal(
    fromOpenFoodFacts({ ...snickers, nutriments: { ...n, 'energy-kcal_100g': 48 } }),
    null,
    'calories far below the macros',
  );
  assert.equal(fromOpenFoodFacts({ ...snickers, nutriments: { ...n, 'energy-kcal_100g': 4810 } }), null);
  assert.equal(
    fromOpenFoodFacts({ ...snickers, nutriments: { ...n, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } }),
    null,
    'calories far above the macros',
  );
  assert.ok(
    fromOpenFoodFacts({
      ...snickers,
      product_name: 'Draught Stout',
      nutriments: { 'energy-kcal_100g': 35, proteins_100g: 0.3, carbohydrates_100g: 3, fat_100g: 0 },
    }),
    'a drink whose energy is mostly alcohol',
  );
  assert.equal(fromOpenFoodFacts(null), null);
});

test('a signed-out request is refused, and so is anything that is not a barcode', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle({ token: '', body: { barcode: '5000159461122' } })).status, 401);
  assert.equal((await handle({ token: 'good', body: { barcode: 'hello' } })).status, 400);
  assert.equal((await handle({ token: 'good', body: null })).status, 400);
  assert.equal(calls.length, 0);
});

test('the first scan asks Open Food Facts, identifying the app; the second is answered from the saved copy', async () => {
  const { handle, calls, rows } = setup();
  const first = await scan(handle);
  assert.deepEqual(first.body, { ...expected, barcode: '5000159461122' });
  assert.match(calls[0].url, /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/5000159461122\?fields=/);
  assert.equal(calls[0].init.headers['User-Agent'], OFF_AGENT);
  assert.equal(rows.get('5000159461122').found, true);
  const second = await scan(handle);
  assert.deepEqual(second.body, first.body);
  assert.equal(calls.length, 1, 'no second request');
});

test('a barcode Open Food Facts does not know is remembered for a week, then asked for again', async () => {
  const { handle, calls, setToday } = setup({ off: { status: 0, status_verbose: 'product not found' } });
  assert.deepEqual((await scan(handle)).body, { found: false, barcode: '5000159461122' });
  await scan(handle);
  assert.equal(calls.length, 1);
  setToday('2026-11-27T12:00:00Z');
  await scan(handle);
  assert.equal(calls.length, 2);
});

test('when Open Food Facts is busy or unreachable the app is told to try again and nothing is saved', async () => {
  for (const fetch of [
    async () => new Response('slow down', { status: 429 }),
    async () => new Response('oops', { status: 503 }),
    async () => Promise.reject(new TypeError('fetch failed')),
  ]) {
    const { handle, rows } = setup({ fetch });
    const r = await scan(handle);
    assert.deepEqual([r.status, r.body.error.code], [502, 'upstream_error']);
    assert.equal(rows.size, 0);
  }
});

// Unit tests for the app's side of the barcode lookup. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupBarcode } from '../src/app/product-server.js';

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const access = (fetch, token = 'tok') => ({
  url: 'https://x.test/functions/v1/product',
  key: 'pub',
  token: async () => token,
  fetch,
});

test('a known barcode comes back as a product; an unknown one as null', async () => {
  let seen;
  const found = await lookupBarcode(
    access(async (url, init) => ((seen = { url, init }), reply(200, { found: true, name: 'Snickers', kcal: 481 }))),
    '5000159461122',
  );
  assert.equal(found.name, 'Snickers');
  assert.deepEqual(JSON.parse(seen.init.body), { barcode: '5000159461122' });
  assert.equal(seen.init.headers.Authorization, 'Bearer tok');
  assert.equal(
    await lookupBarcode(
      access(async () => reply(200, { found: false })),
      '5000159461122',
    ),
    null,
  );
});

test('any failure is reported as unreachable, which the app shows as "try again", never as "not found"', async () => {
  assert.equal(
    await lookupBarcode(
      access(async () => reply(502, { error: { code: 'upstream_error' } })),
      '1',
    ),
    'unreachable',
  );
  assert.equal(
    await lookupBarcode(
      access(async () => Promise.reject(new TypeError('Failed to fetch'))),
      '1',
    ),
    'unreachable',
  );
  assert.equal(
    await lookupBarcode(
      access(async () => new Response('not json', { status: 200 })),
      '1',
    ),
    'unreachable',
  );
  assert.equal(
    await lookupBarcode(
      access(async () => reply(200, { found: true }), ''),
      '1',
    ),
    'unreachable',
  );
});

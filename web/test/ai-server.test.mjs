// Unit tests for the app's side of the `ai` server function. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { looseJson, eventReader, serverSample, mend } from '../src/app/ai-server.js';

test('a JSON reply is read whether bare, fenced or wrapped in a sentence', () => {
  assert.deepEqual(looseJson('[{"name":"egg"}]'), [{ name: 'egg' }]);
  assert.deepEqual(looseJson('```json\n{"say":"hi"}\n```'), { say: 'hi' });
  assert.deepEqual(looseJson('Here you go:\n[1, 2, 3]\nHope that helps.'), [1, 2, 3]);
  assert.deepEqual(looseJson(' {"a":{"b":[1]}} '), { a: { b: [1] } });
  assert.throws(
    () => looseJson('no json here'),
    e => e.code === 'invalid_json',
  );
  assert.throws(
    () => looseJson(''),
    e => e.code === 'invalid_json',
  );
});

test('server-sent events are read correctly however the bytes are split', () => {
  const got = [];
  const feed = eventReader(e => got.push(e));
  const all = 'data: {"text":"He"}\n\ndata: {"text":"llo"}\n\ndata: {"done":true,"text":"Hello"}\n\n';
  for (const ch of all.match(/.{1,7}/gs)) feed(ch);
  assert.deepEqual(got, [{ text: 'He' }, { text: 'llo' }, { done: true, text: 'Hello' }]);
});

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const access = (fetch, token = 'tok') => ({
  url: 'https://x.test/functions/v1/ai',
  key: 'pub',
  token: async () => token,
  fetch,
});

test('it sends the task name and values as text, with the session token, and never a prompt', async () => {
  let seen;
  const sample = serverSample(access(async (url, init) => ((seen = { url, init }), reply(200, { text: '[]' }))));
  const out = await sample.json(['parse_text', { text: 'two eggs', n: 3 }]);
  assert.deepEqual(out, []);
  assert.equal(seen.url, 'https://x.test/functions/v1/ai');
  assert.equal(seen.init.headers.Authorization, 'Bearer tok');
  assert.equal(seen.init.headers.apikey, 'pub');
  assert.deepEqual(JSON.parse(seen.init.body), {
    task: 'parse_text',
    vars: { text: 'two eggs', n: '3' },
    images: [],
    stream: false,
  });
});

test('the server`s error codes reach the app unchanged; a dead connection and a missing session have their own', async () => {
  const limited = serverSample(access(async () => reply(429, { error: { code: 'rate_limited', message: 'used up' } })));
  await assert.rejects(limited(['parse_text', { text: 'x' }]), e => e.code === 'rate_limited');
  const down = serverSample(access(async () => Promise.reject(new TypeError('Failed to fetch'))));
  await assert.rejects(down(['parse_text', { text: 'x' }]), e => e.code === 'upstream_error');
  const out = serverSample(access(async () => reply(200, { text: 'x' }), ''));
  await assert.rejects(out(['parse_text', { text: 'x' }]), e => e.code === 'session_expired');
});

test('a streamed reply is passed on as it grows, and the whole text is returned', async () => {
  const body = 'data: {"text":"Heat "}\n\ndata: {"text":"a pan."}\n\ndata: {"done":true,"text":"Heat a pan."}\n\n';
  const sample = serverSample(
    access(async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } })),
  );
  const seen = [];
  const r = await sample(['chef_method', { title: 'x', ingredients: 'y' }], { onText: p => seen.push(p.text) });
  assert.deepEqual(seen, ['Heat ', 'Heat a pan.']);
  assert.equal(r.text, 'Heat a pan.');
});

test('an error part-way through a stream keeps the text so far', async () => {
  const body = 'data: {"text":"Heat "}\n\ndata: {"error":{"code":"upstream_error","message":"x"}}\n\n';
  const sample = serverSample(
    access(async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } })),
  );
  await assert.rejects(
    sample(['chef_method', { title: 'x', ingredients: 'y' }], { onText: () => {} }),
    e => e.code === 'upstream_error' && e.text === 'Heat ',
  );
});

test('a product lookup returns the product when found and null otherwise, and never throws', async () => {
  const found = serverSample(
    access(async () => reply(200, { text: '{"found":true,"name":"Protein Yogurt","kcal":62,"url":"https://x.ie/p"}' })),
  );
  assert.equal((await found.lookup('Glenisk', 'Protein Yogurt')).kcal, 62);
  const missing = serverSample(access(async () => reply(200, { text: '{"found":false}' })));
  assert.equal(await missing.lookup('Glenisk', 'Protein Yogurt'), null);
  const down = serverSample(access(async () => Promise.reject(new TypeError('Failed to fetch'))));
  assert.equal(await down.lookup('Glenisk', 'Protein Yogurt'), null);
});

test('a reply that is nearly JSON is repaired: a number with a leading zero, a stray last comma', () => {
  // what Claude really sent for a meal plan on 24 November 2026: "kcal":080
  assert.deepEqual(looseJson('{"meals":[{"name":"Banana and yoghurt","kcal":080,"p":20}],"kcal":1760}'), {
    meals: [{ name: 'Banana and yoghurt', kcal: 80, p: 20 }],
    kcal: 1760,
  });
  assert.deepEqual(looseJson('{"a":[1,2,],"b":007,"c":0.5,"d":0,}'), { a: [1, 2], b: 7, c: 0.5, d: 0 });
  // nothing inside a string is touched
  assert.deepEqual(looseJson('{"say":"Room 007, at 08:00,]","n":010}'), { say: 'Room 007, at 08:00,]', n: 10 });
  assert.equal(mend('{"x":1080,"y":-05}'), '{"x":1080,"y":-5}');
  assert.throws(
    () => looseJson('not json at all'),
    e => e.code === 'invalid_json',
  );
});

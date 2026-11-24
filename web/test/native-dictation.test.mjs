// Speech to text in the phone app, against a stand-in for the phone's speech plugin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeDictation } from '../src/app/native-dictation.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
function phone({ available = true, permission = 'granted', afterAsk = permission, refuse = [] } = {}) {
  const on = {},
    calls = [];
  return {
    calls,
    emit: (name, data) => on[name] && on[name](data),
    available: async () => ({ available }),
    checkPermissions: async () => ({ speechRecognition: permission }),
    requestPermissions: async () => (calls.push('ask'), { speechRecognition: afterAsk }),
    addListener: async (name, f) => void (on[name] = f),
    start: async o => {
      calls.push(['start', o.language]);
      if (refuse.includes(o.language)) throw new Error('language not supported');
    },
    stop: async () => void calls.push('stop'),
  };
}
function listen(p, opts) {
  const d = nativeDictation(p, { settle: 30, pause: 60, silence: 150, ...opts }),
    seen = [];
  d.onPartial(x => seen.push('partial:' + x.text));
  d.onFinal(x => seen.push('final:' + x.text));
  d.onState(x => seen.push(x.state + (x.reason ? ':' + x.reason : '')));
  return { d, seen };
}

test('words arrive as they are said; the last phrase is the final one, even when it lands after "stopped"', async () => {
  const p = phone(),
    { d, seen } = listen(p);
  await d.start();
  p.emit('partialResults', { matches: ['two eggs'] });
  p.emit('partialResults', { accumulated: 'ignored: no matches in this one' });
  p.emit('listeningState', { state: 'stopped', status: 'stopped', reason: 'results' }); // the phone says it has stopped…
  p.emit('partialResults', { matches: ['two eggs and toast'] }); // …and then sends the last words
  await sleep(60);
  assert.deepEqual(seen, [
    'listening',
    'partial:two eggs',
    'partial:two eggs and toast',
    'final:two eggs and toast',
    'idle:stopped',
  ]);
  assert.deepEqual(p.calls, [['start', 'en-IE']]);
});

test('once: stops by itself after a pause in speech; without it, carries on until told', async () => {
  const p = phone(),
    { d, seen } = listen(p);
  await d.start({ once: true });
  p.emit('partialResults', { matches: ['a pint of'] });
  await sleep(30);
  p.emit('partialResults', { matches: ['a pint of milk'] });
  await sleep(130);
  assert.equal(p.calls.filter(c => c === 'stop').length, 1);
  assert.deepEqual(seen.slice(-2), ['final:a pint of milk', 'idle:stopped']);

  const q = phone(),
    b = listen(q);
  await b.d.start();
  q.emit('partialResults', { matches: ['porridge'] });
  await sleep(120);
  assert.deepEqual(b.seen, ['listening', 'partial:porridge']);
  await b.d.stop();
  await sleep(60);
  assert.deepEqual(b.seen.slice(-2), ['final:porridge', 'idle:stopped']);
});

test('nothing said: gives up by itself and says why, with no final words', async () => {
  const p = phone(),
    { d, seen } = listen(p);
  await d.start({ once: true });
  await sleep(230);
  assert.deepEqual(seen, ['listening', 'idle:no-speech']);
  assert.ok(p.calls.includes('stop'));
});

test('an error from the phone ends the listen with its reason; "no match" reads as nothing said', async () => {
  const p = phone(),
    a = listen(p);
  await a.d.start();
  p.emit('error', { code: 'NO_MATCH', message: 'No match', sessionId: 1 });
  await sleep(60);
  assert.deepEqual(a.seen, ['listening', 'idle:no-speech']);
  await a.d.start();
  p.emit('partialResults', { matches: ['half a'] });
  p.emit('error', { code: 'NETWORK', message: 'Network error', sessionId: 2 });
  p.emit('listeningState', { state: 'stopped', reason: 'error' });
  await sleep(60);
  assert.deepEqual(a.seen.slice(2), ['listening', 'partial:half a', 'final:half a', 'idle:network']);
});

test('permission: asked for once when not yet given; a refusal is not_granted and nothing starts', async () => {
  const yes = phone({ permission: 'prompt', afterAsk: 'granted' }),
    a = listen(yes);
  await a.d.start();
  assert.deepEqual(yes.calls, ['ask', ['start', 'en-IE']]);
  const no = phone({ permission: 'prompt', afterAsk: 'denied' }),
    b = listen(no);
  await assert.rejects(b.d.start(), { code: 'not_granted' });
  assert.deepEqual(no.calls, ['ask']);
  assert.deepEqual(b.seen, []);
});

test('a phone without Irish English is tried again in British English; a phone that cannot listen fails cleanly', async () => {
  const p = phone({ refuse: ['en-IE'] }),
    { d, seen } = listen(p);
  await d.start();
  assert.deepEqual(p.calls, [
    ['start', 'en-IE'],
    ['start', 'en-GB'],
  ]);
  assert.deepEqual(seen, ['listening']);
  await assert.rejects(listen(phone({ available: false })).d.start(), { code: 'failed' });
  await assert.rejects(listen(phone({ refuse: ['en-IE', 'en-GB'] })).d.start(), { code: 'failed' });
});

test('a second listen straight after the first works, and starting twice does nothing', async () => {
  const p = phone(),
    { d, seen } = listen(p);
  await d.start({ once: true });
  await d.start({ once: true });
  p.emit('partialResults', { matches: ['an americano'] });
  await d.stop();
  await d.start({ once: true }); // before the first has finished settling
  p.emit('partialResults', { matches: ['and a scone'] });
  await d.stop();
  await sleep(60);
  assert.deepEqual(seen, [
    'listening',
    'partial:an americano',
    'final:an americano',
    'idle:stopped',
    'listening',
    'partial:and a scone',
    'final:and a scone',
    'idle:stopped',
  ]);
  assert.equal(p.calls.filter(c => Array.isArray(c)).length, 2);
});

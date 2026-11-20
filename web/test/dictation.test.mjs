// Unit tests for browser dictation, against a stand-in for the browser's speech recognition.
import test from 'node:test';
import assert from 'node:assert/strict';
import { browserDictation } from '../src/app/dictation.js';

function fakeRecognition(script = {}) {
  const made = [];
  class Rec {
    constructor() {
      made.push(this);
    }
    start() {
      if (script.throwOnStart) throw new Error('already started');
      queueMicrotask(() => {
        if (script.deny) {
          this.onerror({ error: script.deny });
          this.onend();
        } else this.onstart();
      });
    }
    stop() {
      queueMicrotask(() => this.onend());
    }
    hear(parts) {
      this.onresult({
        resultIndex: 0,
        results: parts.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f })),
      });
    }
  }
  return { Rec, made };
}

test('no speech recognition in the browser means no dictation, so the app hides the microphone', () => {
  assert.equal(browserDictation(undefined), null);
});

test('it reports listening, passes on words as they firm up, and reports idle when stopped', async () => {
  const { Rec, made } = fakeRecognition();
  const d = browserDictation(Rec);
  const seen = [];
  d.onState(s => seen.push(['state', s.state]));
  d.onPartial(p => seen.push(['partial', p.text]));
  d.onFinal(p => seen.push(['final', p.text]));
  await d.start();
  assert.equal(made[0].lang, 'en-IE');
  made[0].hear([['two scrambled', false]]);
  made[0].hear([[' two scrambled eggs on toast ', true]]);
  await d.stop();
  await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(seen, [
    ['state', 'listening'],
    ['partial', 'two scrambled'],
    ['final', 'two scrambled eggs on toast'],
    ['state', 'idle'],
  ]);
  await d.start(); // can start again afterwards
  assert.equal(made.length, 2);
});

test('a refusal of the microphone is reported as not granted, which is what turns the button off', async () => {
  for (const deny of ['not-allowed', 'service-not-allowed']) {
    const d = browserDictation(fakeRecognition({ deny }).Rec);
    await assert.rejects(d.start(), e => e.code === 'not_granted');
  }
  const other = browserDictation(fakeRecognition({ deny: 'network' }).Rec);
  await assert.rejects(other.start(), e => e.code === 'failed');
  const broken = browserDictation(fakeRecognition({ throwOnStart: true }).Rec);
  await assert.rejects(broken.start(), e => e.code === 'failed');
});

test('words the browser never marked as final are passed on when listening ends (Safari)', async () => {
  const { Rec, made } = fakeRecognition();
  const d = browserDictation(Rec);
  const seen = [];
  d.onState(s => seen.push(['state', s.state]));
  d.onFinal(p => seen.push(['final', p.text]));
  await d.start();
  made[0].hear([['dirty chai', false]]);
  made[0].hear([['dirty chai latte', false]]);
  await d.stop();
  await new Promise(r => setTimeout(r, 5));
  assert.deepEqual(seen, [
    ['state', 'listening'],
    ['final', 'dirty chai latte'],
    ['state', 'idle'],
  ]);
});

test('once listens for a single thing said; without it listening carries on through pauses', async () => {
  const { Rec, made } = fakeRecognition();
  const d = browserDictation(Rec);
  await d.start({ once: true });
  assert.equal(made[0].continuous, false);
  await d.stop();
  await new Promise(r => setTimeout(r, 5));
  await d.start();
  assert.equal(made[1].continuous, true);
});

test('a second start while the last session is still closing waits for it, then listens again', async () => {
  const { Rec, made } = fakeRecognition();
  const d = browserDictation(Rec);
  const states = [];
  d.onState(s => states.push(s.state));
  await d.start();
  d.stop(); // not awaited: the session has been told to stop but has not ended yet
  await d.start();
  assert.equal(made.length, 2, 'a new session was opened rather than the call being dropped');
  assert.deepEqual(states, ['listening', 'idle', 'listening']);
});

test('if the browser does not know en-IE it listens in en-GB instead', async () => {
  const made = [];
  class Rec {
    constructor() {
      made.push(this);
    }
    start() {
      queueMicrotask(() => {
        if (this.lang === 'en-IE') {
          this.onerror({ error: 'language-not-supported' });
          this.onend();
        } else this.onstart();
      });
    }
    stop() {
      queueMicrotask(() => this.onend());
    }
  }
  const d = browserDictation(Rec);
  await d.start();
  assert.deepEqual(
    made.map(r => r.lang),
    ['en-IE', 'en-GB'],
  );
});

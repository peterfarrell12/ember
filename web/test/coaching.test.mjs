// What a client's app sends to their coach is cut to what the client shares. This is the privacy rule of the
// coach side, so every area is checked on and off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedCopy, SHARE_AREAS } from '../src/app/coaching.js';

const full = () => ({
  name: 'Aoife',
  goal: 'Reach 62 kg',
  st: {
    upd: '2026-11-25',
    streak: 9,
    tasksDone: 1,
    tasksTot: 3,
    kcalAvg: 2100,
    kcalT: 2200,
    protAvg: 120,
    protT: 130,
    logged7: 6,
    sess7: 3,
    plan7: 4,
    lastSess: '2026-11-24',
    progN: 'Hyrox build',
    progWk: 2,
    progWeeks: 8,
    prs14: 1,
    rehabN: 'Knee',
    rehabPh: 2,
    pain: 3,
    painPrev: 4,
    kg: 64.2,
    kg30: -0.6,
    ready: 71,
    secret: 'never sent',
  },
  ev: [
    { d: '2026-11-24', k: 'dumbbell', s: 'Finished Legs, 50 min' },
    { d: '2026-11-24', k: 'scale', s: 'Weighed in at 64.2 kg' },
    { d: '2026-11-23', k: 'alert', s: 'Low recovery score: 35' },
    { d: '2026-11-22', k: 'pulse', s: 'Rehab: Knee, pain 3/10' },
  ],
  msgs: [{ id: 'm1', f: 'u', t: 'Morning' }],
  profile: {
    coachName: 'Aoife',
    xp: 900,
    gems: 40,
    kg: 64.2,
    goalKg: 62,
    sex: 'f',
    age: 31,
    cm: 168,
    act: 1.4,
    t: { k: 2200, p: 130 },
    goal: 'lose',
    rate: 0.5,
    wts: [{ d: '2026-11-24', kg: 64.2 }],
    prog: { id: 'p1', at: 3 },
    tasks: [{ id: 'mob', auto: 'mob' }],
    thread: [{ t: 'private chat copy' }],
    note: { text: 'private' },
    mp: { days: [] },
    imp: { days: 3 },
    hist: {
      '2026-11-24': {
        k: 2050,
        p: 118,
        c: 200,
        f: 70,
        n: 6,
        w: 2000,
        ex: 300,
        xm: 50,
        ts: 1,
        rd: 71,
        sl: 7.2,
        st: 8000,
      },
      '2026-11-23': { rd: 35, sl: 5.5 },
    },
  },
  days: {
    '2026-11-24': {
      date: '2026-11-24',
      e: [{ n: 'Porridge', k: 280 }],
      w: 2000,
      cf: [{ mg: 95 }],
      x: [{ n: 'Legs', k: 300 }],
      q: { private: 1 },
      xp: 40,
    },
  },
  train: {
    lifts: { squat: 80 },
    sess: [{ d: '2026-11-24', n: 'Legs' }],
    rehab: { id: 'knee' },
    rlog: { '2026-11-22': { pain: 3 } },
    ready: { '2026-11-25': { score: 71 } },
  },
  progs: { p1: { n: 'Hyrox build' } },
});
const all = Object.fromEntries(SHARE_AREAS.map(a => [a, true]));

test('sharing nothing sends a name, a streak and messages, and no health figure of any kind', () => {
  const c = sharedCopy(full(), {});
  assert.deepEqual(c.st, { upd: '2026-11-25', streak: 9, tasksDone: 1, tasksTot: 3 });
  assert.equal(c.goal, '');
  assert.deepEqual(c.ev, []);
  assert.deepEqual(c.share, { food: false, training: false, weight: false, recovery: false });
  assert.deepEqual(c.view.profile.hist, {});
  assert.deepEqual(c.view.days['2026-11-24'], { date: '2026-11-24' });
  assert.deepEqual(c.view.train, {});
  assert.deepEqual(c.view.progs, {});
  const text = JSON.stringify(c);
  for (const never of ['2100', '64.2', 'Porridge', 'Legs', '"ready"', 'Knee', 'goalKg', '"age"', 'Reach 62'])
    assert.equal(text.includes(never), false, never + ' was sent');
  assert.equal(c.msgs.length, 1, 'what the client wrote to the coach is always sent');
});

test('each area on its own sends that area and nothing from the others', () => {
  const only = area => JSON.stringify(sharedCopy(full(), { [area]: true }));
  const marks = {
    food: ['Porridge', '"kcalAvg":2100', '"k":2050'],
    training: ['Legs', '"sess7":3', 'Hyrox build', '"pain":3'],
    weight: ['"kg":64.2', 'Reach 62', '"goalKg":62', '"age":31'],
    recovery: ['"ready":71', '"rd":71', 'Low recovery'],
  };
  for (const area of SHARE_AREAS) {
    const text = only(area);
    for (const m of marks[area]) assert.equal(text.includes(m), true, `${area}: ${m} should be sent`);
    for (const other of SHARE_AREAS.filter(a => a !== area))
      for (const m of marks[other]) assert.equal(text.includes(m), false, `${area} only: ${m} must not be sent`);
  }
});

test('some things are never sent, whatever is shared', () => {
  const text = JSON.stringify(sharedCopy(full(), all));
  for (const never of ['never sent', 'private chat copy', '"note"', '"mp"', '"imp"', '"q":', '"thread"'])
    assert.equal(text.includes(never), false, never);
});

test('sharing everything sends the summary, the events and a copy of the recent days', () => {
  const c = sharedCopy(full(), all);
  assert.equal(c.st.kcalAvg, 2100);
  assert.equal(c.st.kg, 64.2);
  assert.equal(c.ev.length, 4);
  assert.deepEqual(c.view.days['2026-11-24'].e, [{ n: 'Porridge', k: 280 }]);
  assert.deepEqual(c.view.days['2026-11-24'].x, [{ n: 'Legs', k: 300 }]);
  assert.equal(c.view.profile.hist['2026-11-24'].rd, 71);
  assert.equal(c.view.train.sess.length, 1);
});

test('only true counts as shared, and unknown areas are ignored', () => {
  const c = sharedCopy(full(), { food: 'yes', photos: true, weight: 1 });
  assert.deepEqual(c.share, { food: true, training: false, weight: true, recovery: false });
  assert.equal(Object.keys(c.share).length, 4);
});

test('the copy is bounded: 60 days of history, 14 days of diary, 30 sessions, 12 events', () => {
  const big = full();
  for (let i = 0; i < 200; i++) {
    const d = new Date(2026, 0, 1 + i).toISOString().slice(0, 10);
    big.profile.hist[d] = { k: 2000, n: 3 };
    big.days[d] = { date: d, e: [] };
    big.train.sess.push({ d, n: 'S' });
    big.ev.push({ d, k: 'dumbbell', s: 'x' });
  }
  const c = sharedCopy(big, all);
  assert.equal(Object.keys(c.view.profile.hist).length, 60);
  assert.equal(Object.keys(c.view.days).length, 14);
  assert.equal(c.view.train.sess.length, 30);
  assert.equal(c.ev.length, 12);
});

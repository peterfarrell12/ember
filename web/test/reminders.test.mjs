// Unit tests for the reminder planner: plain data in, the week's reminders out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderPlan, canRemind, syncReminders } from '../src/app/reminders.js';

const day = (date, extra = {}) => ({ date, logged: false, onBreak: false, session: null, ...extra });
const base = { log: { on: true, time: '20:00' }, train: { on: true, lead: 30 }, streak: 8 };
const noon = new Date(2026, 10, 24, 12, 0);

test('today, not yet logged: one nudge at the chosen time that names the streak', () => {
  const r = reminderPlan({ ...base, days: [day('2026-11-24')] }, noon);
  assert.equal(r.length, 1);
  assert.equal(r[0].title, 'Keep your 8-day streak');
  assert.equal(r[0].at.getHours(), 20);
  assert.equal(r[0].at.getDate(), 24);
});

test('a day already logged gets no nudge, and neither does a time that has passed', () => {
  assert.deepEqual(reminderPlan({ ...base, days: [day('2026-11-24', { logged: true })] }, noon), []);
  assert.deepEqual(reminderPlan({ ...base, days: [day('2026-11-24')] }, new Date(2026, 10, 24, 21, 0)), []);
});

test('a break silences everything, including a planned session', () => {
  const d = day('2026-11-24', { onBreak: true, session: { name: 'Day A', time: '18:00', minutes: 55 } });
  assert.deepEqual(reminderPlan({ ...base, days: [d] }, noon), []);
});

test('a timed session is announced before it starts; an untimed one in the morning', () => {
  const timed = reminderPlan(
    {
      ...base,
      log: { on: false, time: '20:00' },
      days: [day('2026-11-24', { session: { name: 'Day A', time: '18:00', minutes: 55 } })],
    },
    noon,
  );
  assert.equal(timed.length, 1);
  assert.equal(timed[0].title, 'Day A at 18:00');
  assert.equal(timed[0].at.getHours() * 60 + timed[0].at.getMinutes(), 17 * 60 + 30);
  const untimed = reminderPlan(
    {
      ...base,
      log: { on: false, time: '20:00' },
      days: [day('2026-11-24'), day('2026-11-25', { session: { name: 'Day B', time: '', minutes: 50 } })],
    },
    noon,
  );
  assert.equal(untimed[0].title, 'Day B today');
  assert.equal(untimed[0].at.getDate(), 25);
  assert.equal(untimed[0].at.getHours(), 8);
});

test('later days get a plain nudge, every reminder has its own id, and only a week is planned', () => {
  const days = Array.from({ length: 10 }, (_, i) => day('2026-11-' + (24 + i > 30 ? 30 : 24 + i)));
  const r = reminderPlan({ ...base, days }, noon);
  assert.equal(r.length, 7);
  assert.equal(r[1].title, 'Nothing logged yet today');
  assert.equal(new Set(r.map(x => x.id)).size, 7);
});

test('switched off means nothing is planned; in a browser nothing is scheduled', async () => {
  const off = { log: { on: false, time: '20:00' }, train: { on: false, lead: 30 }, streak: 3 };
  assert.deepEqual(
    reminderPlan(
      { ...off, days: [day('2026-11-24', { session: { name: 'Day A', time: '18:00', minutes: 55 } })] },
      noon,
    ),
    [],
  );
  assert.equal(canRemind(), false);
  assert.equal(await syncReminders([]), 'unavailable');
});

// @ts-check
// Reminders in the phone app. They are scheduled on the phone itself (local notifications), so there is no
// server behind them and nothing to pay per reminder. In a browser none of this does anything.
//
// The app works out the next week of reminders from what it knows (reminderPlan, plain data in and out) and
// hands them to the phone (syncReminders), replacing whatever it had scheduled before. It does this when it
// opens and whenever something changes: a food logged today cancels today's nudge.
import { isNative } from './native.js';

const FIRST_ID = 4100; // ours run from here to FIRST_ID + 99, so we never cancel anything else's
const at = (date, hhmm) => {
  const [y, m, d] = date.split('-').map(Number),
    [h, min] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
};

/**
 * @typedef {{ date: string, logged: boolean, onBreak: boolean, session: { name: string, time: string, minutes: number } | null }} ReminderDay
 * @typedef {{ id: number, at: Date, title: string, body: string }} Reminder
 * @param {{ log: { on: boolean, time: string }, train: { on: boolean, lead: number }, streak: number, days: ReminderDay[] }} input
 *   days: today first, then the days after it
 * @param {Date} [now]
 * @returns {Reminder[]}
 */
export function reminderPlan(input, now = new Date()) {
  const out = [];
  input.days.slice(0, 7).forEach((day, i) => {
    if (day.onBreak) return; // a break means no nudges at all
    if (input.log.on && !day.logged && /^\d\d:\d\d$/.test(input.log.time)) {
      const when = at(day.date, input.log.time);
      if (when > now)
        out.push({
          id: FIRST_ID + i * 10 + 1,
          at: when,
          title: i === 0 && input.streak > 0 ? `Keep your ${input.streak}-day streak` : 'Nothing logged yet today',
          body:
            i === 0 && input.streak > 0
              ? 'Log one thing before the day ends and it carries on.'
              : 'A quick log keeps your diary and your streak going.',
        });
    }
    if (input.train.on && day.session) {
      const timed = /^\d\d:\d\d$/.test(day.session.time),
        start = at(day.date, timed ? day.session.time : '08:00'),
        when = timed ? new Date(start.getTime() - input.train.lead * 60000) : start;
      if (when > now)
        out.push({
          id: FIRST_ID + i * 10 + 2,
          at: when,
          title: day.session.name + (timed ? ' at ' + day.session.time : ' today'),
          body: day.session.minutes
            ? `About ${day.session.minutes} minutes. Your last numbers are ready.`
            : 'On your plan for today.',
        });
    }
  });
  return out;
}

/* The plugin is handed back inside an object: a Capacitor plugin answers every property, "then" included, so
   returning it bare from an async function makes the promise treat it as another promise and fail. */
const plugin = async () => ({ ln: (await import('@capacitor/local-notifications')).LocalNotifications });

/** Whether this device can show reminders at all. */
export const canRemind = () => isNative();

/** Ask the person for permission to notify. Resolves true if they said yes. */
export async function askToRemind() {
  if (!isNative()) return false;
  try {
    const { ln } = await plugin();
    let p = await ln.checkPermissions();
    if (p.display !== 'granted') p = await ln.requestPermissions();
    return p.display === 'granted';
  } catch (e) {
    return false;
  }
}

/**
 * Replace the reminders this app has scheduled with the given ones.
 * @param {Reminder[]} reminders
 * @returns {Promise<'ok' | 'unavailable' | 'failed'>}
 */
export async function syncReminders(reminders) {
  if (!isNative()) return 'unavailable';
  try {
    const { ln } = await plugin();
    const pending = await ln.getPending();
    const ours = pending.notifications.filter(n => n.id >= FIRST_ID && n.id < FIRST_ID + 100).map(n => ({ id: n.id }));
    if (ours.length) await ln.cancel({ notifications: ours });
    if (reminders.length)
      await ln.schedule({
        notifications: reminders.map(r => ({
          id: r.id,
          title: r.title,
          body: r.body,
          schedule: { at: r.at, allowWhileIdle: true },
        })),
      });
    return 'ok';
  } catch (e) {
    return 'failed';
  }
}

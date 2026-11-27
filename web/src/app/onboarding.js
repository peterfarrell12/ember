// @ts-check
/* The rules of the first run, kept apart from the screens so they can be tested on their own
   (web/test/onboarding.test.mjs). The screens are in 08x-onboard.js. */

/** The youngest age Ember accepts (owner's decision, with the consent wording). */
export const MIN_AGE = 18;
/** The version of the consent a new person gives on the health information screen. */
export const CONSENT_VERSION = '2026-11-27';

/**
 * A date of birth from three typed boxes, or '' when they do not make a real date.
 * @param {string|number} day
 * @param {string|number} month
 * @param {string|number} year
 * @returns {string} YYYY-MM-DD or ''
 */
export function dobFrom(day, month, year) {
  const d = Math.floor(Number(day)),
    m = Math.floor(Number(month)),
    y = Math.floor(Number(year));
  if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Age in whole years on a given day.
 * @param {string} dob YYYY-MM-DD
 * @param {string} today YYYY-MM-DD
 * @returns {number} NaN when either date is missing or the birth date is in the future
 */
export function ageOn(dob, today) {
  const a = /^(\d{4})-(\d\d)-(\d\d)$/.exec(dob || ''),
    b = /^(\d{4})-(\d\d)-(\d\d)$/.exec(today || '');
  if (!a || !b) return NaN;
  let age = +b[1] - +a[1];
  if (+b[2] < +a[2] || (+b[2] === +a[2] && +b[3] < +a[3])) age--;
  return age < 0 ? NaN : age;
}

/**
 * The lowest daily calorie target Ember accepts, worked out or typed.
 * @param {string} sex 'f' or 'm'
 */
export const kcalFloor = sex => (sex === 'f' ? 1200 : 1500);

/** Below this body mass index Ember does not offer weight loss. */
export const BMI_FLOOR = 18.5;
/**
 * @param {number} kg
 * @param {number} cm
 */
export const bmiOf = (kg, cm) => (kg > 0 && cm > 0 ? kg / (cm / 100) ** 2 : NaN);
/**
 * The lightest weight at which someone of this height is still at a healthy body mass index, to 0.1 kg, rounded up.
 * @param {number} cm
 */
export const lowestHealthyKg = cm => Math.ceil(BMI_FLOOR * (cm / 100) ** 2 * 10) / 10;
/**
 * Whether losing weight may be offered: not to someone already at or under the floor.
 * @param {number} kg
 * @param {number} cm
 */
export const canLose = (kg, cm) => !(bmiOf(kg, cm) <= BMI_FLOOR);
/**
 * Whether a goal weight is one Ember will hold: not under the floor for this height.
 * @param {number} goalKg
 * @param {number} cm
 */
export const goalWeightOk = (goalKg, cm) => !(cm > 0) || goalKg >= lowestHealthyKg(cm) - 1e-9;

/* The steps of the first run, in order. The furthest one each account reached is kept on the account (meta,
   onboarding) so the owner can count where people stop, from Ember's own database and nothing else. */
export const STEPS = /** @type {const} */ (['account', 'consent', 'targets', 'first_log', 'reminder']);
/**
 * The later of two steps.
 * @param {string} a
 * @param {string} b
 */
export function furthest(a, b) {
  const order = /** @type {readonly string[]} */ (STEPS);
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}

/**
 * What a consent record allows. Records made before the split (one tick at sign-up, which covered health
 * information and AI together) have neither flag and count as both.
 * @param {{ v?: string, at?: string, health?: boolean, ai?: boolean } | null | undefined} c
 */
export function consentOf(c) {
  if (!c || !c.v) return { health: false, ai: /** @type {boolean|null} */ (null) };
  const old = c.health === undefined && c.ai === undefined;
  return { health: old || !!c.health, ai: old ? true : c.ai === undefined ? null : !!c.ai };
}

/* Training set-up: three answers pick the ready-made programme to show first. Each template is described by
   what it is for, the kit it needs and how many days it asks for. */
export const TRAIN_FOR = /** @type {const} */ ([
  ['strength', 'Gym strength'],
  ['home', 'Training at home'],
  ['hyrox', 'Hyrox'],
  ['field', 'Field sport'],
  ['racket', 'Padel or tennis'],
  ['start', 'Just starting'],
]);
export const TRAIN_KIT = /** @type {const} */ ([
  ['gym', 'A gym'],
  ['db', 'Dumbbells'],
  ['none', 'No kit'],
]);
const TPL_FIT = {
  't-full3': { for: ['strength', 'start'], kit: ['gym'], days: 3 },
  't-ul4': { for: ['strength'], kit: ['gym'], days: 4 },
  't-home3': { for: ['home', 'start'], kit: ['db', 'gym'], days: 3 },
  't-bw3': { for: ['start', 'home'], kit: ['none', 'db', 'gym'], days: 3 },
  't-hyrox': { for: ['hyrox'], kit: ['gym'], days: 4 },
  't-field2': { for: ['field'], kit: ['gym'], days: 2 },
  't-padel2': { for: ['racket'], kit: ['gym', 'db'], days: 2 },
  't-fct2': { for: ['field', 'strength'], kit: ['gym'], days: 2 },
};
/**
 * The ready-made programmes in the order that suits the answers, best first. Every template is returned.
 * @template {{ id: string, days: unknown[] }} T
 * @param {T[]} templates
 * @param {{ goal: string, kit: string, days: number }} want
 * @returns {T[]}
 */
export function rankTemplates(templates, want) {
  const score = t => {
    const fit = TPL_FIT[t.id] || { for: [], kit: ['gym'], days: t.days.length };
    const at = fit.for.indexOf(want.goal);
    return (
      (at === 0 ? 6 : at > 0 ? 4 : 0) +
      (fit.kit.includes(want.kit) ? 3 : -6) + // a programme needing kit they do not have goes to the bottom
      Math.max(0, 2 - Math.abs(fit.days - want.days))
    );
  };
  return templates
    .map((t, i) => ({ t, i, s: score(t) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.t);
}

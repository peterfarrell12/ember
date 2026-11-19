// Small helpers with no dependencies: DOM lookup, escaping, numbers, dates. Used everywhere.
/* ---------- helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const pad = n => String(n).padStart(2, '0');
export const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const pdate = s => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const addDays = (s, n) => {
  const d = pdate(s);
  d.setDate(d.getDate() + n);
  return dkey(d);
};
export const today = () => dkey(new Date());
export const r0 = x => Math.round(x || 0);
export const r1 = x => Math.round((x || 0) * 10) / 10;
export const num = (v, d = 0) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return isFinite(n) ? n : d;
};
export const fmt = n => r0(n).toLocaleString('en-IE');
export const clone = o => JSON.parse(JSON.stringify(o));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const ic = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const withTimeout = (p, ms = 12000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]);
export const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const weekStart = k => {
  const d = pdate(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dkey(d);
};
export const niceDate = k => {
  const t = today();
  if (k === t) return 'Today';
  if (k === addDays(t, -1)) return 'Yesterday';
  if (k === addDays(t, 1)) return 'Tomorrow';
  const d = pdate(k);
  return WD[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
};
export const MEALS = { b: 'Breakfast', l: 'Lunch', d: 'Dinner', s: 'Snacks' };
export const mealNow = () => {
  const h = new Date().getHours();
  return h < 11 ? 'b' : h < 15 ? 'l' : h < 17 ? 's' : h < 22 ? 'd' : 's';
};

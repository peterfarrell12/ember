// @ts-check
// Reading a food diary exported from another calorie app, so nobody starts Ember from nothing.
//
// Nothing here knows about the app or the screen: text and bytes in, plain data out. The reader goes by the
// column headings, not by which app made the file, so it copes with MyFitnessPal, Cronometer, Lose It! and
// Ember's own diary export, and with most other spreadsheets that have a date and a calories column.
//
// What comes out is what the other app recorded. Ember does not re-match the foods to its own database, so
// the app shows these entries as Imported, never as verified figures.

/**
 * Split CSV text into rows of cells. Handles quoted cells, doubled quotes, either line ending, a leading
 * byte-order mark, and files that use a semicolon or a tab between cells.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // the byte-order mark Excel puts first
  const nl = text.indexOf('\n');
  const first = text.slice(0, nl > 0 ? nl : 2000);
  const delim = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = [];
  let row = [],
    cur = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some(v => v.trim())) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const p2 = n => String(n).padStart(2, '0');
const real = (y, m, d) => {
  if (!(y > 1990 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return '';
  const t = new Date(y, m - 1, d);
  return t.getMonth() === m - 1 ? `${y}-${p2(m)}-${p2(d)}` : '';
};

/**
 * A date reader for one column. Written dates such as 03/04/2026 do not say which number is the day, so the
 * reader looks at the whole column first: any number above 12 settles it. With nothing to go on it takes the
 * day first, as Irish and UK files do, and says so (`unsure`).
 * @param {string[]} samples every value in the column
 * @returns {{ read: (s: string) => string, unsure: boolean }}
 */
export function dateReader(samples) {
  let dayFirst = 0,
    monthFirst = 0,
    numeric = 0;
  for (const s of samples) {
    const m = String(s || '')
      .trim()
      .match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    numeric++;
    if (+m[1] > 12) dayFirst++;
    else if (+m[2] > 12) monthFirst++;
  }
  const mdy = monthFirst > dayFirst;
  const read = s => {
    s = String(s || '').trim();
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return real(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) {
      const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
      return mdy ? real(y, +m[1], +m[2]) : real(y, +m[2], +m[1]);
    }
    m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*\.?,?[ -](\d{4})/);
    if (m && MON.includes(m[2].toLowerCase())) return real(+m[3], MON.indexOf(m[2].toLowerCase()) + 1, +m[1]);
    m = s.match(/^(?:[A-Za-z]+,? )?([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})/);
    if (m && MON.includes(m[1].toLowerCase())) return real(+m[3], MON.indexOf(m[1].toLowerCase()) + 1, +m[2]);
    return '';
  };
  return { read, unsure: numeric > 0 && !dayFirst && !monthFirst };
}

/** A number from a cell: "1,234.5", "12,5", "87 g" and "" (nought) are all read. */
export function cellNum(v) {
  let s = String(v == null ? '' : v)
    .trim()
    .replace(/[^0-9.,-]/g, '');
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const MEAL = [
  [/breakfast|morning/, 'b'],
  [/lunch|midday/, 'l'],
  [/dinner|supper|evening|tea\b/, 'd'],
];
/** Ember's meal for the other app's meal name. Anything that is not breakfast, lunch or dinner is a snack. */
export const mealOf = name => {
  const s = String(name || '').toLowerCase();
  for (const [re, m] of MEAL) if (/** @type {RegExp} */ (re).test(s)) return /** @type {string} */ (m);
  return 's';
};

/** @type {[string, (hd: string[]) => boolean][]} */
const APPS = [
  ['Cronometer', hd => hd.includes('energy (kcal)') && (hd.includes('food name') || hd.includes('day'))],
  ['Ember', hd => hd.includes('kcal') && hd.includes('carbohydrate g') && hd.includes('source')],
  ['Lose It!', hd => hd.includes('name') && hd.includes('type') && hd.includes('units') && hd.includes('calories')],
  ['MyFitnessPal', hd => hd.includes('meal') && hd.includes('calories') && hd.some(h => /^fat \(g\)$/.test(h))],
];

/**
 * @typedef {{ d: string, m: string, n: string, b: string, u: string, k: number, p: number, c: number, f: number,
 *   fi: number | null, su: number | null, sf: number | null, na: number | null }} ImportedEntry
 *   na is sodium in milligrams, as Ember stores it
 * @typedef {{ kind: 'food', app: string, detail: number, entries: ImportedEntry[], skipped: number, unsure: boolean }
 *   | { kind: 'other' } | { kind: 'empty' }} Reading
 */

/**
 * Read one spreadsheet. `kind` is 'food' for a food diary; 'other' for a file with no calories eaten in it
 * (a weight or exercise export, which the app's existing import handles); 'empty' for nothing usable.
 * @param {string[][]} rows
 * @returns {Reading}
 */
export function readDiary(rows) {
  if (rows.length < 2) return { kind: 'empty' };
  const hd = rows[0].map(h => h.trim().toLowerCase());
  const find = (...res) => {
    for (const r of res) {
      const i = hd.findIndex(h => r.test(h));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iD = find(/^date$/, /^day$/, /^date\b/);
  const iK = find(/^calories$/, /^kcal$/, /^energy \(kcal\)$/, /^calories\b(?!.*(burn|from))/, /\bkcal\b/, /^energy$/);
  const iKj = iK < 0 ? find(/^energy \(kj\)$/, /\bkj\b/) : -1;
  const iP = find(/^protein/),
    iC = find(/^carbohydrates?\b/, /^carbs\b/, /^total carb/),
    iF = find(/^fat\b/, /^total fat/);
  // An exercise export has calories too. A food diary has at least one of protein, carbohydrate or fat beside them.
  if (iD < 0 || (iK < 0 && iKj < 0) || (iP < 0 && iC < 0 && iF < 0)) return { kind: 'other' };
  const iN = find(/^food name$/, /^food$/, /^name$/, /^item$/, /^description$/, /food/),
    iB = find(/^brand$/),
    iM = find(/^meal$/, /^group$/, /^type$/, /^category$/, /meal/),
    iA = find(/^amount$/, /^quantity$/, /^serving/),
    iU = find(/^units?$/),
    iFi = find(/^fib(er|re)/),
    iSu = find(/^sugars?\b/),
    iSf = find(/^saturate/, /^sat\.? fat/),
    iNa = find(/^sodium/),
    iSalt = iNa < 0 ? find(/^salt/) : -1;
  const body = rows.slice(1);
  const dates = dateReader(body.map(r => r[iD]));
  const app = (APPS.find(([, test]) => test(hd)) || ['another app'])[0];
  const opt = (r, i) => (i >= 0 && String(r[i] || '').trim() !== '' ? Math.max(0, cellNum(r[i])) : null);
  const entries = [];
  let skipped = 0;
  for (const r of body) {
    const d = dates.read(r[iD]);
    const k = Math.round(iK >= 0 ? cellNum(r[iK]) : cellNum(r[iKj]) / 4.184);
    const name = iN >= 0 ? String(r[iN] || '').trim() : '';
    const p = iP >= 0 ? cellNum(r[iP]) : 0,
      c = iC >= 0 ? cellNum(r[iC]) : 0,
      f = iF >= 0 ? cellNum(r[iF]) : 0;
    if (!d || k < 0 || k > 20000 || (!k && !p && !c && !f)) {
      skipped++;
      continue;
    }
    const meal = iM >= 0 ? String(r[iM] || '').trim() : '';
    const amount = [iA >= 0 ? String(r[iA] || '').trim() : '', iU >= 0 ? String(r[iU] || '').trim() : '']
      .filter(Boolean)
      .join(' ');
    const salt = opt(r, iSalt);
    entries.push({
      d,
      m: mealOf(meal),
      n: (name || (meal ? meal + ' total' : 'Day total')).slice(0, 80),
      b:
        iB >= 0
          ? String(r[iB] || '')
              .trim()
              .slice(0, 40)
          : '',
      u: amount.slice(0, 40),
      k,
      p: Math.max(0, p),
      c: Math.max(0, c),
      f: Math.max(0, f),
      fi: opt(r, iFi),
      su: opt(r, iSu),
      sf: opt(r, iSf),
      na: iNa >= 0 ? opt(r, iNa) : salt == null ? null : Math.round((salt / 2.5) * 1000),
    });
  }
  if (!entries.length) return { kind: 'empty' };
  // how much the file says about a day: each food (2), a total for each meal (1), one total for the day (0)
  return { kind: 'food', app, detail: iN >= 0 ? 2 : iM >= 0 ? 1 : 0, entries, skipped, unsure: dates.unsure };
}

/**
 * Put several food files together. Apps often export the same days twice, once food by food and once as
 * totals; for each day only the most detailed file is kept, so nothing is counted twice.
 * @param {Extract<Reading, { kind: 'food' }>[]} readings
 * @param {{ today: string, maxDays?: number }} opts days after `today` are dropped, and only the most recent `maxDays` kept
 */
export function mergeDiaries(readings, opts) {
  /** @type {Record<string, { detail: number, entries: ImportedEntry[] }>} */
  const byDay = {};
  for (const r of readings) {
    /** @type {Record<string, ImportedEntry[]>} */
    const mine = {};
    for (const e of r.entries) (mine[e.d] = mine[e.d] || []).push(e);
    for (const [d, list] of Object.entries(mine)) {
      const have = byDay[d];
      if (!have || r.detail > have.detail) byDay[d] = { detail: r.detail, entries: list }; // the same days at the same detail: the first file stands
    }
  }
  const all = Object.keys(byDay)
    .filter(d => d <= opts.today)
    .sort();
  const kept = all.slice(-(opts.maxDays || 365));
  const apps = [...new Set(readings.map(r => r.app))];
  return {
    app: apps.length === 1 ? apps[0] : apps.filter(a => a !== 'another app')[0] || 'another app',
    days: kept.map(d => ({ date: d, entries: byDay[d].entries })),
    from: kept[0] || '',
    to: kept[kept.length - 1] || '',
    entries: kept.reduce((s, d) => s + byDay[d].entries.length, 0),
    older: all.length - kept.length,
    skipped: readings.reduce((s, r) => s + r.skipped, 0),
    unsure: readings.some(r => r.unsure),
    totalsOnly: kept.length > 0 && kept.every(d => byDay[d].detail < 2),
  };
}

/**
 * The spreadsheets inside a zip file, as text. Most apps email an export as a zip of several CSV files.
 * Reads stored and deflated entries; anything else in the zip is passed over.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ name: string, text: string }[]>}
 */
export async function csvFilesInZip(buffer) {
  const v = new DataView(buffer),
    bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 66000; i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Object.assign(new Error('not a zip file'), { code: 'not_zip' });
  const count = v.getUint16(end + 10, true);
  let at = v.getUint32(end + 16, true);
  const out = [];
  for (let n = 0; n < count && at + 46 <= bytes.length; n++) {
    if (v.getUint32(at, true) !== 0x02014b50) break;
    const method = v.getUint16(at + 10, true),
      packed = v.getUint32(at + 20, true),
      size = v.getUint32(at + 24, true),
      nameLen = v.getUint16(at + 28, true),
      extraLen = v.getUint16(at + 30, true),
      commentLen = v.getUint16(at + 32, true),
      local = v.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    at += 46 + nameLen + extraLen + commentLen;
    if (!/\.csv$/i.test(name) || /(^|\/)(\.|__MACOSX)/.test(name) || size > 30e6 || (method !== 0 && method !== 8))
      continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = bytes.subarray(start, start + packed);
    let raw = data;
    if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      raw = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    out.push({ name: name.replace(/^.*\//, ''), text: new TextDecoder().decode(raw) });
  }
  return out;
}

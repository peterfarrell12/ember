/* ================= v4: caffeine tracker ================= */
const CAF_MAX = 400, CAF_HALF = 5.5 * 3600e3, CAF_ABS = 45 * 60e3;
/* Milk per 100 ml: name, kcal, protein, carbs, fat. Standard label values. */
const MILKS = { whole: ['Whole', 64, 3.3, 4.7, 3.6], semi: ['Semi-skimmed', 47, 3.5, 4.8, 1.7], skim: ['Skimmed', 35, 3.5, 4.9, .2], oat: ['Oat', 60, 1.1, 7, 3], soya: ['Soya', 39, 3, 2.5, 1.8], almond: ['Almond', 13, .4, 0, 1.1], coconut: ['Coconut', 20, .1, 2.7, .9], none: ['No milk', 0, 0, 0, 0] };
/* mg of caffeine; ml of milk when made the usual way (milky drinks only); x is fixed extras as kcal, protein, carbs, fat; zero means a sugar-free version exists. */
const DRINKS = [
  { id: 'filter', n: 'Filter or instant coffee', s: 'Coffee', mg: 95, ml: 0, milky: 1 }, { id: 'amer', n: 'Americano', mg: 130, ml: 0, milky: 1 },
  { id: 'flat', n: 'Flat white', mg: 130, ml: 130, milky: 1 }, { id: 'latte', n: 'Latte', mg: 95, ml: 240, milky: 1 }, { id: 'capp', n: 'Cappuccino', mg: 95, ml: 150, milky: 1 },
  { id: 'cort', n: 'Cortado', mg: 130, ml: 60, milky: 1 }, { id: 'mocha', n: 'Mocha', mg: 95, ml: 200, milky: 1, x: [90, 1, 17, 2] },
  { id: 'chai', n: 'Chai latte', mg: 50, ml: 240, milky: 1, x: [80, 0, 20, 0] }, { id: 'dchai', n: 'Dirty chai', mg: 115, ml: 220, milky: 1, x: [80, 0, 20, 0] }, { id: 'matcha', n: 'Matcha latte', mg: 70, ml: 240, milky: 1, x: [10, 1, 1, 0] },
  { id: 'esp', n: 'Espresso', mg: 65 }, { id: 'dbl', n: 'Double espresso', mg: 130 },
  { id: 'tea', n: 'Tea', mg: 45, ml: 30, milky: 1 }, { id: 'green', n: 'Green tea', mg: 30 },
  { id: 'cola', n: 'Cola, 330 ml', s: 'Cola', mg: 35, x: [139, 0, 35, 0], zero: 1 },
  { id: 'ed250', n: 'Energy drink, 250 ml', s: 'Energy drink', mg: 80, x: [115, 0, 28, 0], zero: 1 }, { id: 'ed500', n: 'Energy drink, 500 ml', s: 'Energy drink', mg: 160, x: [230, 0, 55, 0], zero: 1 },
  { id: 'pre', n: 'Pre-workout', mg: 200 }, { id: 'tab', n: 'Caffeine tablet', mg: 200 }, { id: 'gel', n: 'Caffeine gel', mg: 40, x: [90, 0, 22, 0] }
];
const DRINK = Object.fromEntries(DRINKS.map(d => [d.id, d]));
const drinkAsks = dr => !!(dr.milky || dr.x);
const drinkDefault = dr => { const sv = (P.dr || {})[dr.id] || {}; return { milk: sv.milk || (dr.milky && dr.ml ? P.milk || 'semi' : 'none'), ml: sv.ml ?? (dr.ml || 0), su: sv.su || 0, zero: sv.zero || 0, cal: sv.cal !== false }; };
function drinkNut(dr, s) {
  const m = MILKS[s.milk] || MILKS.none, q = dr.milky && s.milk !== 'none' ? (s.ml || 0) / 100 : 0, x = dr.x && !(dr.zero && s.zero) ? dr.x : [0, 0, 0, 0], su = dr.milky ? s.su || 0 : 0;
  return { k: r0(q * m[1] + x[0] + su * 16), p: r1(q * m[2] + x[1]), c: r1(q * m[3] + x[2] + su * 4), f: r1(q * m[4] + x[3]) };
}
/* How the drink was made, in words: "130 ml semi-skimmed milk, 1 sugar". */
function drinkMade(dr, s) {
  const bits = []; if (dr.milky && s.milk !== 'none' && s.ml > 0) bits.push(r0(s.ml) + ' ml ' + MILKS[s.milk][0].toLowerCase() + ' milk'); else if (dr.milky) bits.push('black');
  if (dr.milky && s.su) bits.push(s.su + (s.su === 1 ? ' sugar' : ' sugars')); if (dr.zero) bits.push(s.zero ? 'sugar-free' : 'regular');
  return bits.join(', ');
}
/* Level in the body: absorbed over about 45 minutes, then halving roughly every five and a half hours. */
function cafLevel(list, t) { let s = 0; for (const c of list) { const dt = t - c.t; if (dt <= 0) continue; s += dt < CAF_ABS ? c.mg * dt / CAF_ABS : c.mg * Math.pow(.5, (dt - CAF_ABS) / CAF_HALF); } return s; }
const cafOf = d => (d && d.cf) || [];
const cafDoses = date => cafOf(S.days[date]).concat(cafOf(S.days[addDays(date, -1)]));
function bedTime(date) { const [h, m] = String(P.bed || '23:00').split(':').map(Number); const d = pdate(date); d.setHours(h || 0, m || 0, 0, 0); if ((h || 0) < 12) d.setDate(d.getDate() + 1); return d.getTime(); }
const hm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function cafFromEntry(e) {
  if (e.mg > 0) return clamp(r0(e.mg), 0, 400);
  const n = String(e.n || '').toLowerCase(), g = e.g || 0; if (/decaf|caffeine.free|herbal|chamomile|peppermint|rooibos|cake|creamer|ice cream|liqueur|whitener|biscuit|loaf|brack|kombucha/.test(n)) return 0;
  let mg = 0;
  if (/pre.?workout/.test(n)) mg = 200; else if (/energy drink|red bull|\bmonster\b|lucozade energy/.test(n)) mg = g ? g * .32 : 80;
  else if (/espresso/.test(n)) mg = g && g < 120 ? g * 2.1 : 65; else if (/dirty chai/.test(n)) mg = 115; else if (/chai/.test(n)) mg = 50; else if (/matcha latte/.test(n)) mg = 70; else if (/flat white|americano|cortado/.test(n)) mg = 130; else if (/latte|cappuccino|macchiato|mocha/.test(n)) mg = 95;
  else if (/coffee/.test(n)) mg = g ? g * .4 : 95; else if (/green tea|matcha/.test(n)) mg = g ? g * .12 : 30; else if (/\btea\b/.test(n)) mg = g ? g * .2 : 45; else if (/\bcola\b|\bcoke\b|pepsi/.test(n)) mg = g ? g * .1 : 35;
  return clamp(Math.round(mg / 5) * 5, 0, 400);
}
/* Remove diary entries and any caffeine that was counted from them. */
function dropEntries(d, ids) {
  const gone = d.e.filter(e => ids.includes(e.id)); if (!gone.length) return 0;
  const cfs = gone.map(e => e.cf).filter(Boolean); d.e = d.e.filter(e => !ids.includes(e.id));
  d.cf = cafOf(d).filter(c => !(c.eid && ids.includes(c.eid)) && !cfs.includes(c.id)); return gone.length;
}
const cafStamp = d => d.date === today() ? Date.now() : pdate(d.date).getTime();
const cafLink = (d, hits) => { d.cf = cafOf(d).concat(hits.map(([e, mg]) => ({ id: newId(), n: e.n.slice(0, 40), mg, t: cafStamp(d), src: 'food', eid: e.id }))).sort((a, b) => a.t - b.t); };
/* Called when foods are logged. Coffee, tea, cola and energy drinks can count towards caffeine: automatically, never, or after asking. */
function cafFromFoods(d, made) {
  const hits = made.map(e => [e, cafFromEntry(e)]).filter(x => x[1] > 0); if (!hits.length || P.cafAuto === 'no') return null;
  if (P.cafAuto === 'yes') { cafLink(d, hits); toast(hits.reduce((s, x) => s + x[1], 0) + ' mg caffeine counted too'); return null; }
  return hits;
}
let CQ = null;
function cafAsk(date, hits) {
  CQ = { date, hits, always: false }; const mg = hits.reduce((s, x) => s + x[1], 0);
  openSheet(`${sh('Count the caffeine too?')}<div class="sheet-b"><div class="list">${hits.map(([e, m]) => `<div class="res" style="cursor:default"><span class="n">${esc(e.n)}</span><span class="k tn">${m} mg</span><span class="s">About ${m} mg of caffeine, a typical figure for this drink</span></div>`).join('')}</div>
    <button class="chk" data-act="cafAskAlways" aria-pressed="false"><span class="tb"></span><span>Do the same every time, without asking</span></button></div>
    <div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="cafAskNo">No</button><button class="btn ember" data-act="cafAskYes">${ic('cup')} Add ${mg} mg to caffeine</button></div>`);
}
A.cafAskAlways = (_, el) => { CQ.always = !CQ.always; el.setAttribute('aria-pressed', CQ.always); el.querySelector('.tb').innerHTML = CQ.always ? ic('check') : ''; };
A.cafAskNo = () => { if (CQ.always) { P.cafAuto = 'no'; saveProfile(); } closeSheet(); CQ = null; };
A.cafAskYes = async () => {
  const q = CQ; CQ = null; closeSheet(); if (q.always) P.cafAuto = 'yes';
  const d = await loadDay(q.date), live = q.hits.filter(([e]) => d.e.some(x => x.id === e.id)); if (!live.length) return saveProfile();
  cafLink(d, live); commitDay(d); toast(live.reduce((s, x) => s + x[1], 0) + ' mg caffeine counted'); if (ADD) addFoot();
};
/* Log a drink from the caffeine side. s is how it is made; with s.cal its calories go into the food diary as a linked entry. */
let lastCaf = null;
async function cafLog(dr, s, meal) {
  const d = await loadDay(S.date), nut = s ? drinkNut(dr, s) : { k: 0 }, cid = newId(), withCal = !!(s && s.cal && nut.k >= 5), made = s ? drinkMade(dr, s) : '';
  d.cf = cafOf(d).concat([{ id: cid, n: dr.n, mg: dr.mg, t: cafStamp(d), src: 'drink', dr: dr.id }]).sort((a, b) => a.t - b.t);
  P.dr = P.dr || {}; P.dr[dr.id] = { ...(P.dr[dr.id] || {}), ...(s ? { milk: s.milk, ml: s.ml, su: s.su, zero: s.zero, cal: !!s.cal, set: 1 } : {}), n: ((P.dr[dr.id] || {}).n || 0) + 1 };
  if (s && dr.milky && s.milk !== 'none') P.milk = s.milk;
  meal = meal || mealNow();
  if (withCal) await logEntries([{ n: dr.n + (dr.milky && s.milk !== 'none' && s.ml > 0 ? ', ' + MILKS[s.milk][0].toLowerCase() + ' milk' : ''), b: '', g: 0, ...nut, fi: 0, su: null, sf: null, na: null, src: 'DR', m: meal, u: made, cf: cid, mg: dr.mg }], 'caf', { keep: true, quiet: true, noCaf: true });
  else commitDay(d);
  lastCaf = { date: d.date, id: cid };
  if ($('#cfBody')) renderCaf();
  toast(dr.n + ': ' + dr.mg + ' mg caffeine' + (withCal ? ' and ' + nut.k + ' kcal to ' + MEALS[meal].toLowerCase() : ''), '', { act: 'cafUndo', label: 'Undo' });
}
async function cafRemove(date, id) {
  const d = await loadDay(date), e = d.e.find(x => x.cf === id && x.via === 'caf'); if (!cafOf(d).some(c => c.id === id)) return null;
  d.cf = cafOf(d).filter(c => c.id !== id); if (e) d.e = d.e.filter(x => x !== e); commitDay(d); if ($('#cfBody')) renderCaf(); return e ? e.k : 0;
}
A.cafUndo = async () => { const l = lastCaf; if (!l) return; lastCaf = null; if (await cafRemove(l.date, l.id) !== null) toast('Removed'); };
A.cafDel = async ({ id }) => { const k = await cafRemove(S.date, id); if (k !== null) toast(k ? 'Removed, with its ' + k + ' kcal' : 'Removed'); };
/* Tap a drink: plain ones log at once, the rest ask how you take it the first time and remember. */
A.cafAdd = ({ id }) => {
  const dr = DRINK[id]; if (!dr) return;
  if (!drinkAsks(dr)) return cafLog(dr, null);
  const sv = (P.dr || {})[id]; if (sv && sv.set) return cafLog(dr, drinkDefault(dr));
  openDrink(id);
};
A.drinkEdit = ({ id }) => openDrink(id);
let DK = null;
function openDrink(id) {
  const dr = DRINK[id]; DK = { dr, s: drinkDefault(dr), meal: mealNow() };
  openSheet(`${sh(dr.n)}<div class="sheet-b" id="dkBody"></div><div class="sheet-f" id="dkFoot"></div>`);
  SEG.dkSu = v => { DK.s.su = +v; dkUpdate(); }; SEG.dkZero = v => { DK.s.zero = +v; dkUpdate(); }; SEG.dkMeal = v => { DK.meal = v; };
  const s = DK.s;
  $('#dkBody').innerHTML = `<div class="row"><span class="pill gold">${ic('cup')} ${dr.mg} mg caffeine</span></div>
    ${dr.milky ? `<div class="f">Milk<div class="opts" id="dkMilk">${Object.entries(MILKS).map(([k, m]) => `<button data-act="dkMilk" data-v="${k}" aria-pressed="${s.milk === k}">${m[0]}</button>`).join('')}</div></div>
      <div class="dk-amt" id="dkAmt"><label class="f">Milk, ml<input class="inp" id="dkMl" inputmode="numeric" value="${s.ml || ''}" data-on="dkMl"></label><div class="f">Sugar${segHtml('dkSu', [[0, 'None'], [1, '1 tsp'], [2, '2 tsp']], s.su)}</div></div>` : ''}
    ${dr.zero ? segHtml('dkZero', [[0, 'Regular'], [1, 'Sugar-free']], s.zero) : ''}
    <div class="card" id="dkNut"></div>
    <div id="dkMealW"><div class="f">Calories go to${segHtml('dkMeal', Object.entries(MEALS), DK.meal)}</div></div>`;
  dkUpdate();
}
function dkUpdate() {
  if (!DK || !$('#dkNut')) return; const { dr, s } = DK, n = drinkNut(dr, s), has = n.k >= 5;
  const amt = $('#dkAmt'); if (amt) amt.querySelector('label').classList.toggle('dim', s.milk === 'none');
  $('#dkNut').innerHTML = has ? `<div class="row" style="align-items:baseline;gap:8px"><span class="num bigk">${n.k}</span><span class="muted">kcal</span></div><div class="dk-mac tn"><span><b>${n.p} g</b>protein</span><span><b>${n.c} g</b>carbs</span><span><b>${n.f} g</b>fat</span></div><p class="tiny muted" style="margin-top:8px">${dr.milky ? 'Worked out from standard values for ' + (s.milk !== 'none' ? MILKS[s.milk][0].toLowerCase() + ' milk' : 'sugar') + (s.su && s.milk !== 'none' ? ' and sugar' : '') + '. Cups vary, so change the millilitres if yours is bigger or smaller.' : 'A typical figure for this drink. Check the can or sachet if you want it exact.'}</p>` : `<b>No calories to count</b><p class="tiny muted" style="margin-top:4px">${dr.milky ? 'Black, with no sugar. Pick a milk above if you take one.' : 'The sugar-free version has next to none.'}</p>`;
  $('#dkMealW').classList.toggle('hide', !has);
  $('#dkFoot').innerHTML = has ? `<button class="btn ghost" style="width:auto" data-act="dkGo" data-cal="0">Caffeine only</button><button class="btn ember" data-act="dkGo" data-cal="1">Log with ${n.k} kcal</button>` : `<button class="btn ember" data-act="dkGo" data-cal="0">Log ${dr.mg} mg</button>`;
}
A.dkMilk = ({ v }, el) => { $$('button', el.parentNode).forEach(b => b.setAttribute('aria-pressed', b === el)); const s = DK.s; s.milk = v; if (v !== 'none' && !(s.ml > 0)) { s.ml = DK.dr.ml || 30; $('#dkMl').value = s.ml; } dkUpdate(); };
I.dkMl = el => { DK.s.ml = clamp(r0(num(el.value)), 0, 600); dkUpdate(); };
A.dkGo = ({ cal }) => { const { dr, s, meal } = DK; s.cal = cal === '1'; DK = null; closeSheet(); cafLog(dr, s, meal); };
A.caf = () => { openSheet(`${sh('Caffeine')}<div class="sheet-b" id="cfBody"></div>`, true); SEG.cafAuto = v => { if (v === 'ask') delete P.cafAuto; else P.cafAuto = v; saveProfile(); }; renderCaf(); };
function renderCaf() {
  const b = $('#cfBody'); if (!b) return; const d = day(), list = cafOf(d), tot = list.reduce((s, c) => s + c.mg, 0), doses = cafDoses(d.date), bed = bedTime(d.date), isT = d.date === today();
  const t0 = pdate(d.date).setHours(5, 0, 0, 0), t1 = bed + 3600e3, W = 340, H = 130, pl = 6, pb = 18, N = 60; const pts = Array.from({ length: N + 1 }, (_, i) => { const t = t0 + (t1 - t0) * i / N; return [t, cafLevel(doses, t)]; });
  const mx = Math.max(150, ...pts.map(p => p[1])) * 1.1, X = t => pl + (W - pl * 2) * (t - t0) / (t1 - t0), Y = v => 8 + (H - 8 - pb) * (1 - v / mx); const line = pts.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
  const atBed = r0(cafLevel(doses, bed)), ticks = [8, 12, 16, 20].map(h => pdate(d.date).setHours(h, 0, 0, 0)).filter(t => t < t1);
  const wk = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6)).map(k => [k, (P.hist[k] || {}).cf || 0]), wmx = Math.max(CAF_MAX, ...wk.map(x => x[1]));
  b.innerHTML = `<section class="card stack"><div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:40px;line-height:1">${fmt(tot)}</span><span class="muted">of ${CAF_MAX} mg ${niceDate(d.date).toLowerCase()}</span></div>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Estimated caffeine in your system through the day"><line x1="${pl}" x2="${W - pl}" y1="${Y(50)}" y2="${Y(50)}" stroke="var(--good)" stroke-dasharray="3 4"/><text x="${W - pl}" y="${Y(50) - 3}" text-anchor="end" style="fill:var(--good)">50 mg</text>
        <polygon points="${X(t0)},${Y(0)} ${line} ${X(t1)},${Y(0)}" fill="var(--gold-soft)"/><polyline points="${line}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="${X(bed)}" x2="${X(bed)}" y1="8" y2="${H - pb}" stroke="var(--ink)" stroke-dasharray="2 3"/><text x="${X(bed) - 4}" y="16" text-anchor="end" style="fill:var(--ink)">Bed ${P.bed}</text>${isT && Date.now() > t0 && Date.now() < t1 ? `<circle cx="${X(Date.now())}" cy="${Y(cafLevel(doses, Date.now()))}" r="4.5" fill="var(--gold)" stroke="var(--surface)" stroke-width="2"/>` : ''}
        ${ticks.map(t => `<text x="${X(t)}" y="${H - 4}" text-anchor="middle">${hm(t)}</text>`).join('')}</svg>
      <p class="small ${atBed > 50 ? '' : 'muted'}">${atBed > 50 ? 'Around ' + atBed + ' mg still active at bedtime. Under 50 mg is a sensible aim for sleep.' : 'About ' + atBed + ' mg left at bedtime, which is low enough not to bother most people.'}</p></section>
    <section class="card"><h2>${isT ? "Today's" : 'This day’s'} drinks</h2>${list.map(c => { const e = d.e.find(x => x.cf === c.id) || (c.eid && d.e.find(x => x.id === c.eid)); return `<button class="entry" data-act="cafDel" data-id="${c.id}"><span class="n">${esc(c.n)}</span><span class="k">${c.mg} mg</span><span class="s">${hm(c.t)}${e ? ' · ' + e.k + ' kcal in ' + MEALS[e.m].toLowerCase() : c.src === 'food' ? ' · from your food diary' : ' · caffeine only'} · tap to remove</span></button>`; }).join('') || `<p class="empty">Nothing logged.</p>`}</section>
    <section class="card"><h2>Add a drink</h2><p class="small muted" style="margin:4px 0 6px">The first time you add a drink Ember asks how you take it, then remembers. The pencil changes it later.</p>
      ${DRINKS.map((dr, i) => ({ dr, i, n: ((P.dr || {})[dr.id] || {}).n || 0 })).sort((a, b) => b.n - a.n || a.i - b.i).map(({ dr }) => { const sv = (P.dr || {})[dr.id], s = drinkDefault(dr), k = drinkNut(dr, s).k;
        const sub = !drinkAsks(dr) ? 'No calories' : !(sv && sv.set) ? 'Asks how you take it' : k < 5 ? (drinkMade(dr, s) || 'No calories') : s.cal ? k + ' kcal, ' + drinkMade(dr, s) : drinkMade(dr, s) + ', calories not counted';
        return `<div class="frow"><button class="res" data-act="cafAdd" data-id="${dr.id}"><span class="n">${esc(dr.n)}</span><span class="k tn">${dr.mg}<small> mg</small></span><span class="s"><span class="ell">${esc(sub)}</span></span></button>${drinkAsks(dr) ? `<button class="qadd alt" data-act="drinkEdit" data-id="${dr.id}" aria-label="Change how you take ${esc(dr.n)}">${ic('edit')}</button>` : ''}</div>`; }).join('')}</section>
    <section class="card stack"><h2>Something else</h2><div class="grid2"><label class="f">Name<input class="inp" id="cfN" placeholder="Iced coffee" autocomplete="off"></label><label class="f">Caffeine, mg<input class="inp" id="cfMg" inputmode="numeric"></label><label class="f">Time<input class="inp" id="cfT" type="time" value="${isT ? hm(Date.now()) : '12:00'}"></label><label class="f">Calories, optional<input class="inp" id="cfK" inputmode="numeric"></label></div><button class="btn sm" data-act="cafCustom" style="align-self:flex-start">${ic('plus')} Add</button></section>
    <section class="card stack"><h2>Coffee you log as food</h2><p class="small muted">When you log a coffee, tea, cola or energy drink in your food diary, should its caffeine be counted here?</p>${segHtml('cafAuto', [['ask', 'Ask me'], ['yes', 'Always'], ['no', 'Never']], P.cafAuto || 'ask')}</section>
    <section class="card stack"><div class="between"><h2>Last 7 days</h2><label class="row small muted" style="gap:6px">Bedtime<input class="inp" type="time" id="cfBed" value="${P.bed}" data-on="cfBed" style="height:36px;width:112px;font-size:14px"></label></div>
      <svg class="chart" viewBox="0 0 ${W} 96" role="img" aria-label="Caffeine per day">${wk.map(([k, v], i) => { const bw = W / 7, h = v / wmx * 62, x = i * bw + bw * .2, w = bw * .6; return `<rect x="${x}" y="${v ? 78 - h : 75}" width="${w}" height="${v ? h : 3}" rx="4" fill="${!v ? 'var(--line)' : v > CAF_MAX ? 'var(--ember)' : 'var(--gold)'}"/>${v ? `<text x="${x + w / 2}" y="${74 - h}" text-anchor="middle">${v}</text>` : ''}<text x="${x + w / 2}" y="92" text-anchor="middle">${WD[(pdate(k).getDay() + 6) % 7][0]}</text>`; }).join('')}</svg>
      <p class="tiny muted">Up to 400 mg a day is the usual guideline for healthy adults, and about half that in pregnancy. The curve is an estimate: people clear caffeine at very different rates. Milk and sugar figures are standard values, so a large café cup will run higher.</p></section>`;
}
A.cafCustom = async () => {
  const mg = r0(num($('#cfMg').value)); if (!(mg > 0 && mg <= 1000)) return toast('Enter the milligrams.');
  const [h, m] = ($('#cfT').value || '12:00').split(':').map(Number), t = pdate(S.date).setHours(h || 0, m || 0, 0, 0), name = $('#cfN').value.trim().slice(0, 40) || 'Caffeine', k = r0(num($('#cfK').value));
  const d = await loadDay(S.date), cid = newId(); d.cf = cafOf(d).concat([{ id: cid, n: name, mg, t, src: 'drink' }]).sort((a, b) => a.t - b.t);
  if (k > 0) await logEntries([{ n: name, b: '', g: 0, k, p: 0, c: 0, f: 0, fi: 0, su: null, sf: null, na: null, src: 'Q', m: mealNow(), u: '', cf: cid, mg }], 'caf', { keep: true, quiet: true, noCaf: true }); else commitDay(d);
  lastCaf = { date: d.date, id: cid }; renderCaf(); toast(name + ': ' + mg + ' mg caffeine' + (k > 0 ? ' and ' + k + ' kcal to ' + MEALS[mealNow()].toLowerCase() : ''), '', { act: 'cafUndo', label: 'Undo' });
};
I.cfBed = el => { if (!/^\d\d:\d\d$/.test(el.value)) return; P.bed = el.value; saveProfile(); render(); };

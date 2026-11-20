/* ================= v2: exercise, weight, imports, devices, coach, ideas, bosses ================= */

/* ---------- exercise ---------- */
/* MET values from the Compendium of Physical Activities; calories are net of resting burn. */
const SPORTS = [
  ['Padel', 6],
  ['Walking', 3.5],
  ['Brisk walking', 4.3],
  ['Hiking', 6],
  ['Running, easy', 8.3],
  ['Running, steady', 9.8],
  ['Running, fast', 11.5],
  ['Cycling, easy', 5.8],
  ['Cycling, steady', 8],
  ['Cycling, hard', 10],
  ['Spin class', 8.5],
  ['Swimming', 7],
  ['Weights', 5],
  ['Circuit or HIIT', 8],
  ['CrossFit', 8],
  ['Gaelic football', 8],
  ['Hurling or camogie', 8],
  ['Soccer', 7],
  ['Five-a-side', 7.5],
  ['Rugby', 8.3],
  ['Tennis', 7.3],
  ['Squash', 7.3],
  ['Badminton', 5.5],
  ['Basketball', 6.5],
  ['Golf, walking', 4.8],
  ['Rowing machine', 7],
  ['Elliptical', 5],
  ['Stair climber', 8.8],
  ['Boxing or pads', 7.8],
  ['Yoga', 2.8],
  ['Pilates', 3],
  ['Stretching or mobility', 2.3],
  ['Dancing', 5],
  ['Climbing', 5.8],
  ['Kayaking', 5],
  ['Surfing', 3.5],
  ['Skiing', 7],
  ['Skipping', 11],
  ['Gardening', 3.8],
  ['Housework', 3.3],
];
const SPORT_KEYS = [
  [/run|jog/, 9],
  [/ride|cycl|bik|spin/, 7.5],
  [/swim/, 7],
  [/hik/, 6],
  [/walk/, 3.8],
  [/strength|weight|lift|gym/, 5],
  [/padel|tennis|squash|racquet|racket/, 6.5],
  [/yoga|pilates|stretch|mobility/, 2.8],
  [/row/, 7],
  [/hiit|interval|circuit|cross/, 8],
  [/soccer|football|gaa|rugby|hurl/, 7.5],
  [/golf/, 4.8],
  [/elliptical/, 5],
  [/stair/, 8.8],
  [/box/, 7.8],
  [/danc/, 5],
];
const sportMet = n => {
  const hit = SPORTS.find(s => s[0] === n);
  if (hit) return hit[1];
  const l = String(n || '').toLowerCase();
  const k = SPORT_KEYS.find(x => x[0].test(l));
  return k ? k[1] : 5;
};
const xk = (met, mult, min) => Math.max(0, r0(((met * mult - 1) * P.kg * min) / 60));
const XSRC = { m: '', ad: 'Device', ah: 'Health', csv: 'Import' };
function xlogAdd(d, x) {
  P.xlog = [{ d, n: x.n, min: x.min || 0, k: x.k, src: x.src || 'm' }]
    .concat(P.xlog)
    .sort((a, b) => (a.d < b.d ? 1 : -1))
    .slice(0, 40);
}
let EX = null;
A.addExercise = () => {
  const rec = [...new Set(P.xlog.map(x => x.n))].filter(n => SPORTS.some(s => s[0] === n)).slice(0, 5);
  EX = { mult: 1, auto: true };
  const opt = n => `<option value="${esc(n)}">${esc(n)}</option>`;
  openSheet(`${sh('Add exercise')}<div class="sheet-b">
    <label class="f">Activity<select class="inp" id="exAct" data-on="ex">${rec.length ? `<optgroup label="Recent">${rec.map(opt).join('')}</optgroup>` : ''}<optgroup label="All activities">${SPORTS.map(s => opt(s[0])).join('')}</optgroup><option value="__other">Something else</option></select></label>
    <label class="f hide" id="exOtherWrap">What was it<input class="inp" id="exOther" autocomplete="off" placeholder="Paddleboarding"></label>
    <div class="grid2"><label class="f">Minutes<input class="inp" id="exMin" inputmode="numeric" value="60" data-on="ex"></label><label class="f">Distance km, optional<input class="inp" id="exKm" inputmode="decimal"></label></div>
    <div><div class="tiny muted" style="font-weight:700;margin-bottom:5px">Effort</div>${segHtml(
      'exInt',
      [
        ['0.85', 'Easy'],
        ['1', 'Moderate'],
        ['1.2', 'Hard'],
      ],
      '1',
    )}</div>
    <label class="f">Active calories<input class="inp" id="exK" inputmode="numeric" data-on="exK"></label>
    <p class="small muted">Worked out from the activity, your weight and the time. These are calories on top of what you burn at rest. Type over the number if your watch says otherwise.</p>
  </div><div class="sheet-f"><button class="btn ember" data-act="saveExercise">Save workout</button></div>`);
  SEG.exInt = v => {
    EX.mult = +v;
    exUpdate();
  };
  exUpdate();
};
function exUpdate() {
  const sel = $('#exAct');
  if (!sel) return;
  const other = sel.value === '__other';
  $('#exOtherWrap').classList.toggle('hide', !other);
  if (EX.auto) $('#exK').value = xk(other ? 5 : sportMet(sel.value), EX.mult, Math.max(0, num($('#exMin').value)));
}
I.ex = exUpdate;
I.exK = () => {
  EX.auto = false;
};
A.saveExercise = async () => {
  const sel = $('#exAct').value;
  const n = sel === '__other' ? $('#exOther').value.trim() || 'Exercise' : sel;
  const min = r0(num($('#exMin').value)),
    k = r0(num($('#exK').value)),
    km = r1(num($('#exKm').value));
  if (min <= 0 && k <= 0) return toast('Enter how long you went for.');
  const d = await loadDay(S.date);
  const x = { id: newId(), n, k, min, ...(km ? { km } : {}), src: 'm' };
  d.x.push(x);
  xlogAdd(d.date, x);
  P.st.work++;
  closeSheet();
  const tk = today();
  if (d.date <= tk && d.date >= addDays(tk, -1) && (d.wx || 0) < 2) {
    d.wx = (d.wx || 0) + 1;
    grant(15, 0, d, 'Workout logged');
  } else toast('Workout logged');
  commitDay(d);
};
A.delExercise = async ({ id }) => {
  const d = await loadDay(S.date);
  const x = d.x.find(v => v.id === id);
  if (!x) return;
  d.x = d.x.filter(v => v.id !== id);
  const i = P.xlog.findIndex(l => l.d === d.date && l.n === x.n && l.min === (x.min || 0));
  if (i >= 0) P.xlog.splice(i, 1);
  commitDay(d);
  toast('Workout removed');
};
/* Bulk add from a device or a file. Skips sessions already on that day. */
async function addWorkouts(list, src) {
  const tk = today(),
    cut = addDays(tk, -120);
  const byD = {};
  let added = 0;
  for (const w of list) {
    if (!w || !w.d || w.d < cut || w.d > tk) continue;
    (byD[w.d] = byD[w.d] || []).push(w);
  }
  for (const date of Object.keys(byD).sort()) {
    const d = await loadDay(date);
    let ch = false;
    const before = d.x.slice();
    for (const w of byD[date]) {
      const min = r0(w.min || 0);
      let k = r0(w.k || 0);
      const n = String(w.n || 'Workout').slice(0, 60);
      if (!k && min) k = xk(sportMet(n), 1, min);
      if (!k && !min) continue;
      if (
        before.some(
          x =>
            (x.n === n && Math.abs((x.min || 0) - min) <= 2) ||
            (min > 0 && x.min > 0 && Math.abs(x.min - min) / min < 0.15),
        )
      )
        continue;
      const x = { id: newId(), n, k, min, ...(w.km ? { km: r1(w.km) } : {}), src };
      d.x.push(x);
      xlogAdd(date, x);
      ch = true;
      added++;
    }
    if (ch) {
      setHist(d);
      Store.put('days', date, d);
    }
  }
  P.st.work += added;
  return added;
}
function addWeights(list) {
  const have = new Set(P.wts.map(w => w.d));
  let added = 0;
  const tk = today();
  for (const w of list) {
    if (!w || !w.d || w.d > tk || !(w.kg >= 25 && w.kg <= 400) || have.has(w.d)) continue;
    P.wts.push({ d: w.d, kg: r1(w.kg) });
    have.add(w.d);
    added++;
  }
  P.wts = P.wts.sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-1500);
  if (P.wts.length) P.kg = P.wts[P.wts.length - 1].kg;
  return added;
}

/* ---------- weight trend, goal, milestones ---------- */
function trendSeries() {
  const w = P.wts.slice().sort((a, b) => (a.d < b.d ? -1 : 1));
  let t = null,
    prev = null;
  return w.map(x => {
    if (t === null) t = x.kg;
    else {
      const gap = Math.max(1, Math.round((pdate(x.d) - pdate(prev)) / 864e5));
      t += (1 - Math.pow(0.85, gap)) * (x.kg - t);
    }
    prev = x.d;
    return { d: x.d, kg: x.kg, t: Math.round(t * 100) / 100 };
  });
}
function trendAt(ts, date) {
  let v = null;
  for (const x of ts) {
    if (x.d <= date) v = x.t;
    else break;
  }
  return v;
}
function weeklyPace(ts) {
  const from = addDays(today(), -28);
  const p = ts.filter(x => x.d >= from);
  if (p.length < 2) return null;
  const xs = p.map(x => (pdate(x.d) - pdate(p[0].d)) / 864e5);
  if (xs[xs.length - 1] < 5) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length,
    my = p.reduce((a, b) => a + b.t, 0) / p.length;
  let sxy = 0,
    sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (p[i].t - my);
    sxx += (x - mx) * (x - mx);
  });
  return sxx ? (sxy / sxx) * 7 : null;
}
function milestoneMarks() {
  if (!P.goalKg || !P.startKg || P.goalKg === P.startKg) return [];
  const dir = P.goalKg < P.startKg ? -1 : 1,
    total = Math.abs(P.goalKg - P.startKg);
  const step = total <= 5 ? 1 : total <= 12 ? 2 : total <= 25 ? 2.5 : 5;
  const marks = [];
  let v = P.startKg + dir * step;
  v = dir < 0 ? Math.floor(v / step + 1e-9) * step : Math.ceil(v / step - 1e-9) * step;
  while (dir < 0 ? v > P.goalKg + 0.01 : v < P.goalKg - 0.01) {
    marks.push(r1(v));
    v += dir * step;
  }
  marks.push(P.goalKg);
  return marks;
}
function checkMilestones() {
  const ts = trendSeries();
  if (!ts.length || !P.goalKg) return;
  const t = ts[ts.length - 1].t,
    dir = P.goalKg < P.startKg ? -1 : 1;
  const fresh = [];
  for (const m of milestoneMarks())
    if ((dir < 0 ? t <= m : t >= m) && !P.ms[String(m)]) {
      P.ms[String(m)] = today();
      fresh.push(m);
    }
  if (!fresh.length) return;
  const top = fresh[fresh.length - 1];
  grant(30, 25, null, false);
  celeQ.push({
    icon: 'flag',
    tone: 'good',
    title: top === P.goalKg ? 'Goal weight reached' : top + ' kg milestone',
    sub:
      top === P.goalKg
        ? 'Your trend weight is at ' + r1(t) + ' kg. That is the goal you set.'
        : 'Your trend weight has passed ' + top + ' kg.',
    rewards: ['+30 XP', '+25 gems'],
    confetti: true,
  });
}
A.saveWeight = async () => {
  const kg = r1(num($('#wtKg').value)),
    d = $('#wtD').value || today();
  if (kg < 25 || kg > 400) return toast('Enter a weight in kilograms.');
  const had = P.wts.some(w => w.d === d);
  P.wts = P.wts
    .filter(w => w.d !== d)
    .concat([{ d, kg }])
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .slice(-1500);
  P.kg = P.wts[P.wts.length - 1].kg;
  closeSheet();
  if (!had) {
    P.st.weigh++;
    grant(10, 0, d === today() ? await loadDay(d) : null, 'Weigh-in');
  } else toast('Weigh-in updated');
  checkMilestones();
  commitDay(await loadDay(today()));
};
A.setGoal = () => {
  const ts = trendSeries();
  const now = ts.length ? r1(ts[ts.length - 1].t) : P.kg;
  openSheet(`${sh('Goal weight')}<div class="sheet-b"><label class="f">Goal in kg<input class="inp" id="gwKg" inputmode="decimal" value="${P.goalKg || ''}" placeholder="${r0(now - 5)}"></label>
    <p class="small muted">Your trend weight is ${now} kg. Ember splits the distance into milestones and forecasts the date from your real pace.</p></div>
    <div class="sheet-f">${P.goalKg ? `<button class="btn ghost" style="width:auto" data-act="clearGoal" aria-label="Remove goal">${ic('trash')}</button>` : ''}<button class="btn" data-act="saveGoal">Save goal</button></div>`);
  $('#gwKg').focus();
};
A.saveGoal = () => {
  const g = r1(num($('#gwKg').value));
  if (g < 30 || g > 300) return toast('Enter a goal in kilograms.');
  const ts = trendSeries();
  P.goalKg = g;
  P.startKg = ts.length ? r1(ts[ts.length - 1].t) : P.kg;
  P.startD = today();
  P.ms = {};
  saveProfile();
  closeSheet();
  render();
  toast('Goal set');
};
A.clearGoal = () => {
  P.goalKg = 0;
  P.ms = {};
  saveProfile();
  closeSheet();
  render();
};
A.wRange = ({ n }) => {
  S.wr = +n;
  render();
};
A.pview = ({ v }) => {
  S.pv = v;
  render();
  $('#main').scrollTop = 0;
};

/* ---------- measured metabolism ---------- */
function measuredTdee() {
  const tk = today(),
    from = addDays(tk, -28);
  const ks = [],
    bk = [];
  for (let i = 1; i <= 28; i++) {
    const h = P.hist[addDays(tk, -i)];
    if (h && h.n > 0 && h.k >= 800) ks.push(h.k);
    if (h && h.bk > 800) bk.push(h.bk);
  }
  const ts = trendSeries().filter(x => x.d >= from);
  const span = ts.length > 1 ? (pdate(ts[ts.length - 1].d) - pdate(ts[0].d)) / 864e5 : 0;
  const device = bk.length >= 5 ? Math.round(bk.reduce((a, b) => a + b, 0) / bk.length / 10) * 10 : 0;
  const need = { days: Math.max(0, 10 - ks.length), weighs: Math.max(0, 4 - ts.length), span: Math.max(0, 10 - span) };
  if (need.days || need.weighs || need.span) return { ok: false, need, device };
  const avg = ks.reduce((a, b) => a + b, 0) / ks.length;
  const tdee = Math.round((avg - ((ts[ts.length - 1].t - ts[0].t) * 7700) / span) / 10) * 10;
  if (!(tdee > 1200 && tdee < 5500)) return { ok: false, need, device, odd: true };
  return {
    ok: true,
    tdee,
    avg: r0(avg),
    days: ks.length,
    span: r0(span),
    conf: ks.length >= 20 && span >= 21 ? 'High' : 'Medium',
    formula: calcTargets(P).tdee,
    device,
  };
}
A.retune = () => {
  const m = measuredTdee();
  if (!m.ok) return;
  const adj = P.goal === 'lose' ? -P.rate * 1100 : P.goal === 'gain' ? P.rate * 1100 : 0;
  const k = Math.max(P.sex === 'f' ? 1200 : 1500, Math.round((m.tdee + adj) / 10) * 10);
  P.t.k = k;
  P.t.c = Math.max(50, Math.round((k - P.t.p * 4 - P.t.f * 9) / 4 / 5) * 5);
  saveProfile();
  render();
  toast('Target retuned to ' + fmt(k) + ' kcal');
};

/* ---------- progress sub-views ---------- */
function viewProgress() {
  const v = S.pv || 'food';
  return `<div class="between"><h2 class="sec-h" style="font-size:22px">Progress</h2></div>
  <div class="seg">${[
    ['food', 'Food'],
    ['weight', 'Weight'],
    ['move', 'Activity'],
    ['train', 'Training'],
  ]
    .map(([k, l]) => `<button data-act="pview" data-v="${k}" aria-pressed="${v === k}">${l}</button>`)
    .join('')}</div>
  ${v === 'weight' ? viewWeight() + photoCard() : v === 'move' ? viewMove() : v === 'train' ? viewTraining() : viewFood()}`;
}
function viewWeight() {
  const ts = trendSeries(),
    tk = today();
  const add = `<button class="btn sm ghost" data-act="addWeight">${ic('plus')} Weigh-in</button>`;
  if (!ts.length)
    return `<section class="card stack"><div class="between"><h2>Weight</h2>${add}</div><p class="empty">No weigh-ins yet. Add one, or bring your history in from Apple Health or a scale app export.</p><button class="link" data-act="openConnections" style="align-self:flex-start">Import my history</button></section>`;
  const last = ts[ts.length - 1],
    rng = S.wr === undefined ? 90 : S.wr;
  const from = rng ? addDays(tk, -rng) : ts[0].d;
  let pts = ts.filter(x => x.d >= from);
  if (pts.length < 2) pts = ts.slice(-Math.min(ts.length, 8));
  const W = 340,
    H = 176,
    pl = 30,
    pr = 10,
    pt = 10,
    pb = 20;
  const t0 = pdate(pts[0].d).getTime(),
    t1 = Math.max(pdate(tk).getTime(), t0 + 864e5);
  const vals = pts.flatMap(x => [x.kg, x.t]);
  const goalIn = P.goalKg && Math.abs(P.goalKg - last.t) < 12;
  if (goalIn) vals.push(P.goalKg);
  let lo = Math.min(...vals),
    hi = Math.max(...vals);
  const pv = Math.max(0.6, (hi - lo) * 0.12);
  lo -= pv;
  hi += pv;
  const X = d => pl + (W - pl - pr) * ((pdate(d).getTime() - t0) / (t1 - t0)),
    Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  const line = pts.map(x => X(x.d).toFixed(1) + ',' + Y(x.t).toFixed(1)).join(' ');
  const ticks = [0.1, 0.5, 0.9].map(f => lo + (hi - lo) * f);
  const chart = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend chart">${ticks.map(v => `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${pl - 5}" y="${Y(v) + 3}" text-anchor="end">${r1(v)}</text>`).join('')}
    ${goalIn ? `<line x1="${pl}" x2="${W - pr}" y1="${Y(P.goalKg)}" y2="${Y(P.goalKg)}" stroke="var(--good)" stroke-dasharray="4 4" stroke-width="1.5"/><text x="${W - pr}" y="${Y(P.goalKg) - 4}" text-anchor="end" style="fill:var(--good)">Goal ${P.goalKg}</text>` : ''}
    ${pts.map(x => `<circle cx="${X(x.d).toFixed(1)}" cy="${Y(x.kg).toFixed(1)}" r="2.6" fill="var(--muted)" opacity=".55"/>`).join('')}
    <polyline points="${line}" fill="none" stroke="var(--ember)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(last.d)}" cy="${Y(last.t)}" r="5" fill="var(--ember)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${pl}" y="${H - 4}">${niceDate(pts[0].d)}</text><text x="${W - pr}" y="${H - 4}" text-anchor="end">Today</text></svg>`;
  const ch = n => {
    const b = trendAt(ts, addDays(tk, -n));
    return b == null ? null : r1(last.t - b);
  };
  const c7 = ch(7),
    c30 = ch(30),
    pace = weeklyPace(ts);
  const sg = v => (v == null ? 'n/a' : (v > 0 ? '+' : '') + v + ' kg');
  const bmi = r1(last.t / Math.pow(P.cm / 100, 2));
  let goal = `<section class="card stack"><div class="between"><h2>Goal</h2></div><p class="small muted">Set a goal weight and Ember breaks it into milestones and forecasts the date from your real pace.</p><button class="btn" data-act="setGoal">${ic('flag')} Set a goal weight</button></section>`;
  if (P.goalKg) {
    const dir = P.goalKg < P.startKg ? -1 : 1,
      total = Math.abs(P.goalKg - P.startKg) || 1,
      done = clamp((last.t - P.startKg) * dir, 0, total),
      toGo = Math.max(0, r1((P.goalKg - last.t) * dir));
    const marks = milestoneMarks();
    const next = marks.find(m => !P.ms[String(m)]);
    let fc = 'Add a few more weigh-ins and a forecast date appears here.';
    if (toGo <= 0) fc = 'Your trend weight is at your goal.';
    else if (pace != null)
      fc =
        pace * dir >= 0.05
          ? 'At your pace of ' +
            Math.abs(r1(pace)) +
            ' kg a week you reach ' +
            P.goalKg +
            ' kg around ' +
            (d => d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear())(
              pdate(addDays(tk, Math.round(((P.goalKg - last.t) / pace) * 7))),
            ) +
            '.'
          : 'Your trend is not moving towards the goal yet, so there is no forecast date.';
    goal = `<section class="card stack"><div class="between"><h2>Goal ${P.goalKg} kg</h2><button class="link" data-act="setGoal">Edit</button></div>
      <div class="between small"><b>${r1(done)} of ${r1(total)} kg</b><span class="muted tn">${toGo} kg to go</span></div>${bar(done, total, 'good lg')}
      <p class="small">${fc}</p><div class="ms">${marks.map(m => `<span class="${P.ms[String(m)] ? 'on' : m === next ? 'next' : ''}">${P.ms[String(m)] ? ic('check') : ''}${m}</span>`).join('')}</div></section>`;
  }
  const m = measuredTdee();
  let td;
  if (m.ok)
    td = `<div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:32px">${fmt(m.tdee)}</span><span class="muted">kcal a day</span><span class="pill ${m.conf === 'High' ? 'good' : 'gold'}">${m.conf} confidence</span></div>
      <p class="small muted">Worked out from ${m.days} logged days averaging ${fmt(m.avg)} kcal and how your trend weight moved over ${m.span} days. The formula guessed ${fmt(m.formula)}${m.device ? ', and your devices report ' + fmt(m.device) : ''}.</p>
      <button class="btn sm ghost" data-act="retune" style="align-self:flex-start">Retune my calorie target</button>`;
  else
    td = `<p class="small muted">${m.odd ? 'The numbers from the last four weeks do not add up to a believable figure yet. Keep logging full days and it will settle.' : 'Ember measures what you really burn from your food log and your weight trend. To unlock it it needs ' + [m.need.days ? m.need.days + ' more logged day' + (m.need.days === 1 ? '' : 's') : '', m.need.weighs ? m.need.weighs + ' more weigh-in' + (m.need.weighs === 1 ? '' : 's') : '', !m.need.days && !m.need.weighs && m.need.span ? 'weigh-ins spread over ' + r0(m.need.span) + ' more days' : ''].filter(Boolean).join(' and ') + '.'}${m.device ? ' Your devices report about ' + fmt(m.device) + ' kcal a day.' : ''}</p>`;
  return `<section class="card stack"><div class="between"><div><div class="muted small" style="font-weight:600">Trend weight</div><div class="num" style="font-size:40px;line-height:1.05">${r1(last.t)} kg</div></div>${add}</div>
    <div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill">Scale ${last.kg} kg · ${niceDate(last.d)}</span>${ts.length > 1 ? `<span class="pill">${sg(r1(last.t - ts[0].t))} since ${niceDate(ts[0].d)}</span>` : ''}</div>
    ${chart}<div class="seg">${[
      [30, '1 month'],
      [90, '3 months'],
      [365, '1 year'],
      [0, 'All'],
    ]
      .map(([n, l]) => `<button data-act="wRange" data-n="${n}" aria-pressed="${rng === n}">${l}</button>`)
      .join('')}</div>
    <p class="tiny muted">The line is your trend, smoothed so water and salt do not throw it. Dots are what the scale said.</p></section>
  ${goal}
  <div class="stat4"><div class="stat"><div class="num">${sg(c7)}</div><span>Last 7 days</span></div><div class="stat"><div class="num">${sg(c30)}</div><span>Last 30 days</span></div><div class="stat"><div class="num">${pace == null ? 'n/a' : (pace > 0 ? '+' : '') + r1(pace) + ' kg'}</div><span>Pace per week</span></div><div class="stat"><div class="num">${bmi}</div><span>BMI</span></div></div>
  <section class="card stack"><h2>What you really burn</h2>${td}</section>
  <section class="card"><div class="between"><h2>Weigh-ins</h2><button class="link" data-act="openConnections">Import</button></div>
    <div>${ts
      .slice(-8)
      .reverse()
      .map(
        w =>
          `<button class="entry" data-act="delWeight" data-date="${w.d}"><span class="n">${niceDate(w.d)}</span><span class="k">${w.kg} kg</span><span class="s">Trend ${r1(w.t)} kg · tap to remove</span></button>`,
      )
      .join('')}</div></section>`;
}
function viewMove() {
  const tk = today(),
    ws = weekStart(tk);
  const days = WD.map((w, i) => {
    const k = addDays(ws, i),
      h = P.hist[k] || {};
    return { k, w, m: h.xm || 0, kc: h.ex || 0, st: h.st, ab: h.ab };
  });
  const tot = days.reduce((s, d) => s + d.m, 0),
    kc = days.reduce((s, d) => s + d.kc, 0),
    n = P.xlog.filter(x => x.d >= ws).length;
  const W = 340,
    H = 130,
    mx = Math.max(60, ...days.map(d => d.m));
  const bw = W / 7;
  const bars = days
    .map((d, i) => {
      const h = (d.m / mx) * (H - 30);
      const x = i * bw + bw * 0.2,
        w = bw * 0.6;
      return `<rect x="${x}" y="${d.m ? H - 20 - h : H - 23}" width="${w}" height="${d.m ? h : 3}" rx="4" fill="${d.m ? 'var(--ember)' : 'var(--line)'}"/>${d.m ? `<text x="${x + w / 2}" y="${H - 24 - h}" text-anchor="middle">${d.m}</text>` : ''}<text x="${x + w / 2}" y="${H - 5}" text-anchor="middle" ${d.k === tk ? 'style="fill:var(--ink)"' : ''}>${d.w[0]}</text>`;
    })
    .join('');
  const steps = days.filter(d => d.st > 0),
    ab = days.filter(d => d.ab > 0);
  return `<section class="card stack"><div class="between"><h2>This week</h2><button class="btn sm ghost" data-act="addExercise">${ic('plus')} Workout</button></div>
    <div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:40px;line-height:1">${tot}</span><span class="muted">of 150 active minutes</span></div>${bar(tot, 150, tot >= 150 ? 'good lg' : 'ember lg')}
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Active minutes per day">${bars}</svg>
    <div class="grid3 small"><div><b>${n}</b> workout${n === 1 ? '' : 's'}</div><div><b>${fmt(kc)}</b> kcal</div><div>${steps.length ? `<b>${fmt(steps.reduce((s, d) => s + d.st, 0) / steps.length)}</b> steps a day` : ''}</div></div>
    <p class="tiny muted">150 minutes a week is the World Health Organization's baseline for adults.</p></section>
  <section class="card"><div class="between"><h2>Recent workouts</h2></div>
    ${
      P.xlog.length
        ? P.xlog
            .slice(0, 12)
            .map(
              x =>
                `<button class="entry" data-act="goDate" data-date="${x.d}"><span class="n">${esc(x.n)}</span><span class="k">${fmt(x.k)}</span><span class="s">${XSRC[x.src] ? `<span class="src l">${XSRC[x.src]}</span>` : ''}${niceDate(x.d)}${x.min ? ' · ' + x.min + ' min' : ''}</span></button>`,
            )
            .join('')
        : `<p class="empty">Nothing yet. Log a workout, or pull them in from your watch.</p>`
    }</section>
  <section class="card stack"><div class="between"><h2>Devices</h2>${P.ad ? `<span class="muted small">Synced ${niceDate(P.ad.at.slice(0, 10))}</span>` : ''}</div>
    <p class="small muted">${ab.length ? 'Your devices logged ' + fmt(ab.reduce((s, d) => s + d.ab, 0)) + ' active kcal so far this week.' : AI.mcp ? 'Pull workouts, weight and steps from Apple Health, Garmin and WHOOP through athletedata, or import a file.' : 'Bring in workouts, weigh-ins and steps from a file: Apple Health, Garmin Connect, Strava, WHOOP or Happy Scale. Syncing straight from a watch is not available yet.'}</p>
    ${AI.mcp ? `<div class="two"><button class="btn sm" data-act="adSync">${ic('pulse')} Sync devices</button><button class="btn sm ghost" data-act="openConnections">${ic('link')} Connections</button></div>` : `<button class="btn sm" data-act="openConnections" style="align-self:flex-start">${ic('upload')} Import a file</button>`}</section>`;
}

/* ---------- file imports ---------- */
function parseCSV(text) {
  const first = text.slice(0, text.indexOf('\n') > 0 ? text.indexOf('\n') : 2000);
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
const MON3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function parseDate(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let a = +m[1],
      b = +m[2],
      y = +m[3];
    if (y < 100) y += 2000;
    if (b > 12 && a <= 12) [a, b] = [b, a];
    return y + '-' + pad(b) + '-' + pad(a);
  }
  m = s.match(/([A-Za-z]{3})[a-z]*\.? (\d{1,2}),? (\d{4})/);
  if (m && MON3.indexOf(m[1].toLowerCase()) >= 0)
    return m[3] + '-' + pad(MON3.indexOf(m[1].toLowerCase()) + 1) + '-' + pad(m[2]);
  m = s.match(/(\d{1,2}) ([A-Za-z]{3})[a-z]*\.?,? (\d{4})/);
  if (m && MON3.indexOf(m[2].toLowerCase()) >= 0)
    return m[3] + '-' + pad(MON3.indexOf(m[2].toLowerCase()) + 1) + '-' + pad(m[1]);
  const t = Date.parse(s);
  return isNaN(t) ? null : dkey(new Date(t));
}
const cnum = v =>
  num(
    String(v || '')
      .replace(/[^0-9.,\-]/g, '')
      .replace(/,(?=\d{3}(\D|$))/g, ''),
    0,
  );
function readCsv(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { err: 'That file has no rows to read.' };
  const hd = rows[0].map(h => h.trim().toLowerCase());
  const find = (...res) => {
    for (const r of res) {
      const i = hd.findIndex(h => r.test(h));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iD = find(/^date$/, /activity date/, /workout start/, /start time/, /^day$/, /date/, /time/);
  if (iD < 0) return { err: 'No date column found. Send the file to Claude in chat and it can be mapped by hand.' };
  const iW = find(/^weight/, /body ?mass/, /weight/),
    iK = find(/^calories/, /energy burned/, /kcal/, /calor/),
    iDur = find(/^duration/, /elapsed time/, /moving time/, /^time$/, /duration/);
  const iN = find(/activity type/, /^sport/, /activity name/, /^title$/, /^type$/, /name/),
    iKm = find(/^distance/);
  const body = rows.slice(1);
  if (iW >= 0 && iK < 0 && iDur < 0) {
    const h = hd[iW];
    const vals = body.map(r => cnum(r[iW])).filter(v => v > 0);
    const med = vals.slice().sort((a, b) => a - b)[vals.length >> 1] || 0;
    const mult = /\blb|pound/.test(h)
      ? 0.45359237
      : /\bst\b|stone/.test(h)
        ? 6.35029
        : /kg|kilo/.test(h)
          ? 1
          : med > 160
            ? 0.45359237
            : 1;
    return {
      wts: body.map(r => ({ d: parseDate(r[iD]), kg: cnum(r[iW]) * mult })).filter(w => w.d && w.kg > 0),
      unit: mult === 1 ? 'kg' : mult < 1 ? 'lb' : 'st',
    };
  }
  if (iK < 0 && iDur < 0) return { err: 'No weight, calories or duration column found in that file.' };
  const hDur = iDur >= 0 ? hd[iDur] : '';
  const works = [];
  for (const r of body) {
    const d = parseDate(r[iD]);
    if (!d) continue;
    let min = 0;
    const dv = String(iDur >= 0 ? r[iDur] : '').trim();
    if (/^\d+:\d+(:\d+)?/.test(dv)) {
      const p = dv.split(':').map(Number);
      min = p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : p[0] + p[1] / 60;
    } else if (dv) {
      const v = cnum(dv);
      min = /min/.test(hDur) ? v : /sec|elapsed|moving/.test(hDur) ? v / 60 : v > 300 ? v / 60 : v;
    }
    let km = iKm >= 0 ? cnum(r[iKm]) : 0;
    if (km > 500) km /= 1000;
    const k = iK >= 0 ? cnum(r[iK]) : 0;
    if (!min && !k) continue;
    works.push({ d, n: iN >= 0 && r[iN] ? r[iN].trim() : 'Workout', min, k, km });
  }
  return { works };
}
async function parseHealth(file, onProg) {
  const wts = {},
    works = [];
  const cut = addDays(today(), -120);
  let buf = '',
    cur = null;
  const dec = new TextDecoder();
  const attr = (s, k) => {
    const m = s.match(new RegExp('(?:^|\\s)' + k + '="([^"]*)"'));
    return m ? m[1] : '';
  };
  const re = /<(Record|Workout|WorkoutStatistics)\s([^>]*?)(\/?)>|<\/Workout>/g;
  const NAMES = {
    TraditionalStrengthTraining: 'Weights',
    FunctionalStrengthTraining: 'Weights',
    HighIntensityIntervalTraining: 'HIIT',
  };
  const energy = (v, u) => (/kj/i.test(u) ? v / 4.184 : v),
    dist = (v, u) => (u === 'mi' ? v * 1.60934 : u === 'm' ? v / 1000 : v);
  const eat = text => {
    buf += text;
    let end = 0,
      m;
    re.lastIndex = 0;
    while ((m = re.exec(buf))) {
      end = re.lastIndex;
      const a = m[2] || '';
      if (!m[1]) {
        if (cur) {
          if (cur.d >= cut) works.push(cur);
          cur = null;
        }
      } else if (m[1] === 'Record') {
        if (a.indexOf('HKQuantityTypeIdentifierBodyMass"') < 0) continue;
        const u = attr(a, 'unit'),
          v = +attr(a, 'value'),
          d = attr(a, 'startDate').slice(0, 10);
        if (d && v > 0) wts[d] = u === 'lb' ? v * 0.45359237 : u === 'st' ? v * 6.35029 : u === 'g' ? v / 1000 : v;
      } else if (m[1] === 'Workout') {
        const ty = attr(a, 'workoutActivityType').replace('HKWorkoutActivityType', '');
        const du = attr(a, 'durationUnit'),
          dv = +attr(a, 'duration') || 0;
        const w = {
          d: attr(a, 'startDate').slice(0, 10),
          n: NAMES[ty] || ty.replace(/([a-z])([A-Z])/g, '$1 $2') || 'Workout',
          min: du === 's' ? dv / 60 : du === 'hr' ? dv * 60 : dv,
          k: energy(+attr(a, 'totalEnergyBurned') || 0, attr(a, 'totalEnergyBurnedUnit')),
          km: dist(+attr(a, 'totalDistance') || 0, attr(a, 'totalDistanceUnit')),
        };
        if (m[3]) {
          if (w.d >= cut) works.push(w);
        } else cur = w;
      } else if (cur) {
        const ty = attr(a, 'type'),
          sum = +attr(a, 'sum') || 0,
          u = attr(a, 'unit');
        if (/ActiveEnergyBurned/.test(ty) && !cur.k) cur.k = energy(sum, u);
        else if (/Distance/.test(ty) && !cur.km) cur.km = dist(sum, u);
      }
    }
    const lt = buf.lastIndexOf('<');
    buf = lt >= end ? buf.slice(lt) : '';
    if (buf.length > 4e6) buf = buf.slice(-2e6);
  };
  const reader = file.stream().getReader();
  let read = 0,
    i = 0;
  if (/\.zip$/i.test(file.name) || /zip/.test(file.type)) {
    if (!window.fflate) window.fflate = await import('fflate');
    const unz = new window.fflate.Unzip();
    unz.register(window.fflate.UnzipInflate);
    let found = false;
    unz.onfile = f => {
      if (/\.xml$/i.test(f.name) && !/cda/i.test(f.name)) {
        found = true;
        f.ondata = (err, chunk, final) => {
          if (err) throw err;
          eat(dec.decode(chunk, { stream: !final }));
        };
        f.start();
      }
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        unz.push(new Uint8Array(0), true);
        break;
      }
      read += value.length;
      unz.push(value);
      if (++i % 6 === 0) {
        onProg(read / file.size);
        await sleep(0);
      }
    }
    if (!found) throw { code: 'noxml' };
  } else
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value.length;
      eat(dec.decode(value, { stream: true }));
      if (++i % 6 === 0) {
        onProg(read / file.size);
        await sleep(0);
      }
    }
  return { wts: Object.keys(wts).map(d => ({ d, kg: wts[d] })), works };
}
async function applyImport(res, src) {
  const nw = res.wts && res.wts.length ? addWeights(res.wts) : 0;
  const nx = res.works && res.works.length ? await addWorkouts(res.works, src) : 0;
  checkMilestones();
  checkAch();
  saveProfile();
  render();
  flushCele();
  return { nw, nx };
}
const impOut = html => {
  const o = $('#impOut');
  if (o) o.innerHTML = html;
};
async function onCsv(file) {
  impOut(`<div class="busy"><div class="spinner"></div>Reading ${esc(file.name)}</div>`);
  try {
    const r = readCsv(await file.text());
    if (r.err) return impOut(`<div class="banner">${ic('label')}<span>${esc(r.err)}</span></div>`);
    const { nw, nx } = await applyImport(r, 'csv');
    impOut(
      `<div class="banner">${ic('check')}<span>${r.wts ? 'Added ' + nw + ' weigh-in' + (nw === 1 ? '' : 's') + (r.unit !== 'kg' ? ', converted from ' + r.unit : '') + '. ' + (r.wts.length - nw) + ' were already there or out of range.' : 'Added ' + nx + ' workout' + (nx === 1 ? '' : 's') + ' from the last 120 days. Anything already logged was skipped.'}</span></div>`,
    );
  } catch (e) {
    impOut(`<div class="banner">${ic('label')}<span>That file could not be read.</span></div>`);
  }
}
async function onHealth(file) {
  impOut(
    `<div class="stack"><span class="small muted" id="impMsg">Reading your Apple Health export. Large exports take a minute.</span><div class="prog"><i id="impBar" style="width:0"></i></div></div>`,
  );
  try {
    const r = await parseHealth(file, f => {
      const b = $('#impBar');
      if (b) b.style.width = Math.round(f * 100) + '%';
    });
    const { nw, nx } = await applyImport(r, 'ah');
    impOut(
      `<div class="banner">${ic('check')}<span>Apple Health: found ${r.wts.length} days with a weight and ${r.works.length} recent workouts. Added ${nw} weigh-in${nw === 1 ? '' : 's'} and ${nx} workout${nx === 1 ? '' : 's'}.</span></div>`,
    );
  } catch (e) {
    impOut(
      `<div class="banner">${ic('label')}<span>${e && e.code === 'noxml' ? 'There is no export.xml in that zip. Pick the file the Health app made with Export All Health Data.' : 'That export could not be read. Pick the export.zip the Health app made.'}</span></div>`,
    );
  }
}

/* ---------- athletedata (Apple Health, Garmin, WHOOP) through the connector ---------- */
const AD = 'athletedata';
const linkify = t =>
  esc(t).replace(
    /https?:\/\/[^\s<]+[^\s<.,)]/g,
    u => `<a class="link" href="${u}">${u.replace(/^https?:\/\/(www\.)?/, '')}</a>`,
  );
const MCP_MSG = {
  server_not_connected:
    'athletedata is not connected to your Claude account in this view. Add it in Claude under Connectors, then sync again.',
  needs_reauth: 'athletedata needs reconnecting in Claude under Connectors.',
  not_in_manifest: 'Ember was not allowed to use athletedata. Tap Sync again and choose Allow.',
  approval_required: 'Ember needs your approval to read athletedata. Tap Sync again and choose Allow.',
  consent_required: 'Ember needs your approval to read athletedata. Tap Sync again and choose Allow.',
  blocked_by_policy: 'Your organisation blocks this connector.',
  server_unavailable: 'athletedata did not answer. Try again in a minute.',
  not_granted: 'Connectors are switched off for Ember in this view.',
  capability_disabled: 'Connectors are not available in this view.',
};
async function adCall(tool, input) {
  const r = await AI.mcp.callTool(AD, tool, input, { cache: false });
  return r.payload !== undefined ? r.payload : (r.content || []).map(c => c.text || '').join('\n');
}
const isData = v => v && typeof v === 'object';
A.adSync = async () => {
  if (!sheets.length || !$('#adOut')) A.openConnections();
  const out = h => {
    const o = $('#adOut');
    if (o) o.innerHTML = h;
  };
  if (!AI.ready) return out(`<p class="small muted">Still connecting. Try again in a moment.</p>`);
  if (!AI.mcp)
    return out(
      `<div class="banner">${ic('link')}<span>Connectors are not available in this view. Open Ember from inside Claude.</span></div>`,
    );
  if (!AI.sample)
    return out(
      `<div class="banner">${ic('spark')}<span>Syncing uses Claude to read what your devices send, and Claude is not available in this view.</span></div>`,
    );
  out(`<div class="busy"><div class="spinner"></div>Asking athletedata for your last 14 days</div>`);
  const end = today(),
    start = addDays(end, -13);
  try {
    const daily = await adCall('get_daily_metrics', { days: 14 });
    if (!isData(daily))
      return out(
        `<div class="card stack"><b>athletedata is connected, but it has no data to send yet</b><p class="small">${linkify(String(daily).slice(0, 900))}</p></div>`,
      );
    const tools = ['apple_health_get_workouts', 'garmin_get_activities', 'whoop_get_workouts'];
    const got = await Promise.allSettled(tools.map(t => adCall(t, { start_date: start, end_date: end })));
    const lists = got
      .map((g, i) =>
        g.status === 'fulfilled' && isData(g.value)
          ? '\n\n### ' + tools[i] + '\n' + JSON.stringify(g.value).slice(0, 30000)
          : '',
      )
      .join('');
    out(`<div class="busy"><div class="spinner"></div>Sorting workouts, weight and steps</div>`);
    const r = await AI.sample.json(
      ['wearable_convert', { start, end, daily: JSON.stringify(daily).slice(0, 50000), lists }],
      { cache: false },
    );
    const days = Array.isArray(r && r.days) ? r.days : [],
      wk = Array.isArray(r && r.workouts) ? r.workouts : [];
    let nd = 0;
    for (const d of days) {
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d.date || '') || d.date > end) continue;
      const h = P.hist[d.date] || (P.hist[d.date] = { k: 0, p: 0, c: 0, f: 0, n: 0 });
      let any = false;
      if (d.steps > 0) {
        h.st = r0(d.steps);
        any = true;
      }
      if (d.activeKcal > 0) {
        h.ab = r0(d.activeKcal);
        any = true;
      }
      if (d.burnKcal > 0) {
        h.bk = r0(d.burnKcal);
        any = true;
      }
      if (d.recovery > 0) {
        h.rd = r0(d.recovery);
        any = true;
      }
      if (d.sleepHours > 0) {
        h.sl = r1(d.sleepHours);
        any = true;
      }
      if (d.hrvMs > 0) {
        h.hv = r0(d.hrvMs);
        any = true;
      }
      if (d.restingHr > 0) {
        h.rh = r0(d.restingHr);
        any = true;
      }
      if (d.strain > 0) {
        h.sn = r1(d.strain);
        any = true;
      }
      if (any) nd++;
    }
    const nw = addWeights(days.filter(d => d && d.weightKg > 0).map(d => ({ d: d.date, kg: d.weightKg })));
    const nx = await addWorkouts(
      wk.filter(w => w && w.date).map(w => ({ d: w.date, n: w.name, min: w.minutes, k: w.kcal, km: w.km })),
      'ad',
    );
    P.ad = { at: new Date().toISOString(), nx, nw, nd };
    checkMilestones();
    checkAch();
    saveProfile();
    render();
    flushCele();
    out(
      `<div class="banner">${ic('check')}<span>Synced. Added ${nx} workout${nx === 1 ? '' : 's'} and ${nw} weigh-in${nw === 1 ? '' : 's'}, and updated steps and energy for ${nd} day${nd === 1 ? '' : 's'}.</span></div>`,
    );
  } catch (e) {
    const c = e && e.code;
    out(
      `<div class="banner">${ic('link')}<span>${esc(MCP_MSG[c] || (c === 'tool_error' ? 'athletedata reported a problem: ' + String(e.message || '').slice(0, 200) : AI_MSG[c] || 'The sync did not finish. Try again in a minute.'))}</span></div>`,
    );
  }
};
A.openConnections = () => {
  openSheet(
    `${sh(AI.mcp ? 'Connections and import' : 'Import')}<div class="sheet-b">
    <div class="card stack${AI.mcp ? '' : ' hide'}"><div class="between"><h2>Apple Health, Garmin, WHOOP</h2>${P.ad ? `<span class="pill good">Synced ${niceDate(P.ad.at.slice(0, 10))}</span>` : ''}</div>
      <p class="small muted">Through your athletedata connector. Ember pulls the last 14 days of workouts, weigh-ins, steps and energy burned, and counts a session once even if two devices recorded it. Strava sessions arrive the same way once Strava is linked in athletedata.</p>
      <button class="btn" data-act="adSync">${ic('pulse')} Sync devices</button><div id="adOut"></div></div>
    <div class="card stack"><h2>Import a file</h2>
      <p class="small muted">Weight history or workouts from a CSV export: Happy Scale, Garmin Connect, Strava, WHOOP. Or everything from Apple Health in one go.</p>
      <div class="two"><button class="btn sm ghost" data-act="pickCsv">${ic('upload')} CSV file</button><button class="btn sm ghost" data-act="pickHealth">${ic('upload')} Health export</button></div><div id="impOut"></div>
      <p class="tiny muted">Apple Health: open the Health app, tap your picture, then Export All Health Data, save the zip to Files and pick it here. Happy Scale: Settings, then Export Data.</p></div></div>`,
    true,
  );
};
A.pickCsv = () => $('#fileCsv').click();
A.pickHealth = () => $('#fileHealth').click();
$('#fileCsv').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) onCsv(f);
});
$('#fileHealth').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) onHealth(f);
});

/* ---------- coach ---------- */
function coachContext() {
  const tk = today();
  const lines = [];
  for (let i = 13; i >= 0; i--) {
    const k = addDays(tk, -i),
      h = P.hist[k];
    lines.push(
      k +
        ' ' +
        WD[(pdate(k).getDay() + 6) % 7] +
        ': ' +
        (h && h.n
          ? `${h.k} kcal, protein ${h.p} g, carbs ${h.c} g, fat ${h.f} g, ${h.n} items${h.d ? (h.zn ? ', closed in zone' : ', closed outside zone') : ''}`
          : 'no food logged') +
        (h && h.xm ? `, exercise ${h.xm} min (${h.ex} kcal)` : '') +
        (h && h.bk ? `, devices say ${h.bk} kcal burned` : '') +
        (h && h.st ? `, ${h.st} steps` : '') +
        (h && h.cf ? `, caffeine ${h.cf} mg` : '') +
        (k === tk ? ' (today, still in progress)' : ''),
    );
  }
  const ts = trendSeries(),
    last = ts[ts.length - 1],
    pace = weeklyPace(ts),
    m = measuredTdee(),
    z = zone(S.days[tk] || newDay(tk));
  const d = S.days[tk];
  const eaten = d && d.e.length ? d.e.map(e => e.n + ' ' + e.k + ' kcal').join('; ') : 'nothing yet';
  return `Targets: ${P.t.k} kcal a day (zone ${z.lo} to ${z.hi}), protein ${P.t.p} g, carbs ${P.t.c} g, fat ${P.t.f} g, water ${P.t.w} ml. Aim: ${P.goal === 'lose' ? 'lose weight at ' + P.rate + ' kg a week' : P.goal === 'gain' ? 'gain at ' + P.rate + ' kg a week' : 'maintain'}.
Person: ${P.sex === 'f' ? 'female' : 'male'}, ${P.age}, ${P.cm} cm. ${last ? 'Trend weight ' + r1(last.t) + ' kg' + (pace != null ? ', moving ' + r1(pace) + ' kg a week' : '') + '.' : 'No weigh-ins.'}${P.goalKg ? ' Goal weight ' + P.goalKg + ' kg.' : ''}${m.ok ? ' Measured burn ' + m.tdee + ' kcal a day.' : ''} Streak ${streak().count} days.
Today so far: ${eaten}.${trainContext()}
Last 14 days:
${lines.join('\n')}`;
}
A.coach = () => {
  const r = P.coach && P.coach.r;
  openSheet(
    `${sh('Coach')}<div class="sheet-b"><div id="coachOut" class="card coach">${r ? coachHtml(P.coach) : `<p class="small muted">A straight read of your last two weeks: what is working, what to watch, and three things to do next.</p>`}</div>
    <button class="btn" data-act="coachReview">${ic('spark')} ${r ? 'Refresh my review' : 'Review my last two weeks'}</button>
    <div class="card stack"><h2>Ask about your numbers</h2><div class="row"><input class="inp" id="coachQ" placeholder="Why am I not losing weight?" autocomplete="off"><button class="btn sm" data-act="coachAsk">Ask</button></div><div class="answer" id="coachA"></div></div></div>`,
    true,
  );
};
function coachHtml(c) {
  const r = c.r,
    li = (arr, cls, icn) =>
      (arr || [])
        .slice(0, 3)
        .map(t => `<li class="${cls}">${ic(icn)}<span>${esc(t)}</span></li>`)
        .join('');
  return `<div class="tiny muted">${niceDate(c.d)}</div><h2 style="margin:4px 0 2px">${esc(r.headline || 'Your review')}</h2>${(r.wins || []).length ? `<h4>Working</h4><ul>${li(r.wins, '', 'check')}</ul>` : ''}${(r.watch || []).length ? `<h4>Watch</h4><ul>${li(r.watch, 'w', 'target')}</ul>` : ''}${(r.next || []).length ? `<h4>This week</h4><ul>${li(r.next, 'n', 'chev-r')}</ul>` : ''}`;
}
A.coachReview = async () => {
  if (!AI.sample) return toast('The coach needs Claude, which is not available in this view.');
  const logged = Object.keys(P.hist).filter(k => P.hist[k].n > 0).length;
  if (logged < 2) return toast('Log a couple of days first so there is something to review.');
  const o = $('#coachOut');
  o.innerHTML = `<div class="busy"><div class="spinner"></div>Reading your last two weeks</div>`;
  try {
    const r = await AI.sample.json(['coach_review', { context: coachContext() }], { cache: false });
    if (!r || typeof r !== 'object') throw { code: 'invalid_json' };
    P.coach = {
      d: today(),
      r: {
        headline: String(r.headline || ''),
        wins: (r.wins || []).map(String),
        watch: (r.watch || []).map(String),
        next: (r.next || []).map(String),
      },
    };
    saveProfile();
    if ($('#coachOut')) $('#coachOut').innerHTML = coachHtml(P.coach);
  } catch (e) {
    if ($('#coachOut')) $('#coachOut').innerHTML = `<p class="small muted">${esc(aiError(e))}</p>`;
  }
};
A.coachAsk = async () => {
  const q = ($('#coachQ').value || '').trim();
  if (q.length < 3) return;
  if (!AI.sample) return toast('The coach needs Claude, which is not available in this view.');
  const a = $('#coachA');
  a.textContent = 'Thinking…';
  try {
    await AI.sample(['coach_ask', { context: coachContext(), question: q }], {
      cache: false,
      onText: ({ text }) => {
        const el = $('#coachA');
        if (el) el.textContent = text;
      },
    });
  } catch (e) {
    const el = $('#coachA');
    if (el) el.textContent = e && e.text ? e.text : aiError(e);
  }
};

/* ---------- what can I eat: ideas from your foods, or from a menu photo ---------- */
let IDEAS = null;
function leftNow() {
  const d = day(),
    t = totals(d),
    z = zone(d);
  return {
    k: Math.max(0, r0(z.b - t.k)),
    p: Math.max(0, r0(P.t.p - t.p)),
    c: Math.max(0, r0(P.t.c - t.c)),
    f: Math.max(0, r0(P.t.f - t.f)),
  };
}
/* How big each suggested dish should be: a fair share of the day for that meal, a size you pick, or everything left. Never more than is left. */
const IDEA_SIZES = [
  ['auto', 'Fit the meal'],
  ['200', 'Snack, 200'],
  ['400', 'Light, 400'],
  ['600', 'Meal, 600'],
  ['800', 'Big, 800'],
  ['all', 'All I have left'],
];
function ideaBudget() {
  const l = leftNow(),
    m = IDEAS.meal,
    sz = IDEAS.size || 'auto',
    want = sz === 'all' ? l.k : sz === 'auto' ? P.t.k * ({ b: 0.3, l: 0.35, d: 0.45, s: 0.12 }[m] || 0.35) : +sz;
  const k = Math.max(100, Math.round(Math.min(l.k, want) / 10) * 10),
    p = Math.max(8, Math.min(l.p, 70, Math.round((k * (m === 's' ? 0.2 : 0.3)) / 4 / 5) * 5));
  return { k, p, l, capped: want > l.k + 5, none: l.k < 100 };
}
function ideaBudgetLine() {
  const el = $('#idBud');
  if (!el || !IDEAS) return;
  const b = ideaBudget();
  el.innerHTML = b.none
    ? `You have used today's calories, so these will be as light as it gets: about <b>${b.k} kcal</b> each.`
    : `Each dish: up to <b class="tn">${fmt(b.k)} kcal</b> with about <b class="tn">${b.p} g</b> protein${b.capped ? ', which is all you have left' : ''}. That leaves <b class="tn">${fmt(Math.max(0, b.l.k - b.k))} kcal</b> for the rest of today.`;
}
const MOODS = [
  ['chef', "Chef's choice", ''],
  ['quick', 'Ready in 10', 'Every dish must be on the plate in 10 minutes or less.'],
  ['comfort', 'Comfort food', 'They want comfort food, made lighter without losing what makes it comforting.'],
  ['fresh', 'Fresh and light', 'They want something fresh and light with plenty of veg.'],
  ['spicy', 'Spicy', 'They want real heat.'],
  ['italian', 'Italian', 'They are in the mood for Italian.'],
  ['asian', 'Asian', 'They are in the mood for Asian food: vary the country across the three.'],
  ['mex', 'Mexican', 'They are in the mood for Mexican.'],
  ['fake', 'Fakeaway', 'They want home versions of takeaway favourites that taste like the real thing.'],
  ['nocook', 'No cooking', 'No cooking at all: assembly only.'],
];
A.ideas = () => {
  const l = leftNow();
  IDEAS = { opts: [], meal: mealNow(), mood: 'chef', seen: [] };
  openSheet(
    `${sh('What can I eat?')}<div class="sheet-b"><div class="card"><div class="two"><div><div class="num" style="font-size:30px">${fmt(l.k)}</div><span class="muted small">kcal left</span></div><div><div class="num" style="font-size:30px">${l.p} g</div><span class="muted small">protein to go</span></div></div></div>
    ${segHtml('idMeal', Object.entries(MEALS), IDEAS.meal)}
    <div><div class="tiny muted" style="font-weight:700;margin-bottom:6px">How much?</div><div class="opts" id="idSizes" style="margin-top:0">${IDEA_SIZES.map(z => `<button data-act="idSize" data-v="${z[0]}" aria-pressed="${z[0] === 'auto'}">${z[1]}</button>`).join('')}</div><p class="small muted" id="idBud" style="margin-top:8px"></p></div>
    <div><div class="tiny muted" style="font-weight:700;margin-bottom:6px">What are you in the mood for?</div><div class="opts" id="idMoods" style="margin-top:0">${MOODS.map(m => `<button data-act="idMood" data-v="${m[0]}" aria-pressed="${m[0] === 'chef'}">${m[1]}</button>`).join('')}</div></div>
    <label class="f">A craving, or something to use up<input class="inp" id="idHave" placeholder="Half a chorizo, a bag of spinach" autocomplete="off"></label>
    <label class="f">Leave out<input class="inp" id="idAvoid" value="${esc(P.avoid || '')}" placeholder="Mushrooms, coriander" autocomplete="off" data-on="idAvoid"></label>
    <button class="btn ember" data-act="ideasGo">${ic('spark')} Cook me something</button>
    <button class="btn ghost" data-act="menuPhoto">${ic('menu')} Eating out? Scan the menu</button>
    <div id="ideasOut"></div></div>`,
    true,
  );
  SEG.idMeal = v => {
    IDEAS.meal = v;
    ideaBudgetLine();
  };
  ideaBudgetLine();
};
A.idSize = ({ v }, el) => {
  IDEAS.size = v;
  $$('button', el.parentNode).forEach(b => b.setAttribute('aria-pressed', b === el));
  ideaBudgetLine();
};
A.idMood = ({ v }, el) => {
  IDEAS.mood = v;
  $$('button', el.parentNode).forEach(b => b.setAttribute('aria-pressed', b === el));
};
I.idAvoid = el => {
  P.avoid = el.value.trim().slice(0, 200);
  clearTimeout(IDEAS.av);
  IDEAS.av = setTimeout(saveProfile, 800);
};
/* Pull the finished options out of an answer, even one that is still arriving or was cut short. */
function looseArr(text) {
  let t = String(text || '').replace(/```(?:json)?/g, '');
  const i = t.indexOf('[');
  if (i < 0) return [];
  t = t.slice(i);
  try {
    const v = JSON.parse(t.slice(0, t.lastIndexOf(']') + 1));
    if (Array.isArray(v)) return v;
  } catch (e) {}
  let depth = 0,
    str = false,
    bs = false,
    last = -1;
  for (let k = 0; k < t.length; k++) {
    const c = t[k];
    if (str) {
      if (bs) bs = false;
      else if (c === '\\') bs = true;
      else if (c === '"') str = false;
      continue;
    }
    if (c === '"') str = true;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--;
      if (depth === 1 && c === '}') last = k;
      if (depth === 0) break;
    }
  }
  if (last < 0) return [];
  try {
    const v = JSON.parse(t.slice(0, last + 1) + ']');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}
const ideaOk = r =>
  r.filter(x => x && Array.isArray(x.items) && x.items.length && x.items.every(it => it && it.name)).slice(0, 3);
function ideasShow(busy, err) {
  const o = $('#ideasOut');
  if (!o || !IDEAS) return;
  const cards = IDEAS.opts
    .map((x, i) => {
      const sum = f => x.items.reduce((s, it) => s + (num(it[f]) * num(it.grams)) / 100, 0),
        k = sum('kcal100'),
        p = sum('p100'),
        b = IDEAS.bud || ideaBudget(),
        over = r0(k - (IDEAS.menu ? b.l.k : b.k)),
        fits = over <= Math.max(25, b.k * 0.06);
      return `<div class="card idea"><div class="between"><h2>${esc(x.title || 'Option ' + (i + 1))}</h2><span class="pill">${fmt(k)} kcal · ${r0(p)} g protein</span></div><p class="small fit ${fits ? 'ok' : 'no'}">${ic(fits ? 'check' : 'alert')}<span>${fits ? 'Fits. Leaves ' + fmt(Math.max(0, b.l.k - k)) + ' kcal for today' : 'Over ' + (IDEAS.menu ? 'what you have left' : 'the size you asked for') + ' by ' + fmt(over) + ' kcal'} · ${r0(sum('c100'))} g carbs, ${r0(sum('f100'))} g fat</span></p><p class="small muted">${esc(x.why || '')}</p><p class="small">${esc(x.items.map(it => (it.amount || r0(num(it.grams)) + ' g') + ' ' + it.name).join(', '))}</p><div class="row" style="gap:8px;flex-wrap:wrap">${num(x.mins) > 0 ? `<span class="pill">${ic('clock')} ${r0(num(x.mins))} min</span>` : ''}<span class="grow"></span>${IDEAS.menu ? '' : `<button class="btn sm ghost" data-act="ideaCook" data-i="${i}">${ic('book')} Recipe</button>`}<button class="btn sm" data-act="ideaLog" data-i="${i}">${ic('plus')} Log this</button></div></div>`;
    })
    .join('');
  o.innerHTML = `<div class="stack">${cards}${busy ? `<div class="busy"><div class="spinner"></div>${IDEAS.opts.length ? 'Working on the next one' : busy}</div>` : ''}${err ? `<div class="card stack"><b>${IDEAS.opts.length ? 'That is all that came back.' : 'That did not work.'}</b><p class="small muted">${esc(err)}</p><button class="btn sm" data-act="ideasRetry" style="align-self:flex-start">Try again</button></div>` : ''}${IDEAS.opts.length && !busy && !IDEAS.menu ? `<button class="btn ghost" data-act="ideasGo">${ic('spark')} Three different ones</button>` : ''}${IDEAS.opts.length && !busy ? `<p class="tiny muted">Calories are estimates until you log a dish; each ingredient is then matched to the database where it can be.</p>` : ''}</div>`;
}
async function ideasRun(prompt, files) {
  if (!AI.sample) return toast('This needs Claude, which is not available in this view.');
  if (!$('#ideasOut')) return;
  IDEAS.opts = [];
  IDEAS.last = [prompt, files];
  IDEAS.menu = !!files;
  IDEAS.bud = ideaBudget();
  const what = files ? 'Reading the menu' : 'Finding meals that fit';
  ideasShow(what);
  const run = (IDEAS.run = Date.now()),
    live = () => IDEAS && IDEAS.run === run && $('#ideasOut');
  const take = text => {
    const r = ideaOk(looseArr(text));
    if (live() && r.length > IDEAS.opts.length) {
      IDEAS.opts = r;
      return true;
    }
    return false;
  };
  try {
    await ensureDB();
    const imgs = files ? await prepImages(files) : null;
    const r = await AI.sample(prompt, {
      cache: false,
      modelTier: 'default',
      ...(imgs ? { images: imgs } : {}),
      onText: ({ text }) => {
        if (take(text)) ideasShow(what);
      },
    });
    if (!live()) return;
    take(r && r.text);
    IDEAS.opts.forEach(x => {
      if (x.title && !IDEAS.seen.includes(x.title)) IDEAS.seen.push(x.title);
    });
    ideasShow(
      '',
      IDEAS.opts.length
        ? ''
        : 'Claude answered, but not with meals that could be read. Try again' +
            (files ? ', or take the photo closer so the dish names are sharp.' : '.'),
    );
  } catch (e) {
    if (!live()) return;
    take(e && e.text);
    const code = e && e.code ? ' (' + e.code + ')' : '';
    ideasShow(
      '',
      (code === ' (image_rejected)' || code === ' (images_unavailable)'
        ? 'The photo could not be sent to Claude.'
        : aiError(e)) + code,
    );
  }
}
A.ideasRetry = () => {
  if (IDEAS && IDEAS.last) ideasRun(IDEAS.last[0], IDEAS.last[1]);
};
A.ideasGo = () => {
  const l = leftNow(),
    d = day(),
    eaten = [...new Set(d.e.map(e => e.n))].slice(0, 20),
    mood = MOODS.find(m => m[0] === IDEAS.mood) || MOODS[0],
    have = ($('#idHave') ? $('#idHave').value : '').trim().slice(0, 200),
    bud = ideaBudget(),
    k = bud.k,
    pa = bud.p;
  const usual = P.rec
      .map(r => r.n)
      .filter(n => !eaten.includes(n))
      .slice(0, 15),
    mine = Object.values(S.recipes)
      .map(r => r.n)
      .slice(0, 8),
    meal = MEALS[IDEAS.meal].toLowerCase();
  ideasRun([
    'chef_ideas',
    {
      kind: meal === 'snacks' ? 'snacks' : meal + ' dishes',
      mood: mood[2] ? mood[2] + '\n' : '',
      brief: have
        ? 'They said: "' + have + '". Treat a craving as the brief and build around anything they want to use up.\n'
        : '',
      kcalLow: Math.round((k * 0.8) / 10) * 10,
      kcal: k,
      protein: pa,
      snackNote: k <= 250 ? ' That is snack size: suggest proper snacks, not shrunken meals.' : '',
      leftKcal: l.k,
      leftProtein: l.p,
      leftCarbs: l.c,
      leftFat: l.f,
      eaten: eaten.join('; ') || 'nothing yet',
      usual: usual.length
        ? 'Foods they often eat, as a hint to their taste only, not a list to reuse: ' + usual.join('; ') + '.\n'
        : '',
      recipes: mine.length ? 'Recipes they already have, so suggest something else: ' + mine.join('; ') + '.\n' : '',
      avoid: P.avoid ? 'They do not eat: ' + P.avoid + '. Leave these out entirely.\n' : '',
      seen: IDEAS.seen.length
        ? 'Already suggested, so do not repeat or lightly vary: ' + IDEAS.seen.slice(-12).join('; ') + '.\n'
        : '',
    },
  ]);
};
/* the method, written on demand so the first three ideas arrive fast */
A.ideaCook = async ({ i }) => {
  const x = IDEAS.opts[+i];
  if (!x) return;
  const k = x.items.reduce((s, it) => s + (num(it.kcal100) * num(it.grams)) / 100, 0),
    p = x.items.reduce((s, it) => s + (num(it.p100) * num(it.grams)) / 100, 0);
  openSheet(
    `${sh(x.title)}<div class="sheet-b"><p class="muted">${esc(x.why || '')}</p><div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill gold">${fmt(k)} kcal</span><span class="pill">${r0(p)} g protein</span>${num(x.mins) > 0 ? `<span class="pill">${ic('clock')} ${r0(num(x.mins))} min</span>` : ''}<span class="pill">Serves 1</span></div>
    <section class="card"><h2>Ingredients</h2>${x.items.map(it => `<div class="small" style="padding:7px 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px"><span>${esc(it.name)}</span><b class="tn" style="white-space:nowrap">${esc(it.amount || r0(num(it.grams)) + ' g')}</b></div>`).join('')}<p class="tiny muted" style="margin-top:8px">Plus salt, pepper, herbs and spices from the method.</p></section>
    <section class="card"><h2>Method</h2><div class="cook" id="cookOut">${x.how ? esc(x.how) : 'Writing the method…'}</div></section></div>
    <div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="ideaSave" data-i="${i}">Save recipe</button><button class="btn ember" data-act="ideaLog" data-i="${i}">${ic('plus')} Log this</button></div>`,
    true,
  );
  if (x.how || !AI.sample) return;
  try {
    const r = await AI.sample(
      [
        'chef_method',
        {
          title: x.title,
          ingredients: x.items.map(it => (it.amount || r0(num(it.grams)) + ' g') + ' ' + it.name).join('; '),
        },
      ],
      {
        cache: false,
        onText: ({ text }) => {
          const el = $('#cookOut');
          if (el && text) el.textContent = text;
        },
      },
    );
    x.how = String((r && r.text) || '').trim();
    const el = $('#cookOut');
    if (el && x.how) el.textContent = x.how;
  } catch (e) {
    const el = $('#cookOut');
    if (el) el.textContent = aiError(e);
  }
};
A.ideaSave = async ({ i }) => {
  const x = IDEAS.opts[+i];
  if (!x) return;
  await ensureDB();
  const items = x.items
    .map(matchItem)
    .filter(m => m && m.g > 0)
    .map(m => portion(m.food, m.g));
  if (!items.length) return toast('That recipe could not be saved.');
  const r = { id: newId(), n: String(x.title).slice(0, 60), sv: 1, items, how: x.how || '' };
  S.recipes[r.id] = r;
  Store.put('recipes', r.id, r);
  grant(15, 0, null, 'Recipe saved');
  saveProfile();
  toast('Saved to your recipes');
};
A.menuPhoto = () => {
  if (!(AI.sample && AI.images))
    return toast('Menu scanning needs Claude with photos, which is not available in this view.');
  $('#fileMenu').click();
};
$('#fileMenu').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !IDEAS) return;
  const l = leftNow();
  ideasRun(['menu_ideas', { leftKcal: l.k, leftProtein: l.p, leftCarbs: l.c, leftFat: l.f }], [f]);
});
A.ideaLog = ({ i }) => {
  const x = IDEAS.opts[+i];
  if (!x) return;
  const meal = IDEAS.meal;
  openReview(x.items.map(matchItem), { via: 'idea', meal, note: 'Check the amounts against what you actually eat.' });
};

/* ---------- boss battles ---------- */
const BOSSES = {
  iron: {
    n: 'The Iron Warden',
    d: 'Hit your protein target on 5 days',
    hp: 5,
    u: 'days',
    hit: h => (h && h.n > 0 && h.p >= P.t.p * 0.95 ? 1 : 0),
  },
  zone: {
    n: 'The Zone Keeper',
    d: 'Close 4 days inside your calorie zone',
    hp: 4,
    u: 'days',
    hit: h => (h && h.zn ? 1 : 0),
  },
  ledger: {
    n: 'The Ledger',
    d: 'Log breakfast, lunch and dinner on 6 days',
    hp: 6,
    u: 'days',
    hit: h => (h && h.m3 ? 1 : 0),
  },
  forge: { n: 'The Forge', d: 'Finish 4 training sessions', hp: 4, u: 'sessions', hit: h => (h ? h.ts || 0 : 0) },
  still: { n: 'The Stillness', d: 'Rack up 150 active minutes', hp: 150, u: 'min', hit: h => (h ? h.xm || 0 : 0) },
};
function bossState() {
  const b = P.boss;
  if (!b || !BOSSES[b.id]) return null;
  const def = BOSSES[b.id],
    tk = today();
  let dmg = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(b.start, i);
    if (k > tk) break;
    dmg += def.hit(P.hist[k]);
  }
  const end = addDays(b.start, 6);
  return {
    def,
    dmg: Math.min(dmg, def.hp),
    won: dmg >= def.hp,
    lost: dmg < def.hp && tk > end,
    left: Math.max(0, Math.round((pdate(end) - pdate(tk)) / 864e5) + 1),
  };
}
function checkBoss() {
  const s = bossState();
  if (!s) return;
  if (s.won) {
    P.boss = null;
    P.st.boss++;
    grant(100, 40, null, false);
    celeQ.push({
      icon: 'shield',
      tone: 'good',
      title: s.def.n + ' defeated',
      sub: s.def.d + '. Done inside the week.',
      rewards: ['+100 XP', '+40 gems'],
      confetti: true,
    });
  } else if (s.lost) {
    P.boss = null;
    celeQ.push({
      icon: 'shield',
      title: s.def.n + ' got away',
      sub: 'You landed ' + s.dmg + ' of ' + s.def.hp + ' ' + s.def.u + '. Pick a boss and go again.',
    });
  }
}
A.bossPick = () =>
  openSheet(
    `${sh('Pick a boss')}<div class="sheet-b"><p class="muted small">One week, one boss. Every day you do the thing lands a hit. Beat it for 100 XP and 40 gems.</p>${Object.entries(
      BOSSES,
    )
      .map(
        ([id, b]) =>
          `<button class="act" data-act="bossStart" data-id="${id}">${ic('shield')}<span>${b.n}<small>${b.d}</small></span></button>`,
      )
      .join('')}</div>`,
  );
A.bossStart = ({ id }) => {
  P.boss = { id, start: today() };
  saveProfile();
  closeSheet();
  render();
  toast(BOSSES[id].n + ' has seven days');
};
A.bossQuit = () => {
  P.boss = null;
  saveProfile();
  render();
};
function bossCard() {
  const s = bossState();
  if (!s)
    return `<section class="card stack"><div class="boss"><div class="bi">${ic('shield')}</div><div><h2>Boss battle</h2><span class="muted small">Take on a week-long challenge for 100 XP and 40 gems.${P.st.boss ? ' Defeated so far: ' + P.st.boss + '.' : ''}</span></div></div><button class="btn" data-act="bossPick">Pick a boss</button></section>`;
  return `<section class="card stack"><div class="boss"><div class="bi">${ic('shield')}</div><div><h2>${s.def.n}</h2><span class="muted small">${s.def.d}</span></div></div>
    <div class="between small"><b>${s.dmg} of ${s.def.hp} ${s.def.u}</b><span class="muted">${s.left} day${s.left === 1 ? '' : 's'} left</span></div>${bar(s.dmg, s.def.hp, 'ember lg')}
    <button class="link" data-act="bossQuit" style="align-self:flex-start">Walk away</button></section>`;
}

/* ---------- meal photos: several angles, a note, and a fix-it step ---------- */
let PH = null;
A.photo = () => {
  if (!(AI.sample && AI.images))
    return toast(
      AI.ready
        ? 'Photo logging needs Claude, which is not available in this view.'
        : 'Still connecting. Try again in a moment.',
    );
  PH = { files: [], meal: ADD ? ADD.meal : mealNow() };
  openSheet(`${sh('Meal photo')}<div class="sheet-b"><button class="btn ghost" data-act="photoPick">${ic('camera')} Take or choose photos</button><div class="thumbs" id="phThumbs"></div>
    <label class="f">Anything Claude should know, optional<input class="inp" id="phNote" placeholder="I ate half. Cooked in butter. Large plate." autocomplete="off"></label>
    <p class="small muted">Up to three photos. A second angle helps with portions. A photo of the pack or the shelf ticket works too: printed calories are used as they are.</p></div><div class="sheet-f"><button class="btn ember" data-act="photoGo" id="phGo" disabled>${ic('spark')} Work it out</button></div>`);
  $('#filePhoto').click();
};
A.photoPick = () => $('#filePhoto').click();
function onPhotos(fs) {
  if (!PH || !$('#phThumbs')) return;
  PH.files = PH.files.concat(fs).slice(0, 3);
  $('#phThumbs').innerHTML = PH.files.map(f => `<img alt="Meal photo" src="${URL.createObjectURL(f)}">`).join('');
  $('#phGo').disabled = !PH.files.length;
}
A.photoGo = async () => {
  if (!PH.files.length) return;
  const note = ($('#phNote').value || '').trim(),
    meal = PH.meal,
    files = PH.files;
  const body = topSheet().querySelector('.sheet-b'),
    foot = topSheet().querySelector('.sheet-f'),
    was = body.innerHTML;
  foot.classList.add('hide');
  body.innerHTML = `<div class="busy"><div class="spinner"></div>Looking at your photo</div>`;
  const mine = sheets[sheets.length - 1];
  /* a failure keeps the photos so it can be tried again, and says what went wrong */
  const back = msg => {
    if (!sheets.includes(mine)) return toast(msg);
    body.innerHTML =
      `<div class="banner" style="background:var(--ember-soft);color:var(--ink)">${ic('alert')}<span>${esc(msg)}</span></div>` +
      was;
    foot.classList.remove('hide');
    $('#phNote').value = note;
    $('#phThumbs').innerHTML = PH.files.map(f => `<img alt="Meal photo" src="${URL.createObjectURL(f)}">`).join('');
    $('#phGo').disabled = false;
    $('#phGo').innerHTML = ic('spark') + ' Try again';
  };
  try {
    await ensureDB();
    const items = await matchAll(await aiParsePhoto(files, note));
    if (!sheets.includes(mine)) return;
    if (!items.length)
      return back(
        'Claude could not find food or calorie figures in that photo. Try a closer, sharper shot, or add a line saying what it is.',
      );
    openReview(items, {
      via: 'photo',
      meal,
      note: items.some(x => x.food.src === 'LB')
        ? 'Figures marked Label were read from the print in your photo. Check them against the pack.'
        : items.every(x => /^[bm]/.test(x.food.id))
          ? 'Matched to the product list, so the figures are from the label. Check the amount.'
          : 'Portions from a photo are estimates. Adjust the grams if you weighed anything.',
    });
  } catch (e) {
    back(aiError(e));
  }
};
A.revFix = async () => {
  const fix = ($('#revFix').value || '').trim();
  if (fix.length < 3 || !AI.sample) return;
  const cur = REV.items.map(it => ({
    name: it.said || it.food.n,
    brand: it.food.b || '',
    grams: it.g,
    kcal100: it.food.k,
    p100: it.food.p,
    c100: it.food.c,
    f100: it.food.f,
  }));
  const b = $('#revBody');
  b.innerHTML = `<div class="busy"><div class="spinner"></div>Fixing the list</div>`;
  try {
    const raw = await AI.sample.json(['fix_items', { items: JSON.stringify(cur), fix: fix.slice(0, 500) }], {
      cache: false,
    });
    const items = await matchAll(raw);
    if (items.length) REV.items = items;
    else toast('That left nothing to log, so the list is unchanged.');
  } catch (e) {
    toast(aiError(e));
  }
  renderReview();
};

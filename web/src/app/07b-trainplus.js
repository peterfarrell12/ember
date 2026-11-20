/* ================= v4: training tools, interval timer, analytics ================= */
const round25 = w => Math.round(w / 2.5) * 2.5;
function platesFor(w, bar) {
  let side = (w - bar) / 2;
  if (side < -1e-9) return null;
  const out = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25])
    while (side >= p - 1e-9) {
      out.push(p);
      side -= p;
    }
  return { out, rem: Math.round(side * 100) / 100 };
}
let WT = null;
A.wkTools = ({ i }) => {
  const it = WK.items[+i],
    first = it.sets.find(s => num(s.w) > 0);
  WT = { w: first ? num(first.w) : 60, bar: 20, name: exn(it.ex) };
  openSheet(
    `${sh('Warm-up and plates')}<div class="sheet-b"><div class="grid2"><label class="f">Working weight, kg<input class="inp" id="wtW" inputmode="decimal" value="${WT.w}" data-on="wt"></label><label class="f">Bar<select class="inp" id="wtBar" data-on="wt"><option value="20">20 kg bar</option><option value="15">15 kg bar</option><option value="10">10 kg bar</option><option value="0">No bar</option></select></label></div><div id="wtOut"></div></div>`,
  );
  wtDraw();
};
function wtDraw() {
  const w = WT.w,
    bar = WT.bar;
  const line = x => {
    const p = bar ? platesFor(x, bar) : null;
    return bar
      ? p
        ? (p.out.length ? p.out.join(' + ') + ' each side' : 'Empty bar') +
          (p.rem ? ' (about ' + p.rem + ' kg short each side)' : '')
        : 'Lighter than the bar'
      : '';
  };
  const ramp = [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ].map(([f, r]) => [Math.max(bar, round25(w * f)), r]);
  $('#wtOut').innerHTML =
    `<section class="card"><h2>Warm-up for ${esc(WT.name)}</h2>${ramp.map(([x, r]) => `<div class="entry" style="cursor:default"><span class="n">${x} kg × ${r}</span><span class="k muted small">${r0((x / w) * 100)}%</span><span class="s">${line(x)}</span></div>`).join('')}<div class="entry" style="cursor:default"><span class="n">${w} kg, working sets</span><span class="k"></span><span class="s">${line(w)}</span></div></section><p class="tiny muted">Rest a minute between warm-up sets. They are not logged.</p>`;
}
I.wt = () => {
  WT.w = Math.max(0, num($('#wtW').value));
  WT.bar = +$('#wtBar').value;
  wtDraw();
};
A.wkNote = ({ i }) => {
  const ex = WK.items[+i].ex,
    L = lifts()[ex] || {};
  openSheet(
    `${sh('Note for ' + exn(ex))}<div class="sheet-b"><textarea class="inp" id="wnT" placeholder="Seat at 4. Narrow grip. Left knee tracks in.">${esc(L.note || '')}</textarea><p class="small muted">Shown every time this exercise comes up.</p></div><div class="sheet-f"><button class="btn" data-act="wkNoteSave" data-ex="${ex}">Save</button></div>`,
  );
};
A.wkNoteSave = ({ ex }) => {
  const src = lifts();
  const L = src[ex] || (src[ex] = { h: [], pr: 0 });
  const t = $('#wnT').value.trim().slice(0, 160);
  if (t) L.note = t;
  else delete L.note;
  WK && WK.client ? saveCO() : saveTR();
  closeSheet();
  renderPlayer();
};

/* ---------- interval timer: EMOM, AMRAP, Tabata, custom ---------- */
let IT = null,
  itTimer = 0;
const IT_MODES = {
  emom: ['EMOM', 'Every minute on the minute'],
  amrap: ['AMRAP', 'As many rounds as possible'],
  tabata: ['Tabata', '20 seconds on, 10 off, 8 rounds'],
  custom: ['Custom', 'Your own work and rest'],
};
A.timer = () => {
  IT = { mode: 'emom', min: 10, work: 40, rest: 20, rounds: 8, run: null };
  openSheet(
    `${sh('Interval timer')}<div class="sheet-b" id="itBody"></div><div class="sheet-f" id="itFoot"></div>`,
    true,
  );
  sheets[sheets.length - 1]._onClose = () => {
    clearInterval(itTimer);
    IT = null;
  };
  itDraw();
};
function itPlan() {
  const m = IT.mode;
  if (m === 'emom') return Array.from({ length: IT.min }, (_, i) => ['Minute ' + (i + 1), 60, 'w']);
  if (m === 'amrap') return [['Go', IT.min * 60, 'w']];
  const w = m === 'tabata' ? 20 : IT.work,
    r = m === 'tabata' ? 10 : IT.rest,
    n = m === 'tabata' ? 8 : IT.rounds;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(['Work, round ' + (i + 1) + ' of ' + n, w, 'w']);
    if (r > 0 && i < n - 1) out.push(['Rest', r, 'r']);
  }
  return out;
}
function itDraw() {
  const b = $('#itBody');
  if (!b || !IT) return;
  if (!IT.run) {
    const m = IT.mode,
      f = (k, l) =>
        `<label class="f">${l}<input class="inp" inputmode="numeric" value="${IT[k]}" data-on="it" data-k="${k}"></label>`;
    const tot = itPlan().reduce((s, x) => s + x[1], 0);
    b.innerHTML = `${segHtml(
      'itMode',
      Object.entries(IT_MODES).map(([k, v]) => [k, v[0]]),
      m,
    )}<p class="muted small">${IT_MODES[m][1]}.</p>${m === 'emom' || m === 'amrap' ? f('min', 'Minutes') : m === 'custom' ? `<div class="grid3">${f('work', 'Work, s')}${f('rest', 'Rest, s')}${f('rounds', 'Rounds')}</div>` : ''}<div class="card"><span class="num" style="font-size:34px">${mmss(tot)}</span> <span class="muted">in total</span></div>`;
    $('#itFoot').innerHTML = `<button class="btn ember" data-act="itStart">${ic('play', 'fill')} Start</button>`;
    SEG.itMode = v => {
      IT.mode = v;
      itDraw();
    };
    return;
  }
  const r = IT.run,
    s = r.plan[r.i],
    nx = r.plan[r.i + 1];
  b.innerHTML = `<div class="rt"><div class="pill ${s[2] === 'w' ? 'bad' : 'ice'}">${s[2] === 'w' ? 'Work' : 'Rest'}</div><div class="num rtn" id="itN"></div><h2 style="font-size:22px">${esc(s[0])}</h2><div class="prog" style="width:100%"><i id="itBar"></i></div><p class="small muted">${nx ? 'Next: ' + esc(nx[0]) : 'Last one'} · <span id="itLeft"></span> left</p></div>`;
  $('#itFoot').innerHTML =
    `<button class="btn ghost" data-act="itPause">${r.paused ? 'Resume' : 'Pause'}</button><button class="btn ghost" data-act="itStop">Stop</button>`;
  itTick();
}
I.it = el => {
  IT[el.dataset.k] = clamp(r0(num(el.value, 1)), el.dataset.k === 'rest' ? 0 : 1, 3600);
};
A.itStart = () => {
  initAudio();
  const plan = itPlan();
  IT.run = { plan, i: 0, end: Date.now() + plan[0][1] * 1000, paused: 0, t0: Date.now() };
  beep(880, 250);
  itDraw();
  clearInterval(itTimer);
  itTimer = setInterval(itTick, 200);
  keepAwake(true);
};
function itTick() {
  if (!IT || !IT.run || !$('#itN')) return;
  const r = IT.run,
    s = r.plan[r.i];
  const left = r.paused ? r.paused : (r.end - Date.now()) / 1000;
  if (left <= 0) {
    // the next interval starts when the last one was due to end, not when the page next woke up: a phone that
    // dozed for a minute comes back in the right place rather than a minute behind
    let end = r.end;
    do {
      r.i++;
      if (r.i >= r.plan.length) return itDone();
      end += r.plan[r.i][1] * 1000;
    } while (end <= Date.now());
    r.end = end;
    beep(r.plan[r.i][2] === 'w' ? 880 : 520, 220);
    buzz();
    return itDraw();
  }
  if (left <= 3 && Math.ceil(left) !== r.last) {
    r.last = Math.ceil(left);
    beep(660, 90);
  }
  $('#itN').textContent = left >= 60 ? mmss(Math.ceil(left)) : Math.ceil(left);
  $('#itBar').style.width = clamp(100 - (left / s[1]) * 100, 0, 100) + '%';
  $('#itLeft').textContent = mmss(Math.ceil(left + r.plan.slice(r.i + 1).reduce((a, x) => a + x[1], 0)));
}
A.itPause = () => {
  const r = IT.run;
  if (r.paused) {
    r.end = Date.now() + r.paused * 1000;
    r.paused = 0;
  } else r.paused = Math.max(0.1, (r.end - Date.now()) / 1000);
  itDraw();
};
A.itStop = () => itDone(true);
async function itDone(stopped) {
  clearInterval(itTimer);
  keepAwake(false);
  const min = Math.round((Date.now() - IT.run.t0) / 60000),
    name = IT_MODES[IT.mode][0] + ', ' + Math.max(1, min) + ' min';
  if (!stopped) beep(990, 500);
  closeSheet();
  if (min < 1) return toast('Stopped before a minute, so nothing was logged.');
  const d = await loadDay(today());
  const x = { id: newId(), n: name, k: xk(8, 1, min), min, src: 'm', tr: 'cond' };
  d.x.push(x);
  xlogAdd(d.date, x);
  P.st.work++;
  grant(10, 0, d, name + ' logged');
  commitDay(d);
}

/* ---------- training analytics ---------- */
function weeksBack(n) {
  const ws = weekStart(today());
  return Array.from({ length: n }, (_, i) => addDays(ws, -7 * (n - 1 - i)));
}
function viewTraining() {
  const wk = weeksBack(8),
    ws = wk[7],
    ss = TR.sess.filter(s => s.kind === 'train');
  const inWk = (s, w) => s.d >= w && s.d < addDays(w, 7);
  if (!ss.length)
    return `<section class="card stack"><h2>Training</h2><p class="empty">Finish a training session and your load, volume, muscle balance and records build up here.</p><button class="btn" data-act="tab" data-tab="train">${ic('dumbbell')} Go to Train</button></section>`;
  const load = wk.map(w => ss.filter(s => inWk(s, w)).reduce((a, s) => a + (s.load || (s.rpe || 6) * s.dur), 0)),
    vol = wk.map(w => ss.filter(s => inWk(s, w)).reduce((a, s) => a + (s.vol || 0), 0)),
    cnt = wk.map(w => ss.filter(s => inWk(s, w)).length);
  const prev = load.slice(3, 7).filter(v => v > 0),
    base = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0,
    ratio = base ? load[7] / base : 0;
  const note = !base
    ? 'A few more weeks and Ember can tell you whether this week is a jump or a dip.'
    : ratio > 1.3
      ? 'This week is ' +
        r0((ratio - 1) * 100) +
        '% above your recent average. That is a big jump, so keep an eye on recovery.'
      : ratio < 0.8
        ? 'This week is lighter than your recent average.'
        : 'This week is in line with your recent average.';
  const W = 340,
    H = 120,
    bw = W / 8;
  const chart = (vals, col, fmtv) => {
    const mx = Math.max(1, ...vals);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${vals
      .map((v, i) => {
        const h = (v / mx) * (H - 34),
          x = i * bw + bw * 0.18,
          w = bw * 0.64;
        return `<rect x="${x}" y="${v ? H - 18 - h : H - 21}" width="${w}" height="${v ? h : 3}" rx="4" fill="${v ? (i === 7 ? col : 'var(--muted)') : 'var(--line)'}" opacity="${i === 7 || !v ? 1 : 0.55}"/>${v ? `<text x="${x + w / 2}" y="${H - 22 - h}" text-anchor="middle">${fmtv(v)}</text>` : ''}<text x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${pdate(wk[i]).getDate()}/${pdate(wk[i]).getMonth() + 1}</text>`;
      })
      .join('')}</svg>`;
  };
  const mg = {};
  ss.filter(s => inWk(s, ws)).forEach(s => Object.entries(s.mg || {}).forEach(([g, n]) => (mg[g] = (mg[g] || 0) + n)));
  const mgs = LIFT_GROUPS.map(g => [g, mg[g] || 0]),
    mgMax = Math.max(1, ...mgs.map(x => x[1]));
  const prs = Object.entries(TR.lifts)
    .filter(([id, L]) => L.pr && isLift(id))
    .sort((a, b) => b[1].pr - a[1].pr)
    .slice(0, 8);
  const p = activeProg();
  return `<section class="card stack"><div class="between"><h2>This week</h2><span class="muted small">${cnt[7]}${p ? ' of ' + p.days.length : ''} session${cnt[7] === 1 && !p ? '' : 's'}</span></div><div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:36px;line-height:1">${fmt(load[7])}</span><span class="muted">training load</span></div><p class="small muted">${note}</p>${chart(load, 'var(--ember)', v => fmt(v))}<p class="tiny muted">Load is minutes trained multiplied by how hard you rated the session.</p></section>
  <section class="card stack"><h2>Sets per muscle group this week</h2>${mgs.map(([g, n]) => `<div class="macro"><div class="lbl" style="display:flex;justify-content:space-between"><span>${GROUPS[g]}</span><span class="muted tn">${n}</span></div><div class="bar ${n >= 10 ? 'good' : n ? 'gold' : ''}"><i style="width:${(n / Math.max(mgMax, 12)) * 100}%"></i></div></div>`).join('')}<p class="tiny muted">Around 10 or more hard sets a week per muscle group is a common target for building size.</p></section>
  <section class="card stack"><h2>Weight lifted per week</h2>${chart(vol, 'var(--m-f)', v => (v >= 1000 ? r1(v / 1000) + 't' : fmt(v)))}</section>
  <section class="card"><div class="between"><h2>Strongest lifts</h2><button class="link" data-act="exLib">All exercises</button></div>${prs.length ? prs.map(([id, L]) => `<button class="entry" data-act="exInfo" data-id="${id}"><span class="n">${esc(exn(id))}</span><span class="k">${r0(L.pr)} kg</span><span class="s">Estimated one-rep max${L.h && L.h.length ? ' · last trained ' + niceDate(L.h[L.h.length - 1][0]) : ''}</span></button>`).join('') : `<p class="empty">Log a weighted lift to start your records.</p>`}</section>`;
}

/* ================= free extras: a break that holds the streak, a fasting timer, a weekly review, exports =================
   None of these calls Claude or costs anything to run, so they are free for good. */

/* ---------- taking a break: a holiday, a bug, a week off. The streak holds and nothing nags. ---------- */
const BREAK_WHY = { holiday: 'On holiday', ill: 'Unwell', rest: 'Taking a rest' };
const BREAK_MAX = 14;
/** The break that covers a day, if any. Past breaks are kept so the days they covered still count. */
function breakOn(k) {
  return (P.brks || []).find(b => k >= b.from && k <= b.to) || null;
}
const onBreak = () => breakOn(today());
function breakLine() {
  const b = onBreak();
  return b ? BREAK_WHY[b.why] + ' until ' + niceDate(b.to) + '. Your streak is held.' : '';
}
A.takeBreak = () => {
  const b = onBreak();
  if (b)
    return openSheet(
      `${sh('Your break')}<div class="sheet-b"><p>${esc(BREAK_WHY[b.why])} until <b>${niceDate(b.to)}</b>. Your streak is held and Ember will not ask you to log. Anything you do log still counts.</p></div>
      <div class="sheet-f"><button class="btn" data-act="breakEnd">I am back: end the break</button></div>`,
    );
  S.brk = { why: 'holiday', days: 7 };
  openSheet(
    `${sh('Take a break')}<div class="sheet-b"><p class="muted small">Away, unwell, or just need a week off? Your streak holds for the days you choose and Ember stops asking you to log. Anything you do log still counts.</p>
    <div class="f">Why${segHtml('brkWhy', Object.entries(BREAK_WHY), S.brk.why)}</div>
    <div class="f">For how long${segHtml(
      'brkDays',
      [
        ['3', '3 days'],
        ['7', 'A week'],
        ['14', 'Two weeks'],
      ],
      '7',
    )}</div>
    <p class="small" id="brkUntil"></p></div><div class="sheet-f"><button class="btn" data-act="breakStart">Start my break</button></div>`,
  );
  const show = () =>
    ($('#brkUntil').textContent = 'Held until the end of ' + longDate(addDays(today(), S.brk.days - 1)) + '.');
  SEG.brkWhy = v => (S.brk.why = v);
  SEG.brkDays = v => {
    S.brk.days = clamp(+v, 1, BREAK_MAX);
    show();
  };
  show();
};
A.breakStart = () => {
  const from = today(),
    to = addDays(from, clamp(S.brk.days, 1, BREAK_MAX) - 1);
  P.brks = (P.brks || [])
    .filter(b => b.to < from)
    .concat([{ from, to, why: S.brk.why }])
    .slice(-12);
  saveProfile();
  closeSheet();
  render();
  toast('Break started. Your streak is held until ' + niceDate(to) + '.');
};
A.breakEnd = () => {
  const b = onBreak(),
    y = addDays(today(), -1);
  if (!b) return;
  // the days already taken stay covered; the break simply stops yesterday
  if (b.from > y) P.brks = P.brks.filter(x => x !== b);
  else b.to = y;
  saveProfile();
  closeSheet();
  render();
  toast('Welcome back. Break ended.');
};

/* ---------- fasting timer ---------- */
const FAST_GOALS = [12, 14, 16, 18, 20];
const fastState = () => P.fast || (P.fast = { on: false, goal: 16, start: 0, log: [] });
const hrsMin = ms => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return Math.floor(m / 60) + ' h ' + pad(m % 60) + ' min';
};
function fastTile(tile) {
  const f = P.fast;
  if (!f || !f.on) return '';
  const run = f.start > 0,
    ms = run ? Date.now() - f.start : 0,
    goal = f.goal * 36e5,
    last = f.log[f.log.length - 1];
  return tile(
    'clock',
    'Fasting',
    run ? `<span id="fastNow">${hrsMin(ms)}</span>` : f.goal + ':' + (24 - f.goal),
    run ? '' : 'plan',
    run
      ? ms >= goal
        ? 'Goal reached. End it when you eat.'
        : hrsMin(goal - ms) + ' to your ' + f.goal + ' hour goal'
      : last
        ? 'Last fast ' + hrsMin(last.e - last.s)
        : 'Start when you finish eating',
    run ? bar(ms, goal, ms >= goal ? 'good' : 'ice') : '',
    run
      ? `<button class="tkb w" data-act="fastEnd">${ic('check')} End fast</button>`
      : `<button class="tkb w" data-act="fastStart">${ic('play', 'fill')} Start fast</button>`,
    'fastSheet',
    true,
  );
}
A.fastStart = () => {
  const f = fastState();
  f.on = true;
  f.start = Date.now();
  saveProfile();
  render();
  toast('Fast started. ' + f.goal + ' hours takes you to ' + clockAt(f.start + f.goal * 36e5) + '.');
};
A.fastEnd = () => {
  const f = fastState();
  if (!f.start) return;
  const e = Date.now();
  if (e - f.start >= 30 * 60000) f.log = f.log.concat([{ s: f.start, e }]).slice(-60); // under half an hour is a mis-tap, not a fast
  const met = e - f.start >= f.goal * 36e5,
    len = hrsMin(e - f.start);
  f.start = 0;
  saveProfile();
  closeAll();
  render();
  toast(met ? 'Fast complete: ' + len + '. Goal reached.' : 'Fast ended at ' + len + '.');
};
const clockAt = t => {
  const d = new Date(t);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
};
A.fastSheet = () => {
  const f = fastState(),
    run = f.start > 0,
    met = f.log.filter(x => x.e - x.s >= f.goal * 36e5).length;
  openSheet(
    `${sh('Fasting')}<div class="sheet-b">
    <div class="f">Your fast, in hours${segHtml(
      'fastGoal',
      FAST_GOALS.map(g => [String(g), String(g)]),
      String(f.goal),
    )}</div>
    <p class="small muted" id="fastPlan"></p>
    ${run ? `<label class="f">Started at<input class="inp" type="time" id="fastAt" value="${clockAt(f.start)}" data-on="fastAt"></label>` : ''}
    ${
      f.log.length
        ? `<div class="grp">Your fasts</div><div class="list">${f.log
            .slice(-7)
            .reverse()
            .map(
              x =>
                `<div class="res" style="cursor:default"><span class="n tn">${hrsMin(x.e - x.s)}</span><span class="k">${x.e - x.s >= f.goal * 36e5 ? '<span class="pill good">Goal</span>' : ''}</span><span class="s">${niceDate(dkey(new Date(x.s)))}, ${clockAt(x.s)} to ${clockAt(x.e)}</span></div>`,
            )
            .join('')}</div><p class="tiny muted">${met} of your last ${f.log.length} reached today's goal.</p>`
        : ''
    }
    <p class="tiny muted">Fasting does not suit everyone. If you are pregnant, have diabetes, take medication that needs food, or have had an eating disorder, talk to your doctor first. This is general guidance, not medical advice.</p></div>
    <div class="sheet-f">${run ? `<button class="btn" data-act="fastEnd">${ic('check')} End fast</button>` : `<button class="btn ember" data-act="fastStart">${ic('play', 'fill')} Start fast</button>`}<button class="btn ghost" style="width:auto" data-act="fastOff">Hide</button></div>`,
  );
  const plan = () =>
    ($('#fastPlan').textContent = run
      ? 'Started ' + clockAt(f.start) + '. ' + f.goal + ' hours ends at ' + clockAt(f.start + f.goal * 36e5) + '.'
      : f.goal + ' hours fasting, ' + (24 - f.goal) + ' hours to eat in. Start it when you finish your last meal.');
  SEG.fastGoal = v => {
    f.goal = +v;
    saveProfile();
    plan();
    render();
  };
  plan();
};
/* correcting the start: the time given is taken as the most recent time it was that o'clock */
I.fastAt = el => {
  const f = fastState(),
    m = /^(\d\d):(\d\d)$/.exec(el.value);
  if (!m || !f.start) return;
  const d = new Date();
  d.setHours(+m[1], +m[2], 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  f.start = d.getTime();
  saveProfile();
  render();
};
A.fastOn = () => {
  fastState().on = true;
  saveProfile();
  render();
  A.fastSheet();
};
A.fastOff = () => {
  const f = fastState();
  f.on = false;
  f.start = 0;
  saveProfile();
  closeAll();
  render();
  toast('Fasting timer hidden. Turn it back on from You.');
};
/* keeps the running time on Today current without redrawing the page */
setInterval(() => {
  const el = $('#fastNow');
  if (el && P && P.fast && P.fast.start) el.textContent = hrsMin(Date.now() - P.fast.start);
}, 30000);

/* ---------- the weekly review: last week in one page, worked out on the device ---------- */
function weekReview() {
  const tk = today(),
    end = addDays(weekStart(tk), -1), // last Sunday
    start = addDays(end, -6),
    keys = Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    hs = keys.map(k => P.hist[k] || null),
    logged = hs.filter(h => h && h.n > 0),
    avg = f => (logged.length ? logged.reduce((s, h) => s + (h[f] || 0), 0) / logged.length : 0),
    inZone = keys.filter(k => {
      const h = P.hist[k];
      if (!h || !h.n) return false;
      const b = P.t.k + (P.exAdd ? h.ex || 0 : 0);
      return h.k >= b * 0.9 && h.k <= b * 1.08;
    }).length,
    sess = TR.sess.filter(s => s.d >= start && s.d <= end && s.kind === 'train'),
    acts = P.xlog.filter(x => x.d >= start && x.d <= end),
    mins = hs.reduce((s, h) => s + ((h && h.xm) || 0), 0),
    ts = trendSeries(),
    at = k => {
      const upTo = ts.filter(x => x.d <= k);
      return upTo.length ? upTo[upTo.length - 1].t : null;
    },
    w0 = at(addDays(start, -1)),
    w1 = at(end),
    m = measuredTdee();
  return { start, end, keys, hs, logged, avg, inZone, sess, acts, mins, w0, w1, m };
}
A.weekReview = () => {
  const r = weekReview(),
    adj = P.goal === 'lose' ? -P.rate * 1100 : P.goal === 'gain' ? P.rate * 1100 : 0,
    want = r.m.ok ? Math.max(P.sex === 'f' ? 1200 : 1500, Math.round((r.m.tdee + adj) / 10) * 10) : 0,
    dw = r.w0 != null && r.w1 != null ? r1(r.w1 - r.w0) : null,
    stat = (v, l) => `<div class="stat"><div class="num">${v}</div><span>${l}</span></div>`,
    none = !r.logged.length && !r.sess.length && !r.acts.length;
  openSheet(
    `${sh('Last week')}<div class="sheet-b printable"><p class="muted small">${longDate(r.start)} to ${longDate(r.end)}</p>
    ${
      none
        ? `<p class="empty">Nothing was logged last week, so there is nothing to review yet. Log a few days this week and it will be here on Monday.</p>`
        : `<div class="stat4">${stat(r.logged.length + ' of 7', 'Days logged')}${stat(r.logged.length ? fmt(r.avg('k')) : '–', 'Average kcal, target ' + fmt(P.t.k))}${stat(r.inZone, 'Days in your zone')}${stat(r.logged.length ? r0(r.avg('p')) + ' g' : '–', 'Average protein, target ' + P.t.p + ' g')}</div>
    <div class="stat4">${stat(r.sess.length, 'Strength sessions')}${stat(r.mins, 'Active minutes')}${stat(dw == null ? '–' : (dw > 0 ? '+' : '') + dw + ' kg', 'Trend weight change')}${stat(r.w1 == null ? '–' : r1(r.w1) + ' kg', 'Trend weight now')}</div>
    <div class="card" style="padding:4px 14px"><div class="list">${r.keys
      .map((k, i) => {
        const h = r.hs[i];
        return `<div class="res" style="cursor:default"><span class="n">${WD[i]} ${pdate(k).getDate()}</span><span class="k tn">${h && h.n ? fmt(h.k) + '<small> kcal</small>' : '<span class="muted">not logged</span>'}</span><span class="s">${h && h.n ? 'protein ' + r0(h.p) + ' g · carbs ' + r0(h.c) + ' g · fat ' + r0(h.f) + ' g' + (h.xm ? ' · ' + h.xm + ' min active' : '') : breakOn(k) ? 'on a break' : ''}</span></div>`;
      })
      .join('')}</div></div>
    <div class="card stack"><h2>For this week</h2>${
      r.m.ok && Math.abs(want - P.t.k) >= 75
        ? `<p class="small">Over the last ${r.m.days} logged days you ate about ${fmt(r.m.avg)} kcal a day and your trend weight moved the way it did, which puts your real daily burn near <b>${fmt(r.m.tdee)} kcal</b>. For your goal that points to about <b>${fmt(want)} kcal</b> a day; your target is ${fmt(P.t.k)}.</p><button class="btn sm" data-act="retune" style="align-self:flex-start">Set my target to ${fmt(want)} kcal</button>`
        : r.m.ok
          ? `<p class="small">Your measured burn is about ${fmt(r.m.tdee)} kcal a day and your target of ${fmt(P.t.k)} kcal still fits your goal. No change needed.</p>`
          : `<p class="small muted">Once you have ${[r.m.need.days ? r.m.need.days + ' more logged days' : '', r.m.need.weighs ? r.m.need.weighs + ' more weigh-ins' : '', r.m.need.span && !r.m.need.weighs ? 'weigh-ins across ' + r.m.need.span + ' more days' : ''].filter(Boolean).join(' and ') || 'a little more history'}, Ember can work out your real daily burn and say whether your target needs to move.</p>`
    }${r.logged.length && r.logged.length < 5 ? `<p class="small">You logged ${r.logged.length} of 7 days. The averages above only count the days you logged.</p>` : ''}</div>`
    }
    <p class="tiny muted">Worked out on your device from your own diary. General guidance, not medical advice.</p></div>
    <div class="sheet-f noprint"><button class="btn ghost" data-act="printPage">Print or save as PDF</button></div>`,
    true,
  );
};
A.printPage = () => {
  try {
    window.print();
  } catch (e) {
    toast('Printing is not available here.');
  }
};
/* The review is offered on Today from Monday to Wednesday, until it has been opened; after that it is on the You page. */
function weekReviewCard() {
  const ws = weekStart(today());
  if (S.date !== today() || wdOf(today()) > 2 || P.wrSeen === ws || P.created > addDays(ws, -3)) return '';
  const r = weekReview();
  if (!r.logged.length && !r.sess.length) return '';
  return `<button class="pstrip" data-act="weekReviewOpen">${ic('chart')}<span class="grow"><b>Your week in review</b><small>${r.logged.length} of 7 days logged${r.logged.length ? ', ' + fmt(r.avg('k')) + ' kcal a day on average' : ''}</small></span>${ic('chev-r')}</button>`;
}
A.weekReviewOpen = () => {
  P.wrSeen = weekStart(today());
  saveProfile();
  render();
  A.weekReview();
};

/* ---------- exports: the diary, weigh-ins and sessions as spreadsheets ---------- */
const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
function saveFile(name, text, type) {
  const file = new File(['﻿' + text], name, { type }), // the mark at the start makes Excel read accents correctly
    a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
A.exportCsv = async ({ what }) => {
  try {
    let rows, name;
    if (what === 'weights') {
      rows = [['Date', 'Weight kg']].concat(
        P.wts
          .slice()
          .sort((a, b) => (a.d < b.d ? -1 : 1))
          .map(w => [w.d, w.kg]),
      );
      name = 'ember-weight.csv';
    } else if (what === 'sessions') {
      const ss = (await Store.list('sessions')).sort((a, b) => (a.d < b.d ? -1 : 1));
      rows = [['Date', 'Session', 'Exercise', 'Set', 'Weight kg', 'Reps']];
      ss.forEach(s =>
        (s.items || []).forEach(it =>
          it.sets.forEach((x, j) => rows.push([s.d, s.n, it.n, j + 1, x[0] || '', x[1] || ''])),
        ),
      );
      name = 'ember-training.csv';
    } else {
      const days = (await Store.list('days')).sort((a, b) => (a.date < b.date ? -1 : 1));
      rows = [
        [
          'Date',
          'Meal',
          'Food',
          'Brand',
          'Amount',
          'Grams',
          'kcal',
          'Protein g',
          'Carbohydrate g',
          'Fat g',
          'Fibre g',
          'Sugars g',
          'Saturates g',
          'Salt g',
          'Source',
        ],
      ];
      days.forEach(d =>
        (d.e || []).forEach(e =>
          rows.push([
            d.date,
            MEALS[e.m] || '',
            e.n,
            e.b || '',
            e.u || '',
            e.g || '',
            e.k,
            r1(e.p),
            r1(e.c),
            r1(e.f),
            e.fi == null ? '' : r1(e.fi),
            e.su == null ? '' : r1(e.su),
            e.sf == null ? '' : r1(e.sf),
            e.na == null ? '' : Math.round((e.na * 2.5) / 10) / 100,
            (SRC[e.src] || SRC.Q)[0],
          ]),
        ),
      );
      name = 'ember-diary.csv';
    }
    if (rows.length < 2) return toast('There is nothing to export yet.');
    saveFile(name, csv(rows), 'text/csv');
    toast(fmt(rows.length - 1) + ' rows saved as ' + name);
  } catch (e) {
    toast('The export did not finish. Try again.');
  }
};

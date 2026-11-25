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
    <div class="sheet-f noprint"><button class="btn ghost" data-act="printPage">Print or save as PDF</button>${none ? '' : `<button class="btn ghost" style="width:auto" data-act="shareWeek">Share</button>`}</div>`,
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

/* ---------- sharing cards: a streak, a session or a week as a picture to post or send ----------
   Numbers and words only. A card never carries a photo, a weight or anything else the person did not put on it. */
const CARD = { w: 1080, h: 1350, green: '#0f3d2e', ember: '#ff6b36', paper: '#ecefea', soft: 'rgba(236,239,234,.66)' };
async function drawCard({ big, label, lines = [], foot = '' }) {
  try {
    if (document.fonts && document.fonts.load)
      await Promise.all([
        document.fonts.load('700 200px "Bricolage Grotesque"'),
        document.fonts.load('600 40px Figtree'),
      ]);
  } catch (e) {}
  const cv = document.createElement('canvas'),
    c = cv.getContext('2d'),
    { w, h } = CARD;
  cv.width = w;
  cv.height = h;
  c.fillStyle = CARD.green;
  c.fillRect(0, 0, w, h);
  // the mark: an open ring with its ember, top left
  const m = 96,
    s = 96 / 24;
  c.save();
  c.translate(m, m);
  c.scale(s, s);
  c.lineWidth = 3.4;
  c.lineCap = 'round';
  c.strokeStyle = CARD.paper;
  c.stroke(new Path2D('M12 4.2a7.8 7.8 0 1 0 7.8 7.8'));
  c.fillStyle = CARD.ember;
  c.beginPath();
  c.arc(18.1, 5.9, 2.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.fillStyle = CARD.paper;
  c.font = '700 60px "Bricolage Grotesque", system-ui, sans-serif';
  c.textBaseline = 'middle';
  c.fillText('Ember', m + 96 + 24, m + 50);
  // the number, sized to fit the width
  c.textBaseline = 'alphabetic';
  let size = 380;
  do {
    c.font = `800 ${size}px "Bricolage Grotesque", system-ui, sans-serif`;
    size -= 20;
  } while (c.measureText(big).width > w - m * 2 && size > 120);
  c.fillText(big, m - 8, 660);
  c.font = '700 64px "Bricolage Grotesque", system-ui, sans-serif';
  c.fillStyle = CARD.ember;
  c.fillText(label, m, 760);
  c.font = '600 44px Figtree, system-ui, sans-serif';
  c.fillStyle = CARD.paper;
  const wrap = (text, y) => {
    let line = '';
    for (const word of String(text).split(' ')) {
      if (c.measureText(line + ' ' + word).width > w - m * 2 && line) {
        c.fillText(line, m, y);
        y += 62;
        line = word;
      } else line = line ? line + ' ' + word : word;
    }
    if (line) c.fillText(line, m, y);
    return y + 74;
  };
  let y = 880;
  lines.slice(0, 5).forEach(l => (y = wrap(l, y)));
  c.fillStyle = CARD.soft;
  c.font = '600 36px Figtree, system-ui, sans-serif';
  c.fillText(foot || longDate(today()), m, h - m);
  return new Promise(res => cv.toBlob(b => res(b), 'image/png'));
}
async function shareCard(card, name) {
  let blob = null;
  try {
    blob = await drawCard(card);
  } catch (e) {}
  if (!blob) return toast('The picture could not be made here.');
  const file = new File([blob], name + '.png', { type: 'image/png' });
  try {
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Saved as ' + file.name + '.');
}
A.shareStreak = () => {
  const st = streak();
  if (!st.count) return toast('Log today to start a streak worth sharing.');
  shareCard(
    {
      big: String(st.count),
      label: 'day streak',
      lines: [
        'Logged every day for ' + st.count + (st.count === 1 ? ' day.' : ' days.'),
        'Level ' + levelOf(P.xp) + ' · ' + fmt(P.xp) + ' XP',
      ],
    },
    'ember-streak',
  );
};
A.shareSession = () => {
  const s = SV;
  if (!s) return;
  shareCard(
    {
      big: s.dur + ' min',
      label: s.n,
      lines: [
        s.sets + (s.sets === 1 ? ' set' : ' sets') + (s.vol ? ' · ' + fmt(s.vol) + ' kg lifted' : ''),
        s.prs ? s.prs + (s.prs === 1 ? ' personal record' : ' personal records') : '',
        ...(s.items || []).slice(0, 3).map(it => it.n),
      ].filter(Boolean),
      foot: niceDate(s.d),
    },
    'ember-session',
  );
};
A.shareWeek = () => {
  const r = weekReview();
  shareCard(
    {
      big: r.logged.length + '/7',
      label: 'days logged',
      // only what there is to show: nobody shares a nought
      lines: [
        [
          r.sess.length ? r.sess.length + (r.sess.length === 1 ? ' strength session' : ' strength sessions') : '',
          r.mins ? r.mins + ' active minutes' : '',
        ]
          .filter(Boolean)
          .join(' · '),
        r.inZone ? r.inZone + (r.inZone === 1 ? ' day' : ' days') + ' in my calorie zone' : '',
      ].filter(Boolean),
      foot: longDate(r.start) + ' to ' + longDate(r.end),
    },
    'ember-week',
  );
};

/* ---------- reminders, in the phone app: a nudge if nothing is logged, and a heads-up before a session ----------
   Scheduled on the phone (see reminders.js), a week ahead, and redone whenever something changes. */
const remState = () => P.rem || (P.rem = { log: { on: false, time: '20:00' }, train: { on: false, lead: 30 } });
function remInput() {
  const tk = today(),
    r = remState();
  return {
    log: r.log,
    train: r.train,
    streak: streak().count,
    days: Array.from({ length: 7 }, (_, i) => {
      const k = addDays(tk, i),
        it = planFor(k).find(x => x.type === 'train' && x.plan);
      return {
        date: k,
        logged: !!(P.hist[k] && P.hist[k].n > 0),
        onBreak: !!breakOn(k),
        session: it ? { name: it.t, time: it.tm || '', minutes: it.min || 0 } : null,
      };
    }),
  };
}
let remTimer = 0;
function remSync() {
  if (DEMO) return;
  if (!canRemind() || !S.ready || !P || !P.onboarded) return;
  clearTimeout(remTimer);
  remTimer = setTimeout(() => {
    const r = remState();
    syncReminders(r.log.on || r.train.on ? reminderPlan(remInput()) : []);
  }, 800);
}
A.reminders = () => {
  const r = remState();
  if (!canRemind())
    return openSheet(
      `${sh('Reminders')}<div class="sheet-b"><p>Reminders work in the Ember phone app. A website can only remind you while it is open, which is exactly when you do not need it.</p><p class="small muted">Until you have the app, the calendar can put your training plan into your phone's own calendar, with alerts.</p><button class="btn sm" data-act="cal" style="align-self:flex-start">${ic('cal')} Open the calendar</button></div>`,
    );
  openSheet(
    `${sh('Reminders')}<div class="sheet-b">
    <div class="card stack"><div class="between"><b>Nudge me if I have not logged</b><button class="btn sm ${r.log.on ? '' : 'ghost'}" data-act="remToggle" data-k="log" aria-pressed="${r.log.on}">${r.log.on ? 'On' : 'Off'}</button></div>
      <label class="f">At<input class="inp" type="time" value="${r.log.time}" data-on="remTime"></label>
      <p class="tiny muted">Only on days with nothing logged. Never during a break.</p></div>
    <div class="card stack"><div class="between"><b>Remind me before a planned session</b><button class="btn sm ${r.train.on ? '' : 'ghost'}" data-act="remToggle" data-k="train" aria-pressed="${r.train.on}">${r.train.on ? 'On' : 'Off'}</button></div>
      <div class="f">How long before${segHtml(
        'remLead',
        [
          ['15', '15 min'],
          ['30', '30 min'],
          ['60', '1 hour'],
        ],
        String(r.train.lead),
      )}</div>
      <p class="tiny muted">Uses the usual time on your calendar. Sessions with no time set are announced at 08:00.</p></div>
    <p class="tiny muted">Reminders are set on this phone, a week ahead, each time you open Ember. Nothing is sent from a server.</p></div>`,
  );
  SEG.remLead = v => {
    r.train.lead = +v;
    saveProfile();
    remSync();
  };
};
A.remToggle = async ({ k }) => {
  const r = remState();
  if (!r[k].on && !(await askToRemind()))
    return toast("Notifications are switched off for Ember in your phone's settings. Turn them on there first.");
  r[k].on = !r[k].on;
  saveProfile();
  remSync();
  closeSheet();
  A.reminders();
};
I.remTime = el => {
  if (!/^\d\d:\d\d$/.test(el.value)) return;
  remState().log.time = el.value;
  saveProfile();
  remSync();
};

/* ---------- a week of meals, planned by Claude to your own targets (one request per plan) ---------- */
const MP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let MPV = { day: 0, shop: false };
A.mealPlan = () => {
  MPV = { day: wdOf(today()), shop: false };
  openSheet(`${sh('Meal plan')}<div class="sheet-b" id="mpBody"></div>`, true);
  renderMealPlan();
};
function renderMealPlan() {
  const el = $('#mpBody');
  if (!el) return;
  const mp = P.mp;
  if (!AI.sample)
    return void (el.innerHTML = `<p class="empty">The meal plan is written by Claude, which is not available in this view. Sign in to use it.</p>`);
  if (!mp || !mp.days || mp.days.length !== 7) {
    el.innerHTML = `<p class="muted small">A week of breakfasts, lunches and dinners sized to your ${fmt(P.t.k)} kcal and ${P.t.p} g protein, with a shopping list. Everyday Irish and UK food.</p>
      <label class="f">Anything it should know?<textarea class="inp" id="mpLikes" rows="3" maxlength="300" placeholder="No fish. Vegetarian on weekdays. Quick dinners, I get home at seven.">${esc((mp && mp.likes) || '')}</textarea></label>
      <div class="f">Each day${segHtml(
        'mpMeals',
        [
          ['3', 'Three meals'],
          ['4', 'Three meals and a snack'],
        ],
        '4',
      )}</div>
      <button class="btn ember" data-act="mealPlanGo" data-n="4" id="mpGo">${ic('spark')} Plan my week</button>
      <p class="tiny muted">Uses one of today's ${AI_DAILY} AI requests. Every figure in a plan is Claude's estimate; when you log a meal from it, the foods are matched to the database as usual.</p>`;
    SEG.mpMeals = v => ($('#mpGo').dataset.n = v);
    return;
  }
  const d = mp.days[MPV.day] || mp.days[0];
  el.innerHTML = `<div class="between"><span class="row small muted" style="gap:6px">${srcBadge('AI')} planned ${niceDate(mp.d)}</span><button class="link" data-act="mealPlanAgain">Plan again</button></div>
    ${segHtml(
      'mpDay',
      MP_DAYS.map((n, i) => [String(i), n]),
      String(MPV.day),
    )}
    <div class="between small"><b>${fmt(d.kcal)} kcal</b><span class="muted">${r0(d.p)} g protein · target ${fmt(P.t.k)} and ${P.t.p} g</span></div>
    <div class="card" style="padding:4px 14px">${d.meals
      .map(
        (m, i) =>
          `<div class="mp-meal"><div class="grow"><div class="tiny muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.04em">${MEALS[m.m] || 'Meal'}</div><b>${esc(m.name)}</b><p class="small muted">${esc(m.what)}</p><span class="small tn">${fmt(m.kcal)} kcal · ${r0(m.p)} g protein</span></div><button class="btn sm ghost" data-act="mealPlanLog" data-i="${i}">Log</button></div>`,
      )
      .join('')}</div>
    <button class="btn ghost" data-act="mealPlanShop">${ic('book')} ${MPV.shop ? 'Hide the shopping list' : 'Shopping list for the week'}</button>
    ${MPV.shop ? `<div class="card stack"><ul class="mp-shop">${(mp.shop || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul><button class="btn sm" data-act="mealPlanCopy" style="align-self:flex-start">${ic('copy')} Copy the list</button></div>` : ''}
    <p class="tiny muted">A suggestion to cook from, not a prescription. Every figure here is an estimate.</p>`;
  SEG.mpDay = v => {
    MPV.day = +v;
    renderMealPlan();
  };
}
const AI_DAILY = 40; // the free daily allowance, as set on the server (supabase/functions/ai/handler.js)
A.mealPlanGo = async ({ n }) => {
  const likes = ($('#mpLikes').value || '').trim().slice(0, 300),
    el = $('#mpBody');
  el.innerHTML = `<div class="busy"><div class="spinner"></div>Planning seven days to your targets. This takes up to half a minute.</div>`;
  try {
    const usual = P.rec
      .slice()
      .sort((a, b) => (b.ct || 0) - (a.ct || 0))
      .slice(0, 12)
      .map(r => r.n)
      .join(', ');
    const r = await AI.sample.json(
      [
        'meal_plan',
        {
          kcal: P.t.k,
          protein: P.t.p,
          meals: n === '3' ? 'breakfast, lunch and dinner' : 'breakfast, lunch, dinner and one snack',
          likes,
          usual,
        },
      ],
      { cache: false },
    );
    const days = ((r && r.days) || []).slice(0, 7).map((d, i) => ({
      day: MP_DAYS[i],
      kcal: r0(num(d.kcal)),
      p: r0(num(d.p)),
      meals: (d.meals || []).slice(0, 6).map(m => ({
        m: MEALS[m.m] ? m.m : 's',
        name: String(m.name || 'Meal').slice(0, 60),
        what: String(m.what || m.name || '').slice(0, 240),
        kcal: r0(num(m.kcal)),
        p: r0(num(m.p)),
      })),
    }));
    if (days.length !== 7 || days.some(d => !d.meals.length)) throw { code: 'invalid_json' };
    P.mp = { d: today(), likes, days, shop: ((r && r.shop) || []).slice(0, 40).map(x => String(x).slice(0, 80)) };
    saveProfile();
  } catch (e) {
    toast(aiError(e));
  }
  renderMealPlan();
};
A.mealPlanAgain = () => {
  P.mp = { likes: (P.mp && P.mp.likes) || '' };
  renderMealPlan();
};
A.mealPlanShop = () => {
  MPV.shop = !MPV.shop;
  renderMealPlan();
};
A.mealPlanCopy = async () => {
  try {
    await navigator.clipboard.writeText((P.mp.shop || []).join('\n'));
    toast('Shopping list copied.');
  } catch (e) {
    toast('Copying is blocked in this view.');
  }
};
/* logging a planned meal: its foods are worked out and matched like any described meal, then shown to check */
A.mealPlanLog = async ({ i }, el) => {
  const m = P.mp && P.mp.days[MPV.day] && P.mp.days[MPV.day].meals[+i];
  if (!m) return;
  el.disabled = true;
  el.textContent = 'Working…';
  try {
    await ensureDB();
    const items = await matchAll(await aiParseText(m.what));
    if (!items.length) throw { code: 'none' };
    openReview(items, { meal: m.m });
  } catch (e) {
    toast(e && e.code === 'none' ? 'That meal could not be worked out. Log it by search instead.' : aiError(e));
  }
  el.disabled = false;
  el.textContent = 'Log';
};

/* ---------- a short note for the day, from the diary (one small request a day, only if switched on) ---------- */
const noteState = () => P.note || (P.note = { auto: false, tone: 'gentle', d: '', t: '' });
let noteBusy = false;
async function noteGet() {
  const n = noteState();
  if (noteBusy || !AI.sample) return;
  noteBusy = true;
  try {
    const r = await AI.sample(
      ['daily_note', { tone: n.tone === 'straight' ? 'straight' : 'gentle', context: coachContext() }],
      {
        cache: false,
      },
    );
    const t = String((r && r.text) || '')
      .trim()
      .slice(0, 500);
    if (t) {
      n.d = today();
      n.t = t;
      saveProfile();
    }
  } catch (e) {
    n.err = aiError(e);
  }
  noteBusy = false;
  if (!sheets.length) render();
  else if ($('#noteBody')) renderNote();
}
/* On Today: the note if there is one for today; fetched once a day when the person has asked for that. */
function noteCard() {
  const n = P.note;
  if (!n || S.date !== today() || !AI.sample) return '';
  if (n.d === today() && n.t)
    return `<button class="pstrip note" data-act="dailyNote">${ic('pen')}<span class="grow"><b>Today's note</b><small style="white-space:normal">${esc(n.t)}</small></span></button>`;
  if (n.auto && !noteBusy && n.tried !== today() && (P.hist[addDays(today(), -1)] || {}).n > 0) {
    n.tried = today(); // once a day, and only when there was a yesterday to talk about
    noteGet();
  }
  return '';
}
A.dailyNote = () => {
  openSheet(`${sh('Daily note')}<div class="sheet-b" id="noteBody"></div>`);
  renderNote();
};
function renderNote() {
  const el = $('#noteBody'),
    n = noteState();
  if (!el) return;
  if (!AI.sample)
    return void (el.innerHTML = `<p class="empty">The daily note is written by Claude, which is not available in this view.</p>`);
  el.innerHTML = `<p class="muted small">Two or three sentences each morning, written by Claude from your own diary: what happened yesterday and the one thing worth doing today.</p>
    ${n.d === today() && n.t ? `<div class="card"><p>${esc(n.t)}</p></div>` : noteBusy ? `<div class="busy"><div class="spinner"></div>Writing today's note</div>` : `<button class="btn" data-act="noteNow">${ic('pen')} Write today's note</button>`}
    ${n.err && !(n.d === today() && n.t) ? `<p class="small muted">${esc(n.err)}</p>` : ''}
    <div class="f">Tone${segHtml(
      'noteTone',
      [
        ['gentle', 'Gentle'],
        ['straight', 'Straight'],
      ],
      n.tone,
    )}</div>
    <div class="between"><span class="grow"><b>Write one each morning</b><p class="tiny muted">When you open Ember. Uses one of your ${AI_DAILY} daily AI requests.</p></span><button class="btn sm ${n.auto ? '' : 'ghost'}" data-act="noteAuto" aria-pressed="${n.auto}">${n.auto ? 'On' : 'Off'}</button></div>
    <p class="tiny muted">General guidance from your own numbers, not medical advice.</p>`;
  SEG.noteTone = v => {
    n.tone = v;
    saveProfile();
  };
}
A.noteNow = () => {
  delete noteState().err;
  noteGet();
  renderNote();
};
A.noteAuto = () => {
  const n = noteState();
  n.auto = !n.auto;
  saveProfile();
  renderNote();
};

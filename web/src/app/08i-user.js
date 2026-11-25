/* a date for the middle of a sentence: today and tomorrow in lower case, real dates as written */
const midDate = k => {
  const t = niceDate(k);
  return /^(Today|Tomorrow|Yesterday)$/.test(t) ? t.toLowerCase() : t;
};
/* ---------- everyday-user polish: wearable body card, sample-data preview, rest-day guidance, profile menu, appearance ---------- */
const recBand = r => (r >= 67 ? ['good', 'Primed'] : r >= 34 ? ['gold', 'Steady'] : ['bad', 'Run down']);
const hasBody = h => !!(h && (h.rd || h.sn || h.sl));
function bodyTip(h) {
  const at = h.sn ? ' You are at ' + (+h.sn).toFixed(1) + ' so far.' : '';
  if (h.rd >= 67) return 'A good day to push. A strain of 14 to 18 would suit.' + at;
  if (h.rd >= 34) return 'Train as planned and skip the extras. Aim for a strain of 10 to 14.' + at;
  if (h.rd > 0) return 'Keep it easy: a walk, some mobility and an early night. Stay under a strain of 10.' + at;
  return h.sl && h.sl < 6.5
    ? 'Short on sleep last night, so go a little easier and get to bed earlier.'
    : 'Sleep and strain from your wearable.';
}
const ring2 = (pct, cls, big, small) => {
  const R = 26,
    C = 2 * Math.PI * R;
  return `<div class="ring2 ${cls}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" class="tr"/><circle cx="32" cy="32" r="${R}" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - clamp(pct, 0, 1))).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><b class="tn">${big}</b><span>${small}</span></div>`;
};
const sleepTxt = s => Math.floor(s) + 'h ' + pad(Math.round((s % 1) * 60));
function bodyCard(k) {
  const h = P.hist[k] || {};
  if (!hasBody(h)) return '';
  const b = h.rd ? recBand(h.rd) : null;
  return `<button class="card body" data-act="body" data-date="${k}"><div class="between"><h2>Body</h2><span class="pill ${DEMO ? 'gold' : ''}">${DEMO ? 'Sample data' : 'From your wearable'}</span></div>
    <div class="rings">${h.rd ? ring2(h.rd / 100, b[0], r0(h.rd) + '%', 'Recovery') : ''}${h.sn ? ring2(h.sn / 21, 'ice', (+h.sn).toFixed(1), 'Strain') : ''}${h.sl ? ring2(h.sl / 8, 'slp', sleepTxt(h.sl), 'Sleep') : ''}</div>
    <p class="small" style="text-align:left">${b ? `<b>${b[1]}.</b> ` : ''}${bodyTip(h)}</p>
    <div class="bstats tn">${h.hv ? `<span><b>${r0(h.hv)}</b> ms HRV</span>` : ''}${h.rh ? `<span><b>${r0(h.rh)}</b> resting HR</span>` : ''}${h.st ? `<span><b>${fmt(h.st)}</b> steps</span>` : ''}${h.bk ? `<span><b>${fmt(h.bk)}</b> kcal burned</span>` : ''}</div></button>`;
}
A.body = ({ date } = {}) => {
  const tk = date || today(),
    days = Array.from({ length: 14 }, (_, i) => addDays(tk, i - 13)),
    hs = days.map(k => P.hist[k] || {}),
    avg = f => {
      const v = hs.map(h => h[f]).filter(x => x > 0);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    };
  const bars = (f, max, cls) =>
    `<div class="gbars">${hs.map((h, i) => `<i class="${typeof cls === 'function' ? cls(h[f] || 0) : cls}" style="height:${h[f] ? Math.max(4, Math.min(100, (h[f] / max) * 100)) : 2}%" title="${niceDate(days[i])}: ${h[f] || 'no data'}"></i>`).join('')}</div>`;
  const h = P.hist[tk] || {};
  openSheet(
    `${sh('Body')}<div class="sheet-b">${DEMO ? `<div class="banner">${ic('alert')}<span>Sample data, to show what a connected wearable looks like.</span></div>` : ''}
    <section class="card"><div class="between"><h2>Recovery</h2><span class="muted small tn">${h.rd ? r0(h.rd) + '% today, ' : ''}${r0(avg('rd'))}% two-week average</span></div>${bars('rd', 100, v => 'b-' + recBand(v)[0])}<p class="small muted" style="margin-top:8px">How ready your body is, from heart rate variability, resting heart rate and sleep. Green is 67 and over, amber 34 to 66, red below that.</p></section>
    <section class="card"><div class="between"><h2>Strain</h2><span class="muted small tn">${h.sn ? (+h.sn).toFixed(1) + ' today, ' : ''}${avg('sn').toFixed(1)} average</span></div>${bars('sn', 21, 'b-ice')}<p class="small muted" style="margin-top:8px">How hard the day was on a scale to 21. Matching strain to recovery is the point: push on green days, back off on red.</p></section>
    <section class="card"><div class="between"><h2>Sleep</h2><span class="muted small tn">${h.sl ? sleepTxt(h.sl) + ' last night, ' : ''}${sleepTxt(avg('sl'))} average</span></div>${bars('sl', 10, 'b-slp')}</section>
    <section class="card"><div class="stat4"><div class="stat"><div class="num">${r0(avg('hv')) || '–'}</div><span>HRV, ms, average</span></div><div class="stat"><div class="num">${r0(avg('rh')) || '–'}</div><span>Resting heart rate</span></div><div class="stat"><div class="num">${fmt(r0(avg('st')))}</div><span>Steps a day</span></div><div class="stat"><div class="num">${fmt(r0(avg('bk')))}</div><span>Kcal burned a day</span></div></div></section></div>`,
    true,
  );
};

/* ---------- preview: the whole app on a copy of your data plus sample wearable, workout and schedule. Nothing is written while it is on. ---------- */
let DEMO = null;
A.preview = () => {
  if (DEMO) return A.previewOff();
  closeAll();
  const tk = today(),
    wd = wdOf(tk);
  DEMO = { P, days: S.days, TR, date: S.date, tab: S.tab, hadProg: !!activeProg() };
  P = clone(P);
  S.days = clone(S.days);
  TR = clone(TR);
  S.date = tk;
  if (!S.days[tk]) S.days[tk] = newDay(tk);
  const REC = [62, 81, 44, 73, 90, 35, 68, 77, 58, 84, 49, 71, 66, 88],
    STR = [13.4, 15.8, 8.2, 14.1, 17.3, 6.4, 12.9, 15.2, 10.8, 16.1, 9.3, 13.7, 12.2, 16.8],
    SLP = [7.4, 8.1, 6.2, 7.6, 8.4, 5.8, 7.2, 7.9, 6.9, 8.2, 6.4, 7.5, 7.1, 8.3];
  for (let i = 0; i < 14; i++) {
    const k = addDays(tk, -i),
      h = P.hist[k] || (P.hist[k] = { k: 0, p: 0, c: 0, f: 0, n: 0 });
    Object.assign(h, {
      rd: REC[i],
      sn: STR[i],
      sl: SLP[i],
      hv: Math.round(38 + REC[i] * 0.5),
      rh: Math.round(64 - REC[i] * 0.12),
      st: 6200 + ((i * 937) % 5200),
      bk: Math.round(2450 + STR[i] * 45),
    });
  }
  if (!DEMO.hadProg) {
    const t = TEMPLATES.find(x => x.id === 't-full3') || TEMPLATES[0];
    S.progs.demo = { id: 'demo', n: t.n, weeks: t.weeks || 8, days: clone(t.days) };
    P.prog = { id: 'demo', at: 4 };
  }
  const p = activeProg(),
    pl = plan();
  pl.days = [wd, (wd + 2) % 7, (wd + 4) % 7].sort();
  pl.since = addDays(tk, -14);
  pl.tm = '07:00';
  pl.ev = pl.ev.concat([
    { id: 'dm1', k: 'match', t: 'Padel doubles', tm: '20:00', min: 90, wd, from: addDays(tk, -14), d: '' },
    { id: 'dm2', k: 'appt', t: 'Physio', tm: '09:30', min: 45, wd: null, d: addDays(tk, 1) },
  ]);
  [0, 2, 5, 7, 9].forEach((ago, j) => {
    const k = addDays(tk, -ago);
    if (TR.sess.some(s => s.d === k && s.kind === 'train')) return;
    TR.sess.unshift({
      id: 'ds' + j,
      n: p.days[(4 - j + 20) % p.days.length].n,
      d: k,
      dur: 48 + j * 3,
      vol: 6100 + j * 240,
      sets: 18 + (j % 3),
      prs: j === 0 ? 1 : 0,
      kind: 'train',
      sample: 1,
    });
  });
  TR.sess.sort((a, b) => (a.d < b.d ? 1 : -1));
  P.prog.at = (P.prog.at || 0) + 1;
  const d = S.days[tk];
  if (!d.x.some(x => x.tr === 'train'))
    d.x.push({ id: 'dx1', n: TR.sess.find(s => s.d === tk).n, k: 310, min: 48, src: 'ad', tr: 'train' });
  d.x.push({ id: 'dx2', n: 'Walking', k: 140, min: 35, src: 'ad', km: 2.8 });
  if (!d.w) d.w = 1250;
  setHist(d);
  S.tab = 'today';
  render();
  $('#main').scrollTop = 0;
  toast('Preview on. Nothing here is saved.');
};
A.previewOff = () => {
  if (!DEMO) return;
  closeAll();
  const o = DEMO;
  DEMO = null;
  P = o.P;
  S.days = o.days;
  TR = o.TR;
  S.date = o.date;
  if (o.as) return cgLeaveLens(o);
  delete S.progs.demo;
  S.tab = 'you';
  render();
  $('#main').scrollTop = 0;
  toast('Back to your own data');
};
const demoBanner = () =>
  DEMO && DEMO.as
    ? `<div class="banner demo">${ic('search')}<span><b>${esc(DEMO.as)}'s app.</b> A read-only copy of what they share with you. Nothing you tap here is saved or sent.</span><button class="btn sm" data-act="previewOff">Back</button></div>`
    : DEMO
      ? `<div class="banner demo">${ic('spark')}<span><b>Preview with sample data.</b> A wearable connected, a session done and a full week planned. Nothing here is saved.</span><button class="btn sm" data-act="previewOff">Exit</button></div>`
      : '';

/* ---------- Train on a day with nothing planned, or once the session is done: what to do today, not tomorrow's session ---------- */
function restSuggest(tk, did) {
  const h = P.hist[tk] || {},
    d = S.days[tk] || newDay(tk),
    t = totals(d),
    rp = TR.rehab && rehabPlan(TR.rehab.id),
    rehabDone = TR.rlog[tk] && TR.rlog[tk].done,
    low = h.rd > 0 && h.rd < 34,
    mob = ROUTINES.find(r => /mobil|stretch|recover/i.test(r.n)) || ROUTINES[0],
    wind = ROUTINES.find(r => /sleep|wind|evening/i.test(r.n));
  const row = (act, icon, t1, t2, attr) =>
      `<button class="th-sug" data-act="${act}" ${attr || ''}>${ic(icon)}<span class="grow"><b>${t1}</b><small>${t2}</small></span>${ic('chev-r')}</button>`,
    out = [];
  if (rp && !rehabDone)
    out.push(
      row(
        'rehabGo',
        'shield',
        "Today's rehab",
        'Phase ' + (TR.rehab.phase + 1) + ': ' + esc(rp.phases[TR.rehab.phase].n),
      ),
    );
  out.push(
    row(
      'routine',
      'pulse',
      did ? 'Cool down: ' + esc(mob.n) : esc(mob.n),
      Math.round(rtTotal(mob) / 60) +
        ' minutes, guided. ' +
        (did ? 'Helps tomorrow feel better.' : 'Keeps you moving without adding load.'),
      `data-id="${mob.id}"`,
    ),
  );
  if (!did)
    out.push(
      row(
        'addExercise',
        'bolt',
        low ? 'An easy 20 minute walk' : 'A 30 to 40 minute walk',
        (h.st ? fmt(h.st) + ' steps so far. ' : '') + 'Easy pace, enough to talk. Log it when you are back.',
      ),
    );
  const pl = r0(P.t.p - t.p);
  if (pl > 15)
    out.push(
      row(
        'ideas',
        'spark',
        pl + ' g of protein still to eat',
        'Recovery is built from it. See what fits the rest of today.',
      ),
    );
  if (wind && new Date().getHours() >= 17)
    out.push(
      row(
        'routine',
        'moon',
        esc(wind.n),
        'Lights out by ' + (P.bed || '23:00') + ' gives you a full night.',
        `data-id="${wind.id}"`,
      ),
    );
  return out.slice(0, 4).join('');
}
function restHero(tk, p, did) {
  const h = P.hist[tk] || {},
    rd = TR.ready[tk],
    score = h.rd || (rd && rd.score) || 0,
    nx = nextTrainDate(),
    evs = planFor(tk).filter(x => x.type === 'ev' && !x.done);
  const head = did ? 'Done for today' : score && score < 34 ? 'Take it easy today' : 'Rest day';
  const line = did
    ? esc(did.n) +
      ': ' +
      did.dur +
      ' minutes, ' +
      did.sets +
      ' sets' +
      (did.prs ? ', ' + did.prs + (did.prs === 1 ? ' record' : ' records') : '') +
      '. The work is done, now recover from it.'
    : score >= 67
      ? 'No session planned and you are well recovered. Keep moving lightly so tomorrow starts fresh.'
      : score && score < 34
        ? 'Your recovery is low. Rest is the training today.'
        : 'Nothing planned, which is the plan. Rest days are where the fitness is banked.';
  return `<section class="thero"><div><div class="th-k">${did ? `<span class="th-done" style="margin:0">${ic('check')} Session complete</span>` : esc(p.n)}</div><div class="th-t">${head}</div><div class="th-f">${line}</div></div>
    ${evs.length ? `<div class="th-meta">${evs.map(e => `<span>${e.tm ? e.tm + ' ' : ''}${esc(e.t)}</span>`).join('')}</div>` : ''}
    <div class="th-list">${restSuggest(tk, did)}</div>
    <div class="th-next"><span>${nx ? 'Next session: <b>' + esc(sessionOn(nx).n) + '</b>, ' + midDate(nx) + (plan().tm ? ' at ' + plan().tm : '') : 'No more sessions planned yet'}</span></div>
    <div class="th-links">${!did && nx ? `<button data-act="calMoveTo" data-from="${nx}" data-to="${tk}">Train today instead</button>` : ''}${did ? `<button data-act="sessView" data-id="${did.id}">See the session</button>` : ''}<button data-act="cal">Open the plan</button><button data-act="progView" data-id="${p.id}">Whole program</button><button data-act="progs">Change program</button></div>${readyRow(tk)}</section>`;
}

/* ---------- appearance ---------- */
function applyTheme() {
  const t = P && P.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
SEG.theme = v => {
  P.theme = v;
  applyTheme();
  saveProfile();
};

/* ---------- the You page ---------- */
function viewMore() {
  const nr = Object.keys(S.recipes).length,
    nf = Object.keys(S.foods).length,
    own = Store.owner !== false,
    L = levelOf(P.xp),
    lo = 50 * (L - 1) * L,
    hi = 50 * L * (L + 1),
    st = streak(),
    logged = Object.values(P.hist).filter(h => h.n > 0).length,
    name = P.coachName || 'You',
    un = myUnread();
  const row = (act, icon, title, sub, attr) =>
    `<button class="navrow" data-act="${act}" ${attr || ''}><span class="ni">${ic(icon)}</span><span class="grow"><b>${title}</b><small>${sub}</small></span>${ic('chev-r')}</button>`;
  const grp = (title, rows) =>
    `<div class="mgrp"><h3>${title}</h3><div class="card mlist">${rows.filter(Boolean).join('')}</div></div>`;
  return `<section class="phero"><button class="pav" data-act="setCoachName" aria-label="Change your name">${esc(initials(name))}</button><div class="grow" style="min-width:0"><h2 class="ell">${esc(name)}</h2><div class="small">Level ${L} · ${fmt(P.xp)} XP</div><div class="bar hb p" style="margin-top:8px"><i style="width:${clamp(((P.xp - lo) / (hi - lo)) * 100, 2, 100)}%"></i></div><div class="tiny" style="margin-top:5px;opacity:.75">${fmt(hi - P.xp)} XP to level ${L + 1}</div></div></section>
    <div class="pstats"><div><b class="num">${st.count}</b><span>day streak</span></div><div><b class="num">${logged}</b><span>days logged</span></div><div><b class="num">${fmt(P.gems)}</b><span>gems</span></div><div><b class="num">${(P.ach || []).length || Object.keys(P.ach || {}).length}</b><span>awards</span></div></div>
    ${grp('Your plan', [row('openTargets', 'target', 'Targets and profile', fmt(P.t.k) + ' kcal, ' + P.t.p + ' g protein'), row('cal', 'cal', 'Calendar and schedule', 'Training days, matches and what you did'), row('photos', 'camera', 'Progress photos', 'Private, with before and after'), row('weekReview', 'chart', 'Last week in review', 'Averages, trend and whether your target still fits'), row(P.fast && P.fast.on ? 'fastSheet' : 'fastOn', 'clock', 'Fasting timer', P.fast && P.fast.on ? (P.fast.start ? 'Fasting now' : P.fast.goal + ' hour fasts, on Today') : 'Off. Turn on to time your fasts'), row('takeBreak', 'snow', 'Take a break', onBreak() ? breakLine() : 'Hold your streak while you are away or unwell')])}
    ${grp('Food', [row('openRecipes', 'book', 'Recipes and saved meals', nr ? nr + ' saved' : 'Build one once, log it in a tap'), row('openFoods', 'fork', 'My foods', nf ? nf + ' saved' : 'Add foods from a label'), row('importDiary', 'upload', 'Bring your diary from another app', P.imp ? fmt(P.imp.days) + ' days brought in ' + niceDate(P.imp.at) : 'MyFitnessPal, Cronometer, Lose It! and others'), row('ideas', 'spark', 'What can I eat?', 'Dishes sized to what you have left'), row('mealPlan', 'book', 'Meal plan for the week', P.mp && P.mp.days ? 'Planned ' + niceDate(P.mp.d) + ', with a shopping list' : 'Seven days to your targets, with a shopping list'), row('dailyNote', 'pen', 'Daily note', P.note && P.note.auto ? 'On, ' + (P.note.tone === 'straight' ? 'straight' : 'gentle') : 'A few lines each morning from your diary')])}
    ${grp('Body and devices', [row('openConnections', AI.mcp ? 'link' : 'upload', AI.mcp ? 'Connect a wearable' : 'Import from a wearable', P.ad ? 'Synced ' + niceDate(P.ad.at.slice(0, 10)) : AI.mcp ? 'WHOOP, Garmin, Apple Health, Strava' : 'Files from Apple Health, Garmin, Strava, WHOOP'), row('preview', 'spark', DEMO ? 'Exit the preview' : 'Preview with sample data', DEMO ? 'Back to your own data' : 'See Ember with a wearable, a workout and a full week')])}
    ${FEATURES.coach || FEATURES.gym ? grp('People', [FEATURES.coach && coachingOn() ? cgYouRow(row) : '', FEATURES.coach && (!coachingOn() || hasCoach()) ? row('chat', 'chat', 'Messages with your coach', un ? un + ' unread' : 'Ask about your plan') : '', FEATURES.community && own ? row('catalogue', 'search', 'Find a coach', 'Checked profiles, plans and reviews') : '', FEATURES.gym ? row('gym', 'home', 'My gym', 'Book classes, one-to-ones and spaces') : '']) : ''}
    ${grp('App', [
      row('assistant', 'mic', 'Assistant', 'Talk or type to log, ask and plan'),
      row(
        'reminders',
        'alert',
        'Reminders',
        !canRemind()
          ? 'In the phone app'
          : P.rem && (P.rem.log.on || P.rem.train.on)
            ? [P.rem.log.on ? 'Log nudge at ' + P.rem.log.time : '', P.rem.train.on ? 'before sessions' : '']
                .filter(Boolean)
                .join(', ')
            : 'Off',
      ),
      row(
        'openData',
        'db',
        'Your data',
        Store.mode === 'cloud' ? 'Saved to your account' : 'Saved on this device only',
      ),
      roadmapOn() ? row('roadmap', 'flag', 'What should Ember build next?', 'Vote, or suggest something') : '',
      `<div class="navrow" style="cursor:default"><span class="ni">${ic('moon')}</span><span class="grow"><b>Appearance</b><div style="margin-top:8px">${segHtml(
        'theme',
        [
          ['auto', 'Match phone'],
          ['light', 'Light'],
          ['dark', 'Dark'],
        ],
        P.theme || 'auto',
      )}</div></span></div>`,
    ])}
    ${own && !DEMO && (FEATURES.coach || FEATURES.gym) ? grp('For professionals', [FEATURES.coach ? row('modeGo', 'users', 'Coach view', 'Clients, programs and messages', 'data-m="coach"') : '', FEATURES.gym ? row('modeGo', 'home', 'Gym view', 'Timetable, bookings and members', 'data-m="gym"') : '']) : ''}
    <section class="card"><h2>How Ember keeps numbers honest</h2><div class="stack small" style="margin-top:10px">
      <div class="row" style="align-items:flex-start">${srcBadge('F')}<span>Everyday foods come from USDA FoodData Central, measured in a lab or a national survey.</span></div>
      <div class="row" style="align-items:flex-start">${srcBadge('B')}<span>Branded products use the printed label, from Open Food Facts.</span></div>
      <div class="row" style="align-items:flex-start">${srcBadge('AI')}<span>Anything Claude had to estimate is marked, so you know which numbers are measured and which are a best guess.</span></div></div></section>`;
}

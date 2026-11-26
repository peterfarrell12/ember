/* ================= v4: client records the coach can fully run ================= */
/* Each client is stored as its own document, so the roster can grow. */
const clCache = {};
function saveCO() {
  const { clients, ...meta } = CO;
  Store.put('meta', 'coach', meta);
  for (const id in clients) {
    const j = JSON.stringify(clients[id]);
    if (clCache[id] !== j) {
      clCache[id] = j;
      Store.put('cl', id, clients[id]);
    }
  }
  for (const id in clCache)
    if (!clients[id]) {
      delete clCache[id];
      Store.del('cl', id);
    }
}
async function loadCO() {
  const co = (await Store.get('meta', 'coach')) || {},
    cls = await Store.list('cl'),
    legacy = co.clients || {};
  CO = { seeded: false, ...co, clients: { ...legacy } };
  cls.forEach(c => {
    if (c && c.id) {
      CO.clients[c.id] = c;
      clCache[c.id] = JSON.stringify(c);
    }
  });
  if (Object.keys(legacy).length) saveCO();
}
function clientStatus(c) {
  const tk = today(),
    w7 = addDays(tk, -6),
    s0 = c.st || {},
    ss = c.sess || [],
    wts = c.wts || [],
    ck = (c.checks || [])[0];
  const logged = ss.filter(s => s.d >= w7 && s.kind !== 'rehab').length,
    extra = ck && ck.d >= w7 && ck.sess ? ck.sess : 0,
    lastW = wts[wts.length - 1],
    base = wts.length > 1 ? [...wts].reverse().find(w => w.d <= addDays(tk, -28)) || wts[0] : null;
  const upd =
    [s0.upd || (s0.updAgo != null ? addDays(tk, -s0.updAgo) : null), ss[0] && ss[0].d, lastW && lastW.d, ck && ck.d]
      .filter(Boolean)
      .sort()
      .pop() || null;
  return {
    ...s0,
    upd,
    sess7: ss.length || ck ? logged + extra : s0.sess7 || 0,
    lastSess: ss.length ? ss[0].d : s0.lastSess || (s0.lastAgo != null ? addDays(tk, -s0.lastAgo) : null),
    kg: lastW ? lastW.kg : (s0.kg ?? null),
    kg30: lastW ? (base && base !== lastW ? r1(lastW.kg - base.kg) : null) : (s0.kg30 ?? null),
    prs14: ss.length ? ss.filter(s => s.d >= addDays(tk, -13)).reduce((a, s) => a + (s.prs || 0), 0) : s0.prs14 || 0,
    kcalT: c.t ? c.t.k : s0.kcalT,
    protT: c.t ? c.t.p : s0.protT,
    plan7: c.prog ? c.prog.days.length : 0,
    progN: c.prog ? c.prog.n : '',
    progWk: c.prog ? Math.floor((c.progAt || 0) / c.prog.days.length) + 1 : 0,
    progWeeks: c.prog ? c.prog.weeks || 0 : 0,
    rehabN: c.rehab ? c.rehab.n : '',
    rehabPh: c.rehab ? c.rehab.phase + 1 : 0,
  };
}
/* Invented history for a sample client, so the screens have something to show. */
const BASE_LIFT = {
  squat: 95,
  fsquat: 75,
  deadlift: 125,
  trapdl: 135,
  bench: 70,
  dbbench: 26,
  incline: 22,
  ohp: 45,
  dbohp: 18,
  row: 65,
  dbrow: 28,
  rdl: 85,
  dbrdl: 26,
  split: 18,
  goblet: 22,
  hipthrust: 110,
  latpull: 60,
  cablerow: 60,
  legpress: 160,
};
function fillSample(c, s, i) {
  let seed = 11 + i * 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const st = s.st,
    tk = today(),
    days = c.prog.days,
    lastAgo = st.lastAgo || 0;
  c.wts = [];
  for (let n = 8; n >= 0; n--) {
    const ago = n * 7 + (st.updAgo || 0);
    c.wts.push({ d: addDays(tk, -ago), kg: r1(st.kg - ((st.kg30 || 0) * ago) / 30 + (n ? (rnd() - 0.5) * 0.5 : 0)) });
  }
  const agos = [];
  for (let j = 0; j < (st.sess7 || 0); j++) {
    const a = Math.min(6, lastAgo + Math.round((j * (6 - lastAgo)) / Math.max(1, st.sess7)));
    if (!agos.includes(a)) agos.push(a);
  }
  let a = Math.max(8, lastAgo);
  for (let j = 0; j < 9; j++) {
    agos.push(a);
    a += 2 + Math.round(rnd());
  }
  let prs = st.prs14 || 0;
  c.sess = agos.map((ago, k) => {
    const day = days[((((c.progAt || 0) - 1 - k) % days.length) + days.length) % days.length],
      sets = day.items.reduce((x, it) => x + it.sets, 0),
      p = ago <= 13 && prs > 0 ? Math.min(prs, k === 0 ? 2 : 1) : 0;
    prs -= p;
    return {
      id: 'g' + k,
      d: addDays(tk, -ago),
      n: day.n,
      dur: 34 + Math.round(rnd() * 28),
      vol: Math.round((2400 + rnd() * 5200) / 10) * 10,
      sets,
      prs: p,
      kind: 'train',
      rpe: 6 + Math.round(rnd() * 2),
    };
  });
  c.ev = c.sess
    .filter(x => x.d >= addDays(tk, -14))
    .map(x => ({
      d: x.d,
      k: x.prs ? 'trophy' : 'dumbbell',
      s: 'Finished ' + x.n + ', ' + x.dur + ' min' + (x.prs ? ', ' + x.prs + ' record' + (x.prs === 1 ? '' : 's') : ''),
    }))
    .concat(c.ev)
    .sort((x, y) => ((x.d || addDays(tk, -(x.ago || 0))) < (y.d || addDays(tk, -(y.ago || 0))) ? 1 : -1))
    .slice(0, 12);
  c.lifts = {};
  [...new Set(days.flatMap(d => d.items.map(it => it.ex)))]
    .filter(ex => BASE_LIFT[ex])
    .slice(0, 6)
    .forEach(ex => {
      const w = round25(BASE_LIFT[ex] * (0.65 + rnd() * 0.55)),
        r = 5 + Math.round(rnd() * 3);
      c.lifts[ex] = {
        h: [
          [addDays(tk, -21), round25(w * 0.94), r],
          [addDays(tk, -lastAgo - 2), w, r],
        ],
        pr: Math.round(w * (1 + r / 30) * 10) / 10,
        last: [
          [w, r],
          [w, r],
          [w, r - 1],
        ],
      };
    });
  if (st.pain != null) c.checks = [{ d: addDays(tk, -(st.updAgo || 0)), pain: st.pain, note: '' }];
}

/* ---------- adding a client ---------- */
let NC = null;
A.coAdd = () => {
  NC = { sex: 'm', goal: 'keep' };
  openSheet(
    `${sh('Add a client')}<div class="sheet-b"><label class="f">Name<input class="inp" id="caN" autocomplete="off"></label><label class="f">What they want<input class="inp" id="caG" placeholder="First 10 km in May" autocomplete="off"></label>
    ${segHtml(
      'ncSex',
      [
        ['m', 'Male'],
        ['f', 'Female'],
      ],
      'm',
    )}<div class="grid3"><label class="f">Age<input class="inp" id="caA" inputmode="numeric"></label><label class="f">Height cm<input class="inp" id="caH" inputmode="decimal"></label><label class="f">Weight kg<input class="inp" id="caW" inputmode="decimal"></label></div>
    <label class="f">Activity<select class="inp" id="caAct">${ACTS.map(a => `<option value="${a[0]}" ${a[0] === 1.375 ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></label>
    ${segHtml(
      'ncGoal',
      [
        ['lose', 'Lose weight'],
        ['keep', 'Maintain'],
        ['gain', 'Gain'],
      ],
      'keep',
    )}
    <label class="f">Starting program<select class="inp" id="caP"><option value="">Decide later</option>${Object.values(
      S.progs,
    )
      .map(p => `<option value="${p.id}">${esc(p.n)}</option>`)
      .join('')}${TEMPLATES.map(t => `<option value="${t.id}">${esc(t.n)}</option>`).join('')}</select></label>
    <p class="small muted">With age, height and weight filled in, Ember suggests calorie and protein targets. You run this client's record yourself: sessions, weigh-ins, check-ins and notes.</p></div><div class="sheet-f"><button class="btn" data-act="coAddGo">Add client</button></div>`,
    true,
  );
  SEG.ncSex = v => (NC.sex = v);
  SEG.ncGoal = v => (NC.goal = v);
  $('#caN').focus();
};
A.coAddGo = () => {
  const n = $('#caN').value.trim();
  if (!n) return toast('Give them a name.');
  const age = r0(num($('#caA').value)),
    cm = num($('#caH').value),
    kg = r1(num($('#caW').value)),
    id = 'm' + newId(),
    pid = $('#caP').value,
    src = TEMPLATES.find(t => t.id === pid) || S.progs[pid];
  const full = age >= 14 && cm >= 120 && kg >= 30,
    tg = full
      ? calcTargets({ sex: NC.sex, age, cm, kg, act: num($('#caAct').value, 1.375), goal: NC.goal, rate: 0.5 })
      : null;
  CO.clients[id] = {
    id,
    kind: 'manual',
    name: n.slice(0, 50),
    goal: $('#caG').value.trim().slice(0, 80),
    since: today(),
    pf: { sex: NC.sex, age, cm, kg, aim: NC.goal },
    prog: src ? clone({ n: src.n, weeks: src.weeks || 0, days: src.days }) : null,
    progAt: 0,
    rehab: null,
    tasks: ['train', 'protein'],
    t: tg ? { k: tg.k, p: tg.p } : null,
    notes: [],
    msgs: [],
    wts: kg >= 30 ? [{ d: today(), kg }] : [],
    sess: [],
    checks: [],
    lifts: {},
    st: { upd: today(), logged7: null },
    ev: [{ d: today(), k: 'user', s: 'Joined' }],
  };
  saveCO();
  closeSheet();
  render();
  A.coClient({ id });
  toast(tg ? 'Added. Suggested ' + fmt(tg.k) + ' kcal and ' + tg.p + ' g protein.' : 'Client added');
};

/* ---------- the client workspace ---------- */
let CC = null,
  CT = 'over';
/* a wide screen in coach view: the list stays on the left and whatever is opened shows on the right */
const deskWide = () => document.body.classList.contains('desk') && matchMedia('(min-width: 1000px)').matches;
A.coClient = ({ id }) => {
  if (CC !== id) CT = 'over';
  if (deskWide()) closeAll(); // one client at a time in the right-hand pane
  CC = id;
  openSheet(
    `<div class="sheet-h"><h3 id="ccName"></h3><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="sheet-b" id="ccBody"></div>`,
    true,
  );
  renderClient();
};
/* from a flagged client: open the conversation with a message already drafted, for the coach to edit and send */
A.coBriefDraft = () => {
  A.chat({ id: CC });
  setTimeout(() => $('#chT') && A.chatDraft(), 150);
};
A.ccTab = ({ t }) => {
  CT = t;
  renderClient();
  $('#ccBody').scrollTop = 0;
};
function miniLine(pts, label) {
  if (pts.length < 2) return '';
  const W = 320,
    H = 96,
    vs = pts.map(p => p.v),
    lo = Math.min(...vs) - 0.4,
    hi = Math.max(...vs) + 0.4,
    t0 = pdate(pts[0].d).getTime(),
    t1 = pdate(pts[pts.length - 1].d).getTime() || t0 + 1;
  const X = p => 8 + (W - 16) * ((pdate(p.d).getTime() - t0) / Math.max(1, t1 - t0)),
    Y = p => 8 + (H - 30) * (1 - (p.v - lo) / (hi - lo)),
    line = pts.map(p => X(p).toFixed(1) + ',' + Y(p).toFixed(1)).join(' '),
    last = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}"><polyline points="${line}" fill="none" stroke="var(--ember)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(last)}" cy="${Y(last)}" r="4.5" fill="var(--ember)" stroke="var(--surface)" stroke-width="2"/><text x="8" y="${H - 4}">${niceDate(pts[0].d)} · ${pts[0].v}</text><text x="${W - 8}" y="${H - 4}" text-anchor="end">${niceDate(last.d)} · ${last.v}</text></svg>`;
}
function renderClient() {
  const b = $('#ccBody'),
    c = getClient(CC);
  if (!b || !c) return;
  const st = c.st,
    al = alertsFor(st),
    a = adher(st),
    rec = CO.clients[c.id] || {},
    own = c.kind === 'manual' || c.kind === 'sample',
    first = c.name.split(' ')[0];
  $('#ccName').textContent = c.name;
  const tabs = [
    ['over', 'Overview'],
    ['plan', 'Plan'],
  ].concat(c.kind === 'live' ? [] : [['sess', 'Sessions']], [
    ['photos', 'Photos'],
    ['notes', 'Notes'],
  ]);
  if (!tabs.some(t => t[0] === CT)) CT = 'over';
  const head = `<div class="row" style="flex-wrap:wrap;gap:6px">${kindPill(c)}${c.goal ? `<span class="pill">${esc(c.goal)}</span>` : ''}${st.streak ? `<span class="pill">${st.streak}-day streak</span>` : ''}</div><div class="seg">${tabs.map(([k, l]) => `<button data-act="ccTab" data-t="${k}" aria-pressed="${CT === k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (CT === 'over') {
    const sg = v => (v == null ? '' : (v > 0 ? '+' : '') + v + ' kg in a month'),
      wts =
        c.kind === 'me'
          ? trendSeries()
              .slice(-12)
              .map(w => ({ d: w.d, v: r1(w.t) }))
          : ((c.kind === 'live' && c.view && c.view.profile.wts) || rec.wts || [])
              .slice(-12)
              .map(w => ({ d: w.d, v: w.kg }));
    body = `${cgClientNote(c)}${cgClientCheckins(c)}${cgClientEngage(c)}${al.length ? `<div class="banner" style="background:var(--ember-soft)">${ic('alert')}<span>${esc(al.join('. '))}.</span></div>${c.kind !== 'me' && AI.sample ? `<button class="btn sm ghost" data-act="coBriefDraft" style="align-self:flex-start">${ic('spark')} Draft a message about this</button>` : ''}` : ''}
      <div class="stat4"><div class="stat"><div class="num">${a == null ? 'n/a' : a + '%'}</div><span>${st.plan7 ? st.sess7 + ' of ' + st.plan7 + ' sessions in 7 days' : 'No sessions planned'}</span></div><div class="stat"><div class="num">${st.ready == null ? 'n/a' : st.ready}</div><span>Recovery score</span></div>
        <div class="stat"><div class="num">${st.kg == null ? 'n/a' : st.kg + ' kg'}</div><span>${sg(st.kg30) || 'Weight'}</span></div><div class="stat"><div class="num">${st.kcalAvg ? fmt(st.kcalAvg) : 'n/a'}</div><span>${st.kcalAvg ? 'kcal a day against ' + fmt(st.kcalT || 0) + (st.protAvg ? ', protein ' + st.protAvg + ' of ' + (st.protT || 0) + ' g' : '') : 'No food data this week'}</span></div></div>
      <section class="card stack"><div class="between"><h2>Weight</h2>${own ? `<button class="btn sm ghost" data-act="coWeigh">${ic('plus')} Weigh-in</button>` : ''}</div>${miniLine(wts, 'Weight over time') || `<p class="small muted">${wts.length ? 'One weigh-in so far: ' + wts[0].v + ' kg.' : 'No weigh-ins yet.'}</p>`}</section>
      ${
        (c.ev || []).length
          ? `<section class="card"><h2>Recent activity</h2>${c.ev
              .slice(0, 6)
              .map(
                e =>
                  `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc(e.s)}</span><span class="k"></span><span class="s">${niceDate(e.d)}</span></div>`,
              )
              .join('')}</section>`
          : ''
      }
      ${c.kind === 'me' ? `<button class="btn ghost" data-act="modeToggle">${ic('swap')} Open my own view</button>` : ''}`;
  } else if (CT === 'plan') {
    const tasks =
        c.kind === 'me'
          ? P.tasks.map(t => (t.auto ? TASK_AUTO[t.auto][0] : t.t))
          : (rec.tasks || []).map(k => (TASK_AUTO[k] ? TASK_AUTO[k][0] : k)),
      tg = c.kind === 'me' ? P.t : rec.t,
      nx = own && rec.prog ? rec.prog.days[(rec.progAt || 0) % rec.prog.days.length] : null,
      rp = own && rec.rehab ? rehabPlan(rec.rehab.id) : null;
    body = `<section class="card stack"><div class="between"><h2>Program</h2><button class="link" data-act="coPick" data-what="prog">${st.progN ? 'Change' : 'Assign'}</button></div><p class="small ${st.progN ? '' : 'muted'}">${st.progN ? esc(st.progN) + ' · week ' + st.progWk + (st.progWeeks ? ' of ' + st.progWeeks : '') : 'Nothing assigned yet.'}</p>
        ${nx ? `<p class="small">Next: <b>${esc(nx.n)}</b>${nx.focus ? ' · ' + esc(nx.focus) : ''}</p><button class="btn ember" data-act="coStart">${ic('play', 'fill')} Run this session with ${esc(first)}</button><div class="row" style="gap:16px;flex-wrap:wrap"><button class="link" data-act="coEditProg">Edit for ${esc(first)}</button><button class="link" data-act="coCopyPlan">Copy plan as text</button></div>` : ''}</section>
      <section class="card stack"><div class="between"><h2>Rehab</h2><button class="link" data-act="coPick" data-what="rehab">${st.rehabN ? 'Change' : 'Assign'}</button></div><p class="small ${st.rehabN ? '' : 'muted'}">${st.rehabN ? esc(st.rehabN) + ' · phase ' + st.rehabPh + (rp ? ' of ' + rp.phases.length + ': ' + esc(rp.phases[rec.rehab.phase].n) : '') + (st.pain != null ? ' · last pain score ' + st.pain + '/10' : '') : 'No rehab plan.'}</p>
        ${rp ? `<button class="btn" data-act="coRehabGo">${ic('play', 'fill')} Run the rehab session</button><div class="row" style="gap:16px;flex-wrap:wrap">${rec.rehab.phase < rp.phases.length - 1 ? `<button class="link" data-act="coRehabPhase" data-n="1">Move to phase ${rec.rehab.phase + 2}</button>` : ''}${rec.rehab.phase > 0 ? `<button class="link" data-act="coRehabPhase" data-n="-1">Back a phase</button>` : ''}<button class="link" data-act="coRehabPhase" data-n="0" style="color:var(--muted)">End rehab</button></div>` : ''}</section>
      <section class="card stack"><div class="between"><h2>Daily tasks</h2><button class="link" data-act="coTasks">Set</button></div><p class="small ${tasks.length ? '' : 'muted'}">${tasks.length ? esc(tasks.join(' · ')) : 'None set.'}${c.kind === 'me' && st.tasksTot ? ' Today: ' + st.tasksDone + ' of ' + st.tasksTot + '.' : ''}</p></section>
      ${cgPhasesCard(c)}${cgCkPlanCard(c)}${cgListCards(c)}<section class="card stack"><div class="between"><h2>Nutrition targets</h2><button class="link" data-act="coTargets">Set</button></div><p class="small ${tg ? '' : 'muted'}">${tg ? (c.kind === 'live' ? esc(tgWords(tg)) : fmt(tg.k) + ' kcal · ' + tg.p + ' g protein') : 'None set.'}</p></section>`;
  } else if (CT === 'sess') {
    const ss = c.kind === 'me' ? TR.sess : rec.sess || [],
      lf = c.kind === 'me' ? TR.lifts : rec.lifts || {},
      prs = Object.entries(lf)
        .filter(([id, L]) => L.pr && isLift(id))
        .sort((x, y) => y[1].pr - x[1].pr)
        .slice(0, 6);
    body = `${own ? `<div class="two"><button class="btn sm ghost" data-act="coQuick">${ic('play', 'fill')} Quick session</button><button class="btn sm ghost" data-act="coLogSess">${ic('edit')} Add one by hand</button></div>` : ''}
      <section class="card"><h2>Sessions</h2>${
        ss.length
          ? ss
              .slice(0, 14)
              .map(
                (s, k) =>
                  `<button class="entry" data-act="${c.kind === 'me' ? 'sessView' : 'coSess'}" data-id="${c.kind === 'me' ? s.id : k}"><span class="n">${esc(s.n)}</span><span class="k muted small">${s.dur} min</span><span class="s">${niceDate(s.d)}${s.sets ? ' · ' + s.sets + ' sets' : ''}${s.vol ? ' · ' + fmt(s.vol) + ' kg' : ''}${s.prs ? ' · ' + s.prs + ' record' + (s.prs === 1 ? '' : 's') : ''}</span></button>`,
              )
              .join('')
          : `<p class="empty">No sessions logged yet.</p>`
      }</section>
      <section class="card"><h2>Strongest lifts</h2>${prs.length ? prs.map(([id, L]) => `<div class="entry" style="cursor:default"><span class="n">${esc(exn(id))}</span><span class="k">${r0(L.pr)} kg</span><span class="s">Estimated one-rep max${L.last && L.last[0] ? ' · last ' + L.last[0][0] + ' kg × ' + L.last[0][1] : ''}</span></div>`).join('') : `<p class="empty">Records appear once weighted sets are logged.</p>`}</section>`;
  } else if (CT === 'photos') {
    body = clientPhotos(c);
  } else {
    const log = (c.notes || [])
        .map(n => ({ ...n, w: 'Note' }))
        .sort((x, y) => (x.d < y.d ? 1 : -1))
        .slice(0, 10),
      cks = rec.checks || [],
      th = threadOf(c),
      lm = th[th.length - 1],
      un = unreadFrom(c);
    body = `<button class="pstrip ${un ? 'hot' : ''}" data-act="chat" data-id="${c.id}">${ic('chat')}<span class="grow" style="min-width:0"><b>${un ? un + ' unread from ' + esc(first) : 'Messages'}</b><small class="ell">${lm ? esc((lm.f === 'c' ? 'You: ' : first + ': ') + lm.t) : 'Start the thread with ' + esc(c.kind === 'me' ? 'yourself' : first)}</small></span>${un ? `<span class="pill bad">${un}</span>` : ic('chev-r')}</button>
      <section class="card stack"><h2>Private notes</h2><textarea class="inp" id="ccMsg" style="min-height:72px" placeholder="Only you see these"></textarea>
        <button class="btn sm" data-act="coSend" data-as="note" style="align-self:flex-start">Save note</button>
        ${log.map(m => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc(m.t)}</span><span class="k"></span><span class="s">${niceDate(m.d)}</span></div>`).join('')}</section>
      ${
        own
          ? `<section class="card stack"><div class="between"><h2>Check-ins</h2><button class="btn sm ghost" data-act="coCheckin">${ic('plus')} Log one</button></div>${
              cks.length
                ? cks
                    .slice(0, 8)
                    .map(
                      k =>
                        `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc([k.sess != null ? k.sess + ' sessions on their own' : '', k.kg != null ? k.kg + ' kg' : '', k.ready != null ? 'recovery ' + k.ready : '', k.pain != null ? 'pain ' + k.pain + '/10' : '', k.kcal != null ? fmt(k.kcal) + ' kcal a day' : ''].filter(Boolean).join(' · ') || 'Check-in')}</span><span class="k"></span><span class="s" style="white-space:normal">${niceDate(k.d)}${k.note ? ' · ' + esc(k.note) : ''}</span></div>`,
                    )
                    .join('')
                : `<p class="small muted">Log what ${esc(first)} tells you each week: sessions done alone, weight, how they feel.</p>`
            }</section>
      <button class="btn ghost" data-act="coRemove">${ic('trash')} Remove ${esc(first)}</button>`
          : ''
      }`;
  }
  b.innerHTML = head + body;
}

/* ---------- running the client's plan ---------- */
A.coStart = () => {
  const c = CO.clients[CC],
    d = c.prog.days[(c.progAt || 0) % c.prog.days.length];
  startSession(d.n, d.items, { client: c.id, progId: 'client' });
};
A.coQuick = () => startSession('Session', [], { client: CC });
A.coRehabGo = () => {
  const c = CO.clients[CC],
    rp = rehabPlan(c.rehab.id),
    ph = rp.phases[c.rehab.phase];
  startSession(rp.n + ': ' + ph.n, ph.items, { kind: 'rehab', client: c.id });
};
A.coRehabPhase = ({ n }) => {
  const c = CO.clients[CC],
    rp = rehabPlan(c.rehab.id);
  if (+n === 0) c.rehab = null;
  else c.rehab.phase = clamp(c.rehab.phase + +n, 0, rp.phases.length - 1);
  saveCO();
  renderClient();
  render();
};
A.coEditProg = () => {
  const c = CO.clients[CC];
  openEditor({ kind: 'client', cid: c.id, p: clone({ id: 'client', n: c.prog.n, days: c.prog.days }) });
};
function planText(c) {
  const L = [c.name + ': ' + c.prog.n, ''];
  c.prog.days.forEach(d => {
    L.push(d.n + (d.focus ? ' (' + d.focus + ')' : ''));
    d.items.forEach((it, k) =>
      L.push(
        k +
          1 +
          '. ' +
          exn(it) +
          ': ' +
          it.sets +
          ' x ' +
          it.reps +
          (it.rest ? ', rest ' + it.rest + ' s' : '') +
          (it.note ? ' (' + it.note + ')' : ''),
      ),
    );
    L.push('');
  });
  if (c.t) L.push('Daily targets: ' + fmt(c.t.k) + ' kcal, ' + c.t.p + ' g protein');
  if (c.rehab) {
    const rp = rehabPlan(c.rehab.id);
    if (rp) {
      L.push('', 'Rehab, ' + rp.n + ', phase ' + (c.rehab.phase + 1) + ': ' + rp.phases[c.rehab.phase].n);
      rp.phases[c.rehab.phase].items.forEach(it =>
        L.push('- ' + exn(it) + ': ' + it.sets + ' x ' + it.reps + (it.note ? ' (' + it.note + ')' : '')),
      );
    }
  }
  return L.join('\n').trim();
}
async function copyText(t, okMsg) {
  try {
    await navigator.clipboard.writeText(t);
    toast(okMsg);
  } catch (e) {
    openSheet(
      `${sh('Copy this')}<div class="sheet-b"><textarea class="inp" style="min-height:300px" readonly>${esc(t)}</textarea><p class="small muted">Copying is blocked in this view, so select the text and copy it yourself.</p></div>`,
      true,
    );
  }
}
A.coCopyPlan = () => copyText(planText(CO.clients[CC]), 'Plan copied. Paste it into a message.');
A.coSess = ({ id }) => {
  const s = CO.clients[CC].sess[+id];
  sessSheet(s);
  SV = { ...s, client: CC };
};
A.coWeigh = () => {
  const c = CO.clients[CC],
    l = (c.wts || [])[(c.wts || []).length - 1];
  openSheet(
    `${sh('Weigh-in for ' + c.name)}<div class="sheet-b"><div class="grid2"><label class="f">Weight in kg<input class="inp" id="cwK" inputmode="decimal" value="${l ? l.kg : ''}"></label><label class="f">Date<input class="inp" id="cwD" type="date" value="${today()}" max="${today()}"></label></div></div><div class="sheet-f"><button class="btn" data-act="coWeighSave">Save</button></div>`,
  );
};
function addClientWeight(c, d, kg) {
  c.wts = (c.wts || [])
    .filter(w => w.d !== d)
    .concat([{ d, kg }])
    .sort((x, y) => (x.d < y.d ? -1 : 1))
    .slice(-200);
}
A.coWeighSave = () => {
  const kg = r1(num($('#cwK').value)),
    d = $('#cwD').value || today();
  if (kg < 25 || kg > 400) return toast('Enter a weight in kilograms.');
  const c = CO.clients[CC];
  addClientWeight(c, d, kg);
  c.ev = [{ d, k: 'scale', s: 'Weighed in at ' + kg + ' kg' }].concat(c.ev || []).slice(0, 12);
  saveCO();
  closeSheet();
  renderClient();
  render();
};
A.coLogSess = () => {
  openSheet(
    `${sh('Add a session')}<div class="sheet-b"><label class="f">What it was<input class="inp" id="clN" placeholder="Gym session, 5 km run, match" autocomplete="off"></label><div class="grid2"><label class="f">Minutes<input class="inp" id="clM" inputmode="numeric" value="45"></label><label class="f">Date<input class="inp" id="clD" type="date" value="${today()}" max="${today()}"></label></div></div><div class="sheet-f"><button class="btn" data-act="coLogSessSave">Save</button></div>`,
  );
};
A.coLogSessSave = () => {
  const c = CO.clients[CC],
    n = $('#clN').value.trim() || 'Session',
    dur = clamp(r0(num($('#clM').value, 45)), 1, 600),
    d = $('#clD').value || today();
  c.sess = (c.sess || [])
    .concat([{ id: 'h' + newId(), d, n: n.slice(0, 50), dur, vol: 0, sets: 0, prs: 0, kind: 'train', rpe: 6 }])
    .sort((x, y) => (x.d < y.d ? 1 : -1))
    .slice(0, 40);
  c.ev = [{ d, k: 'dumbbell', s: 'Finished ' + n + ', ' + dur + ' min' }].concat(c.ev || []).slice(0, 12);
  saveCO();
  closeSheet();
  renderClient();
  render();
};
A.coCheckin = () => {
  const r = CO.clients[CC],
    st = clientStatus(r);
  const f = (id, l, v, ph) =>
    `<label class="f">${l}<input class="inp" id="${id}" inputmode="decimal" value="${v ?? ''}" placeholder="${ph || ''}"></label>`;
  openSheet(
    `${sh('Check-in for ' + r.name)}<div class="sheet-b"><div class="grid2">${f('ckS', 'Sessions done on their own', '', 'this week')}${f('ckW', 'Weight, kg', st.kg)}${f('ckR', 'Recovery, 0 to 100', '')}${f('ckP', 'Pain, 0 to 10', '', 'if in rehab')}${f('ckK', 'Average kcal a day', '')}${f('ckL', 'Days of food logged', '')}</div><label class="f">What they said<input class="inp" id="ckN" placeholder="Good week, missed Thursday" autocomplete="off"></label></div><div class="sheet-f"><button class="btn" data-act="coCheckinSave">Save check-in</button></div>`,
  );
};
A.coCheckinSave = () => {
  const r = CO.clients[CC],
    st = r.st,
    v = id => {
      const x = $(id).value.trim();
      return x === '' ? null : num(x);
    };
  const ck = {
    d: today(),
    sess: v('#ckS'),
    kg: v('#ckW'),
    ready: v('#ckR'),
    pain: v('#ckP'),
    kcal: v('#ckK'),
    logged: v('#ckL'),
    note: $('#ckN').value.trim().slice(0, 160),
  };
  if (ck.sess != null) ck.sess = r0(ck.sess);
  if (ck.kg != null) {
    ck.kg = r1(ck.kg);
    if (ck.kg >= 25 && ck.kg <= 400) addClientWeight(r, today(), ck.kg);
  }
  if (ck.pain != null) {
    st.painPrev = st.pain ?? null;
    st.pain = r0(ck.pain);
  }
  st.ready = ck.ready == null ? null : r0(ck.ready);
  if (ck.kcal != null) st.kcalAvg = r0(ck.kcal);
  if (ck.logged != null) st.logged7 = r0(ck.logged);
  st.upd = today();
  delete st.updAgo;
  r.checks = [ck].concat(r.checks || []).slice(0, 30);
  r.ev = [
    {
      d: today(),
      k: 'edit',
      s:
        'Check-in' +
        (ck.sess != null ? ': ' + ck.sess + ' sessions' : '') +
        (ck.kg != null ? ', ' + ck.kg + ' kg' : '') +
        (ck.note ? '. ' + ck.note : ''),
    },
  ]
    .concat(r.ev || [])
    .slice(0, 12);
  saveCO();
  closeSheet();
  renderClient();
  render();
  toast('Check-in saved');
};

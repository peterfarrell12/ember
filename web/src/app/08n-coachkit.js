/* ================= the coach's kit, and the client's Coach space =================
   What a coach sets beyond a programme and targets, and where the client sees it. Every part has two sides:
   the coach sets it from the client's page (or for everyone at once), and the client finds it in their Coach
   space, opened from the coach's name in the header.

   Parts, each sent with what the coach sets (pushAssign) and kept in the client's app under P.co:
     phases   a roadmap of named phases with targets, and the coach's note and milestone for each week
     habits   habits to tick each day
     supps    a supplement list
     steps    a daily step target and cardio
     vault    links and notes the coach shares with every client
     recipes  recipes from the coach's own book
     menu     a menu of the week, shown to each client at their own calorie level
   The figures a coach sees against these come from the weekly summaries the client's app writes. */

/* ---------- weekly summaries: written by the client's app ---------- */
async function cgWeeksSend() {
  const l = CG.coach;
  if (!coached() || DEMO) return;
  CG.wkSent = CG.wkSent || {};
  const p = activeProg(),
    api = await cgApi(),
    days = await cgRecentDays(),
    hb = (P.co && P.co.habits) || {},
    hs = (hb.list || []).map(h => h.id),
    hbFrom = hb.v ? dkey(new Date(hb.v)) : ''; // only days since the coach set them count
  for (const week of [addDays(ckWeek(), -7), ckWeek()]) {
    // habits: ticks out of the habits there were to tick on the days of that week so far
    const dates = Array.from({ length: 7 }, (x, i) => addDays(week, i)).filter(d => d <= today() && d >= hbFrom),
      habits = {
        done: dates.reduce((n, d) => n + hs.filter(id => ((days[d] || {}).hb || {})[id]).length, 0),
        of: hs.length * dates.length,
      };
    const data = weekSummary(
        { week, hist: P.hist, wts: P.wts, sess: TR.sess, planned: p ? p.days.length : 0, habits },
        l.share,
      ),
      key = JSON.stringify(data);
    if (CG.wkSent[week] === key) continue;
    try {
      await api.weekPut(week, data);
      CG.wkSent[week] = key;
    } catch (e) {}
  }
}
/* the same summary for any week of the person's own data, for their own roadmap */
const myWeek = week => {
  const p = activeProg();
  return weekSummary(
    { week, hist: P.hist, wts: P.wts, sess: TR.sess, planned: p ? p.days.length : 0 },
    { food: true, training: true, weight: true, recovery: true },
  );
};

/* ---------- messages between real accounts: one conversation per link, delivered in seconds ---------- */
async function cgMsgs() {
  if (!coachingOn() || DEMO) return;
  try {
    const rows = await (await cgApi()).messagesAll(CG.mid || 0);
    if (!rows.length) return;
    CG.mid = rows[rows.length - 1].id;
    let mine = false,
      theirs = false;
    for (const m of rows) {
      const msg = { id: 'm' + m.id, t: m.body, ts: Date.parse(m.created_at) };
      if (CG.coach && m.link_id === CG.coach.id) {
        const th = myThread();
        if (th.some(x => x.id === msg.id)) continue;
        P.thread = th.concat([{ ...msg, f: m.mine ? 'u' : 'c' }]).slice(-CHAT_MAX);
        mine = true;
      } else {
        const l = CG.clients.find(x => x.id === m.link_id);
        if (!l || !l.client_id) continue;
        const r = recOf('u:' + l.client_id),
          th = r.thread || [];
        if (th.some(x => x.id === msg.id)) continue;
        r.thread = th.concat([{ ...msg, f: m.mine ? 'c' : 'u' }]).slice(-CHAT_MAX);
        theirs = true;
      }
    }
    if (mine) saveProfile();
    if (theirs) saveCO();
    if ($('#chBody')) renderChat();
    else if ((mine || theirs) && !sheets.length && S.ready) render();
  } catch (e) {}
}
/* send on the link; returns false (with a message) if it did not go */
async function cgSendMsg(linkId, text) {
  try {
    await (await cgApi()).send(linkId, text);
    await cgMsgs();
    return true;
  } catch (e) {
    toast('That message did not send. Check your connection and try again.');
    return false;
  }
}

/* a date inside a sentence: "today" and "yesterday" in lower case, a plain date otherwise */
const inDate = k => (n => (/^(Today|Yesterday|Tomorrow)$/.test(n) ? n.toLowerCase() : n))(niceDate(k));
/* the day a week or a phase starts: 23 Nov, with the year when it is not this one */
const wkDate = k => {
  const d = pdate(k);
  return (
    d.getDate() +
    ' ' +
    MONTHS[d.getMonth()].slice(0, 3) +
    (d.getFullYear() === pdate(today()).getFullYear() ? '' : ' ' + d.getFullYear())
  );
};

/* ---------- measurements: the person's own, shared with a coach as part of weight ---------- */
const MEAS = ['Waist', 'Hips', 'Chest', 'Thigh', 'Arm'];
function measAdd(vals) {
  const v = Object.fromEntries(Object.entries(vals).filter(([, x]) => x > 0 && x < 400));
  if (!Object.keys(v).length) return;
  P.meas = (P.meas || [])
    .filter(m => m.d !== today())
    .concat([{ d: today(), v: { ...((P.meas || []).find(m => m.d === today()) || {}).v, ...v } }])
    .slice(-200);
}
A.measSheet = () => {
  const last = (P.meas || []).slice(-1)[0];
  openSheet(
    `${sh('Measurements')}<div class="sheet-b"><p class="small muted">In centimetres. Fill in the ones you take; leave the rest.${coached() && CG.coach.share.weight ? ' Your coach sees these because you share weight with them.' : ''}</p>
    <div class="grid2">${MEAS.map(m => `<label class="f">${m}<input class="inp" id="ms${m}" inputmode="decimal" placeholder="${last && last.v[m] ? last.v[m] : ''}"></label>`).join('')}</div>
    ${measTable(P.meas || [])}</div><div class="sheet-f"><button class="btn" data-act="measSave">Save today's</button></div>`,
    true,
  );
};
A.measSave = () => {
  const vals = Object.fromEntries(MEAS.map(m => [m, r1(num($('#ms' + m).value))]));
  if (!Object.values(vals).some(x => x > 0)) return toast('Enter at least one measurement.');
  measAdd(vals);
  saveProfile();
  lastPub = 0;
  publishStatus();
  closeSheet();
  toast('Measurements saved.');
};
function measTable(list) {
  if (!list.length) return '';
  const keys = [...new Set(list.flatMap(m => Object.keys(m.v)))].slice(0, 6),
    rows = list.slice(-6).reverse();
  return `<div class="card" style="padding:6px 14px;overflow-x:auto"><table class="mini"><tr><th></th>${keys.map(k => `<th>${esc(k)}</th>`).join('')}</tr>${rows.map(m => `<tr><td class="muted">${niceDate(m.d)}</td>${keys.map(k => `<td>${m.v[k] != null ? m.v[k] : ''}</td>`).join('')}</tr>`).join('')}</table></div>`;
}
/* latest weigh-in, and the last seven days' average, high and low */
function weightStats(wts) {
  const w = (wts || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!w.length) return null;
  const from = addDays(today(), -6),
    wk = w.filter(x => x.d >= from).map(x => x.kg);
  return {
    latest: w[w.length - 1],
    avg: wk.length ? r1(wk.reduce((a, b) => a + b, 0) / wk.length) : null,
    high: wk.length ? Math.max(...wk) : null,
    low: wk.length ? Math.min(...wk) : null,
    n: wk.length,
  };
}

/* ================= the coach's side ================= */
/* ---------- the client overview: engagement, the last four weeks, physique ---------- */
async function cgWeeksLoad(c) {
  if (!c || !c.link) return;
  CG.wk = CG.wk || {};
  try {
    CG.wk[c.link] = await (await cgApi()).weeks(c.link, 60);
    if ($('#ccBody') && CC === c.id) renderClient();
  } catch (e) {}
}
const engOf = c => {
  const seen = new Set(),
    link = CG.clients.find(l => l.id === c.link) || {};
  return engagement({
    share: c.share,
    st: c.st,
    weeks: (CG.wk || {})[c.link] || [],
    checkins: ((CG.ck || {})[c.link] || [])
      .concat((CG.inbox2 || []).filter(k => k.link_id === c.link))
      .filter(k => !seen.has(k.id) && seen.add(k.id)),
    schedule: (CO.clients[c.id] || {}).ck || null,
    thisWeek: ckWeek(),
    today: today(),
    since: link.accepted_at ? dkey(new Date(link.accepted_at)) : '',
  });
};
/* on the Clients list: only the two states that ask for a look */
const engPill = c => {
  if (!coachingOn() || c.kind !== 'live' || !c.link || c.paused) return '';
  const e = engOf(c);
  return e.state === 'Slipping'
    ? '<span class="pill gold">Slipping</span>'
    : e.state === 'Behind'
      ? '<span class="pill bad">Behind</span>'
      : '';
};
/* weight has held for three weeks: what that says about their intake, for the coach to weigh up */
function cgStallCard(c, weeks) {
  const ph = (CO.clients[c.id] || {}).phases,
    now = ph && phaseNow(ph),
    goalKg = num((String(c.goal || '').match(/([\d.]+) kg/) || [])[1]),
    kg = c.st && c.st.kg,
    direction = goalKg && kg ? (goalKg < kg - 0.5 ? 'lose' : goalKg > kg + 0.5 ? 'gain' : '') : '',
    s = stall({ weeks, thisWeek: ckWeek(), rate: (now && now.rate) || 0, direction });
  if (!s) return '';
  return `<section class="card stack" style="border-color:var(--gold)"><div class="between"><h2>Weight has held for three weeks</h2>${srcBadge('AI')}</div>
    <p class="small">Weekly averages went from ${s.from} kg to ${s.to} kg while they logged about ${fmt(s.kcal)} kcal a day. That makes ${fmt(s.kcal)} roughly what holds their weight steady, if the logging is complete.</p>
    ${
      !s.suggest
        ? `<p class="small muted">Set a rate for the current phase and a goal weight to see what a change would work out to.</p>`
        : s.suggest < 1200
          ? `<p class="small">The ${now.rate} kg a week this phase aims for would work out below 1,200 kcal a day, which is lower than Ember will suggest. A slower rate, more activity or a spell at maintenance are the other options.</p>`
          : `<p class="small">For the ${now.rate} kg a week this phase aims for, that works out at about <b>${fmt(s.suggest)} kcal a day</b>.</p>`
    }
    <p class="tiny muted">Worked out from their figures, not measured. Check the logging and how they feel before changing anything; it is your call.</p>
    <button class="btn sm ghost" data-act="coTargets" style="align-self:flex-start">Open their targets</button></section>`;
}
const ENG_TONE = { 'On track': 'good', Slipping: 'gold', Behind: 'bad' };
function cgClientEngage(c) {
  if (c.kind !== 'live' || !c.link || c.paused) return '';
  const weeks = (CG.wk || {})[c.link];
  if (weeks === undefined) {
    cgWeeksLoad(c);
    return '';
  }
  const e = engOf(c),
    v = c.view && c.view.profile,
    ws = v && weightStats(v.wts),
    last4 = weeks.slice(-4).reverse();
  // a figure, "none" when the area is shared but the week has nothing, "not shared" when it is not shared
  const off = '<span class="muted">not shared</span>',
    none = '<span class="muted">none</span>',
    wkRow = d => {
      const food = d.days != null,
        wt = d.weighs != null,
        tr = d.sess != null;
      return [
        food ? (d.days ? fmt(d.kcal) : none) : off,
        food ? (d.days ? d.prot + ' g' : none) : off,
        wt ? (d.weighs ? d.kg + ' kg' : none) : off,
        tr ? d.sess + (d.plan ? ' of ' + d.plan : '') : off,
        d.steps ? fmt(d.steps) : tr || c.share.recovery ? none : off,
        d.hab ? d.hab.done + ' of ' + d.hab.of : '',
      ]
        .map(x => `<td>${x}</td>`)
        .join('');
    };
  return `${cgStallCard(c, weeks)}<section class="card stack"><div class="between"><h2>Engagement</h2>${e.score == null ? '<span class="pill">Not enough yet</span>' : `<span class="pill ${ENG_TONE[e.state] || ''}">${e.state}</span>`}</div>
    ${e.score == null ? `<p class="small muted">Nothing to judge yet: this fills in from what they share and what you have asked for.</p>` : `<div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:38px;line-height:1">${e.score}</span><span class="muted small">out of 100, from what you asked for and they share</span></div>${e.parts.map(p => `<div><div class="between small"><span>${p.label}</span><b class="tn">${p.done} of ${p.of}</b></div><div class="bar ${p.done / p.of >= 0.8 ? 'good' : ''}" style="margin-top:4px"><i style="width:${Math.round((p.done / p.of) * 100)}%"></i></div></div>`).join('')}`}</section>
    ${
      last4.length
        ? `<section class="card" style="overflow-x:auto"><h2>The last weeks</h2><table class="mini" style="margin-top:8px"><tr><th>Week of</th><th>kcal</th><th>Protein</th><th>Weight</th><th>Sessions</th><th>Steps</th><th>Habits</th></tr>${last4.map(w => `<tr><td class="muted">${wkDate(w.week)}</td>${wkRow(w.data)}</tr>`).join('')}</table></section>`
        : ''
    }
    ${
      ws
        ? `<section class="card stack"><h2>Physique</h2><div class="stat4"><div class="stat"><div class="num">${ws.latest.kg} kg</div><span>Latest, ${inDate(ws.latest.d)}</span></div><div class="stat"><div class="num">${ws.avg == null ? 'n/a' : ws.avg + ' kg'}</div><span>7-day average${ws.n ? ', ' + ws.n + ' weigh-in' + (ws.n === 1 ? '' : 's') : ''}</span></div><div class="stat"><div class="num">${ws.high == null ? 'n/a' : ws.high + ' kg'}</div><span>7-day high</span></div><div class="stat"><div class="num">${ws.low == null ? 'n/a' : ws.low + ' kg'}</div><span>7-day low</span></div></div>${measTable((v && v.meas) || [])}</section>`
        : ''
    }`;
}

/* ---------- the inbox: every client's check-ins in one place ---------- */
function cgInboxCard() {
  if (!coachingOn()) return '';
  const rows = CG.inbox2 || [],
    name = id => {
      const l = CG.clients.find(x => x.id === id);
      return l ? l.client_name || 'Client' : '';
    };
  const toAnswer = rows.filter(k => !k.feedback && k.kind !== 'self' && name(k.link_id)).slice(0, 8);
  // overdue: a check-in is set, its day has passed this week, and nothing has come in for the period
  const overdue = clientList()
    .filter(c => c.kind === 'live' && c.link && !c.paused)
    .map(c => {
      const f = (CO.clients[c.id] || {}).ck;
      if (!f || !f.qs || !f.qs.length) return null;
      const last = rows
          .filter(k => k.link_id === c.link && k.kind === 'checkin')
          .map(k => k.week)
          .sort()
          .pop(),
        late = weeksSince(last) >= (f.every || 1) && wdOf(today()) > (f.wd || 0) + 1;
      return late ? { c, last } : null;
    })
    .filter(Boolean);
  if (!toAnswer.length && !overdue.length) return '';
  return `<section class="card"><h2>Check-ins</h2>${toAnswer
    .map(
      k =>
        `<button class="entry" data-act="cgInboxOpen" data-link="${k.link_id}" data-id="${k.id}"><span class="n">${esc(name(k.link_id))}</span><span class="k"><span class="pill gold">To answer</span></span><span class="s">${esc(ckLabel(k))}</span></button>`,
    )
    .join('')}${overdue
    .map(
      ({ c, last }) =>
        `<button class="entry" data-act="coClient" data-id="${c.id}"><span class="n">${esc(c.name)}</span><span class="k"><span class="pill bad">Overdue</span></span><span class="s">${last ? 'Last check-in the week of ' + wkDate(last) : 'No check-in yet'}</span></button>`,
    )
    .join('')}</section>`;
}
A.cgInboxOpen = async ({ link, id }) => {
  const c = clientList().find(x => x.link === link);
  if (!c) return;
  A.coClient({ id: c.id });
  await cgCkLoad(c);
  A.cgCkOpen({ id });
};

/* ---------- phases: a roadmap for one client ---------- */
const PH_START = [
  { n: 'Ignite', why: 'Build the routine: training days, logging and sleep.', w: 4 },
  { n: 'Transform', why: 'The main block of work towards the goal.', w: 12 },
  { n: 'Thrive', why: 'Hold the result and loosen the reins.', w: 8 },
];
/* each phase with its start and end, laid end to end from the roadmap's start */
function phaseDates(ph) {
  let at = ph.start || ckWeek();
  return (ph.list || []).map(p => {
    const from = at,
      to = addDays(at, 7 * (p.w || 1) - 1);
    at = addDays(to, 1);
    return { ...p, from, to };
  });
}
const phaseNow = ph => phaseDates(ph).find(p => today() >= p.from && today() <= p.to) || null;
const phTargets = p =>
  [
    p.k ? fmt(p.k) + ' kcal' : '',
    p.p ? p.p + ' g protein' : '',
    p.steps ? fmt(p.steps) + ' steps' : '',
    p.sess ? p.sess + ' sessions a week' : '',
    p.rate ? p.rate + ' kg a week' : '',
  ]
    .filter(Boolean)
    .join(', ');
function cgPhasesCard(c) {
  if (c.kind !== 'live' || !c.link) return '';
  const ph = (CO.clients[c.id] || {}).phases,
    now = ph && phaseNow(ph);
  return `<section class="card stack"><div class="between"><h2>Phases</h2><button class="link" data-act="rmEdit">${ph ? 'Change' : 'Build'}</button></div>${
    ph
      ? `<p class="small muted">${ph.list.length} phase${ph.list.length === 1 ? '' : 's'} from ${wkDate(ph.start)}. ${now ? 'Now: ' + esc(now.n) + '.' : 'Not in a phase today.'}</p><button class="btn sm ghost" data-act="rmView" style="align-self:flex-start">Open the roadmap</button>`
      : `<p class="small muted">Lay out the year in named phases, each with its purpose and targets. Each finished week fills in with their averages, and you add a note or mark a milestone. They see the roadmap in their app.</p>`
  }</section>`;
}
let PHX = null;
A.rmEdit = () => {
  const c = getClient(CC),
    cur = (CO.clients[c.id] || {}).phases;
  PHX = cur
    ? clone(cur)
    : { start: ckWeek(), list: clone((CO.phaseTpl || PH_START).map(p => ({ id: newId(), ...p }))), notes: {} };
  openSheet(
    `${sh('Phases for ' + c.name)}<div class="sheet-b" id="rmBody"></div><div class="sheet-f"><button class="btn ghost" data-act="rmTpl">Save as my template</button><button class="btn" data-act="rmSave">Save and send</button></div>`,
    true,
  );
  peDraw();
};
function peKeep() {
  if (!$('#rmStart')) return;
  PHX.start = weekStart($('#rmStart').value || ckWeek());
  PHX.list.forEach((p, i) => {
    p.n = $('#rmN' + i)
      .value.trim()
      .slice(0, 30);
    p.why = $('#rmY' + i)
      .value.trim()
      .slice(0, 200);
    p.w = clamp(r0(num($('#rmW' + i).value)), 1, 104);
    for (const k of ['k', 'p', 'steps', 'sess']) p[k] = r0(num($('#rm' + k + i).value)) || 0;
    p.rate = r1(num($('#rmrate' + i).value)) || 0;
  });
}
function peDraw() {
  const b = $('#rmBody');
  if (!b) return;
  const f = (i, k, label, v, ph) =>
    `<label class="f">${label}<input class="inp" id="rm${k}${i}" inputmode="decimal" value="${v || ''}" placeholder="${ph}"></label>`;
  b.innerHTML = `<label class="f">The roadmap starts the week of<input class="inp" id="rmStart" type="date" value="${PHX.start}"></label>
    ${PHX.list
      .map(
        (p, i) =>
          `<div class="card stack" style="gap:8px"><div class="between"><b class="small">Phase ${i + 1}</b><button class="icon-btn" data-act="rmDel" data-i="${i}" aria-label="Remove phase ${i + 1}">${ic('x')}</button></div>
          <div class="two"><input class="inp" id="rmN${i}" maxlength="30" value="${esc(p.n)}" placeholder="Name" aria-label="Name of phase ${i + 1}"><label class="row" style="gap:8px"><input class="inp" id="rmW${i}" inputmode="numeric" value="${p.w}" style="max-width:80px" aria-label="Weeks in phase ${i + 1}"><span class="muted small">weeks</span></label></div>
          <input class="inp" id="rmY${i}" maxlength="200" value="${esc(p.why || '')}" placeholder="What this phase is for" aria-label="Purpose of phase ${i + 1}">
          <div class="grid3">${f(i, 'k', 'kcal', p.k, 'optional')}${f(i, 'p', 'Protein g', p.p, '')}${f(i, 'steps', 'Steps', p.steps, '')}</div><div class="two">${f(i, 'sess', 'Sessions a week', p.sess, '')}${f(i, 'rate', 'kg a week', p.rate, 'for example 0.5')}</div></div>`,
      )
      .join('')}
    <button class="addline" data-act="rmAdd">${ic('plus')} Add a phase</button>
    <p class="tiny muted">Dates run on from the start, one phase after another. The targets here are what you are aiming for in the phase; they show on the roadmap, and do not change the client's daily targets until you send those.</p>`;
}
A.rmAdd = () => {
  peKeep();
  if (PHX.list.length >= 12) return toast('Twelve phases is the most a roadmap can hold.');
  PHX.list.push({ id: newId(), n: '', why: '', w: 4 });
  peDraw();
};
A.rmDel = ({ i }) => {
  peKeep();
  PHX.list.splice(+i, 1);
  peDraw();
};
A.rmTpl = () => {
  peKeep();
  CO.phaseTpl = PHX.list.map(({ n, why, w, k, p, steps, sess, rate }) => ({ n, why, w, k, p, steps, sess, rate }));
  saveCO();
  toast('Saved. New roadmaps start from this.');
};
A.rmSave = async () => {
  peKeep();
  PHX.list = PHX.list.filter(p => p.n);
  if (!PHX.list.length) return toast('Name at least one phase.');
  const c = getClient(CC);
  if (!(await pushAssign(c.uid, 'phases', PHX))) return;
  recOf(c.id).phases = clone(PHX);
  saveCO();
  closeSheet();
  renderClient();
  toast('Roadmap sent. They can see it in their app.', 'good');
};
/* the roadmap as both sides see it: `weeks` gives a week's figures, `edit` adds the coach's note buttons */
function roadmapHtml(ph, weekOf, edit) {
  const tk = today();
  return phaseDates(ph)
    .map(p => {
      const state = tk > p.to ? 'done' : tk >= p.from ? 'now' : 'next',
        wkN = state === 'now' ? Math.floor((pdate(tk) - pdate(p.from)) / 6048e5) + 1 : 0,
        rows = [];
      if (state !== 'next')
        for (let w = p.from; w <= p.to && w <= ckWeek(); w = addDays(w, 7)) {
          const d = weekOf(w) || {},
            note = (ph.notes || {})[w] || {},
            figs = [
              d.kg ? d.kg + ' kg' : '',
              d.kcal ? fmt(d.kcal) + ' kcal' + (p.k ? ' against ' + fmt(p.k) : '') : '',
              d.steps ? fmt(d.steps) + ' steps' + (p.steps ? ' against ' + fmt(p.steps) : '') : '',
              d.sess != null ? d.sess + ' session' + (d.sess === 1 ? '' : 's') + (p.sess ? ' of ' + p.sess : '') : '',
            ].filter(Boolean);
          rows.push(
            `<div style="padding:10px 0 2px;border-top:1px solid var(--line)"><div class="between" style="gap:8px"><b class="small">Week of ${wkDate(w)}${w === ckWeek() ? ' (so far)' : ''}</b><span class="row" style="gap:8px;flex-shrink:0">${note.ms === 'met' ? '<span class="pill good">Milestone met</span>' : note.ms === 'missed' ? '<span class="pill">Milestone missed</span>' : ''}${edit ? `<button class="link" data-act="rmNote" data-w="${w}">${note.t || note.ms ? 'Change' : 'Note'}</button>` : ''}</span></div><div class="small muted" style="margin-top:2px">${figs.join(' · ') || 'No figures for this week'}</div>${note.t ? `<p class="small" style="margin-top:6px"><b>${edit ? 'Your note' : 'From your coach'}:</b> ${esc(note.t)}</p>` : ''}</div>`,
          );
        }
      return `<section class="card stack" ${state === 'now' ? 'style="border-color:var(--ember)"' : ''}><div class="between"><h2>${esc(p.n)}</h2>${state === 'now' ? `<span class="pill gold">Now, week ${wkN} of ${p.w}</span>` : state === 'done' ? '<span class="pill good">Done</span>' : `<span class="pill">${p.w} weeks</span>`}</div>
        <div class="tiny muted">${wkDate(p.from)} to ${wkDate(p.to)}, as planned</div>${p.why ? `<p class="small">${esc(p.why)}</p>` : ''}${phTargets(p) ? `<p class="small muted">Aiming for ${esc(phTargets(p))}.</p>` : ''}${rows.reverse().join('')}</section>`;
    })
    .join('');
}
A.rmView = () => {
  const c = getClient(CC),
    ph = (CO.clients[c.id] || {}).phases;
  if (!ph) return;
  const wk = Object.fromEntries(((CG.wk || {})[c.link] || []).map(w => [w.week, w.data]));
  openSheet(
    `${sh(c.name.split(' ')[0] + "'s roadmap")}<div class="sheet-b" id="rmvBody">${roadmapHtml(ph, w => wk[w], true)}<p class="tiny muted">Weekly figures come from what they share. A week with nothing shared shows no figures.</p></div>`,
    true,
  );
};
A.rmNote = ({ w }) => {
  const c = getClient(CC),
    ph = (CO.clients[c.id] || {}).phases,
    note = (ph.notes || {})[w] || {};
  PHX = { w };
  openSheet(
    `${sh('Week of ' + wkDate(w))}<div class="sheet-b"><label class="f">A note for ${esc(c.name.split(' ')[0])}<textarea class="inp" id="pnT" rows="3" maxlength="400">${esc(note.t || '')}</textarea></label>
    <div class="f">Milestone for the week${segHtml(
      'pnMs',
      [
        ['', 'None'],
        ['met', 'Met'],
        ['missed', 'Missed'],
      ],
      note.ms || '',
    )}</div>
    <p class="tiny muted">They see this on their roadmap. Keep anything private in the Notes tab.</p></div><div class="sheet-f"><button class="btn" data-act="rmNoteSave">Save</button></div>`,
  );
};
SEG.pnMs = v => (PHX.ms = v);
A.rmNoteSave = async () => {
  const c = getClient(CC),
    ph = clone(recOf(c.id).phases),
    cur = (ph.notes || {})[PHX.w] || {};
  ph.notes = {
    ...(ph.notes || {}),
    [PHX.w]: { t: ($('#pnT').value || '').trim().slice(0, 400), ms: PHX.ms === undefined ? cur.ms || '' : PHX.ms },
  };
  if (!(await pushAssign(c.uid, 'phases', ph))) return;
  recOf(c.id).phases = ph;
  saveCO();
  closeSheet();
  closeSheet();
  A.rmView();
};

/* ---------- habits, supplements, steps: short lists a coach types ---------- */
const HABIT_START = [
  'Sit down for one meal without a screen | Noticing your food is the first step to enjoying it',
  'Pause halfway through a meal | Check in: still hungry, or just finishing the plate?',
  'Eat something you enjoy, on purpose | No food is off limits',
  'Drink a glass of water with each meal',
];
const LISTS = {
  habits: {
    title: 'Habits',
    lead: 'One habit on each line. Add a short reason after a bar if you want: Walk after dinner | Helps you wind down.',
    blank: 'Small things to tick off each day. They show on their Today screen.',
    parse: l => {
      const [n, why] = l.split('|').map(x => x.trim());
      return n ? { id: 'h' + hashStr(n), n: n.slice(0, 80), why: (why || '').slice(0, 140) } : null;
    },
    show: x => x.n + (x.why ? ' | ' + x.why : ''),
    starter: HABIT_START,
  },
  supps: {
    title: 'Supplements',
    lead: 'One on each line: name | amount | when. For example: Creatine | 5 g | with breakfast.',
    blank:
      'A list they can check each day. General guidance only: they are told to check with a doctor or pharmacist first.',
    parse: l => {
      const [n, amt, when] = l.split('|').map(x => x.trim());
      return n
        ? { id: 's' + hashStr(n), n: n.slice(0, 60), amt: (amt || '').slice(0, 40), when: (when || '').slice(0, 60) }
        : null;
    },
    show: x => [x.n, x.amt, x.when].filter(Boolean).join(' | '),
  },
};
const hashStr = t => {
  let h = 7;
  for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
};
function cgListCards(c) {
  if (c.kind !== 'live' || !c.link) return '';
  const rec = CO.clients[c.id] || {},
    card = k => {
      const cur = rec[k];
      return `<section class="card stack"><div class="between"><h2>${LISTS[k].title}</h2><button class="link" data-act="coList" data-k="${k}">${cur && cur.length ? 'Change' : 'Set'}</button></div><p class="small muted">${cur && cur.length ? cur.map(x => esc(x.n)).join(' · ') : LISTS[k].blank}</p></section>`;
    },
    st = rec.steps;
  const evs = (rec.calls || []).filter(e => e.d >= today()),
    resp = c.resp || {};
  return `${card('habits')}${card('supps')}<section class="card stack"><div class="between"><h2>Calls and events</h2><button class="link" data-act="coEv">Add</button></div>${
    evs.length
      ? evs
          .map(e => {
            const r = resp['ev' + e.id];
            return `<div class="between small"><span>${esc(e.t)}, ${shortDate(e.d)}${e.tm ? ' at ' + e.tm : ''}</span><span class="pill ${r ? (r.yes ? 'good' : '') : 'gold'}">${r ? (r.yes ? 'In their calendar' : 'Declined') : 'Offered'}</span></div>`;
          })
          .join('')
      : `<p class="small muted">Suggest a call, a review or an event. It goes into their calendar only if they accept.</p>`
  }</section><section class="card stack"><div class="between"><h2>Steps and cardio</h2><button class="link" data-act="coSteps">${st ? 'Change' : 'Set'}</button></div><p class="small muted">${st ? [st.goal ? fmt(st.goal) + ' steps a day' : '', st.cardio].filter(Boolean).map(esc).join(' · ') : 'A daily step target and any cardio you want done.'}</p></section>`;
}
let LK = '';
A.coList = ({ k }) => {
  const c = getClient(CC),
    cur = (CO.clients[c.id] || {})[k] || [],
    L = LISTS[k];
  LK = k;
  openSheet(
    `${sh(L.title + ' for ' + c.name)}<div class="sheet-b"><label class="f">${L.lead}<textarea class="inp" id="clT" rows="8" maxlength="2000">${esc(cur.map(L.show).join('\n'))}</textarea></label>${L.starter ? `<button class="link" data-act="coListStart" style="align-self:flex-start">Start from the mindful eating set</button>` : ''}<p class="tiny muted">Leave it empty to remove the list.</p></div><div class="sheet-f"><button class="btn" data-act="coListSave">Save and send</button></div>`,
    true,
  );
};
A.coListStart = () => ($('#clT').value = LISTS[LK].starter.join('\n'));
A.coListSave = async () => {
  const c = getClient(CC),
    list = ($('#clT').value || '').split('\n').map(LISTS[LK].parse).filter(Boolean).slice(0, 20);
  if (!(await pushAssign(c.uid, LK, { list }))) return;
  recOf(c.id)[LK] = list;
  saveCO();
  closeSheet();
  renderClient();
  toast(list.length ? LISTS[LK].title + ' sent.' : 'Removed.');
};
A.coEv = () => {
  const c = getClient(CC);
  openSheet(
    `${sh('A call or event for ' + c.name)}<div class="sheet-b"><label class="f">What is it<input class="inp" id="ceT" maxlength="60" value="Call with ${esc(P.coachName || 'your coach')}"></label><label class="f">Date<input class="inp" type="date" id="ceD" value="${addDays(today(), 1)}" min="${today()}"></label><div class="grid2"><label class="f">Time, optional<input class="inp" type="time" id="ceTm"></label><label class="f">Minutes<input class="inp" id="ceMin" inputmode="numeric" value="30"></label></div><p class="tiny muted">They are asked first. It goes into their calendar only if they accept, and you see their answer.</p></div><div class="sheet-f"><button class="btn" data-act="coEvSave">Offer it</button></div>`,
    true,
  );
};
A.coEvSave = async () => {
  const c = getClient(CC),
    d = $('#ceD').value,
    e = {
      id: newId(),
      t: ($('#ceT').value || '').trim().slice(0, 60) || 'Call',
      d,
      tm: /^\d\d:\d\d$/.test($('#ceTm').value) ? $('#ceTm').value : '',
      min: clamp(r0(num($('#ceMin').value)), 0, 600),
    };
  if (!/^\d{4}-\d\d-\d\d$/.test(d) || d < today()) return toast('Pick a date from today on.');
  const list = (recOf(c.id).calls || [])
    .filter(x => x.d >= today())
    .concat([e])
    .slice(-10);
  if (!(await pushAssign(c.uid, 'ev', { list }))) return;
  recOf(c.id).calls = list; // looked up again: the coach's records may have been re-read while that was sending
  saveCO();
  closeSheet();
  renderClient();
  toast('Offered. They will be asked.');
};
A.coSteps = () => {
  const c = getClient(CC),
    st = (CO.clients[c.id] || {}).steps || {};
  openSheet(
    `${sh('Steps and cardio for ' + c.name)}<div class="sheet-b"><label class="f">Steps a day<input class="inp" id="csG" inputmode="numeric" value="${st.goal || ''}" placeholder="7000"></label><label class="f">Cardio<input class="inp" id="csC" maxlength="120" value="${esc(st.cardio || '')}" placeholder="20 minutes easy after training"></label></div><div class="sheet-f"><button class="btn" data-act="coStepsSave">Save and send</button></div>`,
  );
};
A.coStepsSave = async () => {
  const c = getClient(CC),
    st = { goal: clamp(r0(num($('#csG').value)), 0, 60000), cardio: ($('#csC').value || '').trim().slice(0, 120) };
  if (!(await pushAssign(c.uid, 'steps', st))) return;
  recOf(c.id).steps = st.goal || st.cardio ? st : null;
  saveCO();
  closeSheet();
  renderClient();
  toast('Sent.');
};

/* ---------- for every client at once: the vault, recipes and the menu of the week ---------- */
const activeLinks = () => CG.clients.filter(l => l.client_id && l.status !== 'invited');
async function cgSendAll(part, val) {
  const api = await cgApi();
  let n = 0;
  for (const l of activeLinks())
    try {
      await api.assign(l.id, part, val);
      n++;
    } catch (e) {}
  return n;
}
/* what every client gets, sent again to someone who has just joined */
async function cgShareKit(api, linkId) {
  for (const k of ['vault', 'recipes', 'menu']) if (CO[k]) await api.assign(linkId, k, CO[k]).catch(() => {});
}
const safeUrl = u => {
  try {
    const x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '';
  } catch (e) {
    return '';
  }
};
A.coVault = () => {
  const cur = (CO.vault && CO.vault.list) || [];
  openSheet(
    `${sh('Your vault')}<div class="sheet-b"><p class="small">Guides, videos and files your clients can open any time: how to handle a night out, what a calorie is. One on each line: title | link | a line about it.</p>
    <label class="f">Items<textarea class="inp" id="vtT" rows="9" maxlength="6000" placeholder="Managing a night out | https://… | Ten minutes, watch before the weekend">${esc(cur.map(v => [v.t, v.url, v.note].filter(Boolean).join(' | ')).join('\n'))}</textarea></label>
    <p class="tiny muted">Every client you have, and each new one, sees these in their Coach space. Videos and files stay where you host them; Ember keeps the link.</p></div><div class="sheet-f"><button class="btn" data-act="coVaultSave">Save and share</button></div>`,
    true,
  );
};
A.coVaultSave = async () => {
  const list = ($('#vtT').value || '')
    .split('\n')
    .map(l => {
      const [t, url, note] = l.split('|').map(x => x.trim());
      return t
        ? {
            id: 'v' + hashStr(t + (url || '')),
            t: t.slice(0, 80),
            url: safeUrl(url || ''),
            note: (note || '').slice(0, 160),
          }
        : null;
    })
    .filter(Boolean)
    .slice(0, 60);
  CO.vault = { list };
  saveCO();
  const n = await cgSendAll('vault', CO.vault);
  closeSheet();
  render();
  toast(`Saved${n ? ' and shared with ' + n + ' client' + (n === 1 ? '' : 's') : ''}.`);
};
/* recipes from the coach's own book, and a menu of the week built from them */
A.coMenu = () => {
  const mine = Object.values(S.recipes),
    shared = new Set(((CO.recipes && CO.recipes.list) || []).map(r => r.id)),
    menu = (CO.menu && CO.menu.meals) || [];
  if (!mine.length) return toast('Add recipes of your own first, under My view, You, Recipes. Then share them here.');
  openSheet(
    `${sh('Recipes and menu of the week')}<div class="sheet-b"><div class="f">Recipes your clients can see<div class="stack" style="gap:6px;margin-top:6px">${mine.map(r => `<button class="chk" data-act="cgPageOpen" data-rid="${r.id}" aria-pressed="${shared.has(r.id) ? 'true' : 'false'}"><span class="tb"></span><span>${esc(r.n)}<small class="muted" style="display:block;font-weight:400">${fmt(perServing(r).k)} kcal a serving</small></span></button>`).join('')}</div></div>
    <div class="card stack"><h2>Menu of the week</h2><label class="f">Title<input class="inp" id="mnT" maxlength="60" value="${esc((CO.menu && CO.menu.title) || '')}" placeholder="A day of eating"></label>
    ${Object.entries(MEALS)
      .map(
        ([m, label]) =>
          `<label class="f">${label}<select class="inp" id="mn${m}"><option value="">None</option>${mine.map(r => `<option value="${r.id}" ${menu.some(x => x.m === m && x.rid === r.id) ? 'selected' : ''}>${esc(r.n)}</option>`).join('')}</select></label>`,
      )
      .join(
        '',
      )}<p class="tiny muted">Each client sees the day sized to their own calorie target, marked as an estimate.</p></div></div>
    <div class="sheet-f"><button class="btn" data-act="coMenuSave">Save and share</button></div>`,
    true,
  );
};
/* one serving of a recipe: its ingredients added up and shared out */
const perServing = r => {
  const t = recipeTotals(r),
    n = r.sv || 1;
  return { k: r0(t.k / n), p: r1(t.p / n), c: r1(t.c / n), f: r1(t.f / n) };
};
const recipeOut = r => ({
  id: r.id,
  n: r.n,
  sv: r.sv,
  items: r.items,
  per: perServing(r),
  ...(r.from ? { from: r.from, url: r.url } : {}),
});
A.coMenuSave = async () => {
  const picked = $$('.sheet [data-rid][aria-pressed="true"]')
    .map(b => S.recipes[b.dataset.rid])
    .filter(Boolean)
    .slice(0, 20);
  const meals = Object.keys(MEALS)
    .map(m => {
      const r = S.recipes[$('#mn' + m).value];
      return r ? { m, rid: r.id, n: r.n, k: perServing(r).k, p: perServing(r).p } : null;
    })
    .filter(Boolean);
  // a recipe on the menu is shared too, so a client can open it
  for (const x of meals) if (!picked.some(r => r.id === x.rid)) picked.push(S.recipes[x.rid]);
  CO.recipes = { list: picked.map(recipeOut) };
  CO.menu = meals.length
    ? {
        title: ($('#mnT').value || '').trim().slice(0, 60) || 'Menu of the week',
        meals,
        total: meals.reduce((s, x) => s + x.k, 0),
        d: today(),
      }
    : null;
  saveCO();
  await cgSendAll('recipes', CO.recipes);
  const n = await cgSendAll('menu', CO.menu || { meals: [] });
  closeSheet();
  render();
  toast(`Saved${n ? ' and shared with ' + n + ' client' + (n === 1 ? '' : 's') : ''}.`);
};
/* the coach's own shelf, on the Clients screen */
function cgKitCard() {
  if (!coachingOn()) return '';
  const v = ((CO.vault && CO.vault.list) || []).length,
    r = ((CO.recipes && CO.recipes.list) || []).length;
  return `<div class="grp">For all your clients</div><div class="two"><button class="act" data-act="cfForms">${ic('edit')}<span>Forms<small>Consultation, check-ins</small></span></button><button class="act" data-act="coVault">${ic('book')}<span>Vault<small>${v ? v + ' item' + (v === 1 ? '' : 's') : 'Guides and videos'}</small></span></button></div><div class="two"><button class="act" data-act="coMenu">${ic('fork')}<span>Recipes and menu<small>${r ? r + ' shared' : 'From your recipe book'}</small></span></button><button class="act" data-act="coAll">${ic('send')}<span>Message everyone<small>One note to each client</small></span></button></div>`;
}

/* one message to every client: each gets it in their own conversation, and replies come back there */
A.coAll = () => {
  const n = activeLinks().filter(l => l.status === 'active').length;
  if (!n) return toast('You have no clients sharing with you yet.');
  openSheet(
    `${sh('Message everyone')}<div class="sheet-b"><label class="f">Your message<textarea class="inp" id="caT" rows="5" maxlength="2000" autocapitalize="sentences" placeholder="No sessions on the bank holiday Monday. Back as normal on Tuesday."></textarea></label><p class="tiny muted">Goes to ${n} client${n === 1 ? '' : 's'}, each in their own conversation with you. Nobody sees who else received it.</p></div><div class="sheet-f"><button class="btn ember" data-act="coAllGo" id="caGo">Send to ${n}</button></div>`,
    true,
  );
};
A.coAllGo = async () => {
  const text = ($('#caT').value || '').trim();
  if (text.length < 2) return toast('Write the message first.');
  const go = $('#caGo'),
    api = await cgApi();
  go.disabled = true;
  let sent = 0;
  for (const l of activeLinks().filter(x => x.status === 'active'))
    try {
      await api.send(l.id, text);
      sent++;
    } catch (e) {}
  await cgMsgs();
  closeSheet();
  toast(
    sent
      ? `Sent to ${sent} client${sent === 1 ? '' : 's'}.`
      : 'That did not send. Check your connection and try again.',
  );
};

/* ================= the client's side: the Coach space ================= */
/* the daily step target a coach has set, if there is one */
const stepGoal = () => (coached() && P.co && P.co.steps && P.co.steps.goal) || 0;
/* the coach's name in the header is a tag made into a button, so the keyboard has to work on it too */
document.addEventListener('keydown', e => {
  const el = /** @type {HTMLElement} */ (e.target);
  if ((e.key === 'Enter' || e.key === ' ') && el.id === 'brandTag' && el.dataset.act) {
    e.preventDefault();
    el.click();
  }
});
function habitsCard() {
  const hs = coached() && P.co && P.co.habits && P.co.habits.list;
  if (!hs || !hs.length) return '';
  const d = day(),
    done = d.hb || {},
    wk = Array.from({ length: 7 }, (x, i) => S.days[addDays(ckWeek(), i)]).filter(Boolean);
  return `<section class="card stack"><div class="between"><h2>Habits</h2><span class="muted small">from ${esc(CG.coach.coach_name)}</span></div><p class="tiny muted" style="margin-top:-6px">Your coach sees how many you tick each week, not which days.</p>${hs
    .map(h => {
      const n = wk.filter(x => (x.hb || {})[h.id]).length;
      return `<button class="chk" data-act="habitTick" data-id="${h.id}" aria-pressed="${done[h.id] ? 'true' : 'false'}"><span class="tb"></span><span>${esc(h.n)}<small class="muted" style="display:block;font-weight:400">${h.why ? esc(h.why) + ' · ' : ''}${n} day${n === 1 ? '' : 's'} this week</small></span></button>`;
    })
    .join('')}</section>`;
}
A.habitTick = async ({ id }) => {
  const d = await loadDay(S.date);
  d.hb = { ...(d.hb || {}) };
  if (d.hb[id]) delete d.hb[id];
  else d.hb[id] = 1;
  commitDay(d);
  if (CG.recent) CG.recent[d.date] = d;
  clearTimeout(CG.wkLater);
  CG.wkLater = setTimeout(cgWeeksSend, 4000); // the week's count, once the ticking has stopped
};
A.suppTick = async ({ id }) => {
  const d = await loadDay(today());
  d.sp = { ...(d.sp || {}) };
  if (d.sp[id]) delete d.sp[id];
  else d.sp[id] = 1;
  commitDay(d, { quiet: true });
  coachSpaceRedraw();
};
A.stepsToday = () => {
  const h = P.hist[today()] || {};
  openSheet(
    `${sh('Steps today')}<div class="sheet-b"><label class="f">Steps<input class="inp" id="stN" inputmode="numeric" value="${h.st || ''}"></label><p class="tiny muted">Type the count from your phone or watch. Syncing them in by itself is not built yet.</p></div><div class="sheet-f"><button class="btn" data-act="stepsSave">Save</button></div>`,
  );
};
A.stepsSave = async () => {
  const n = clamp(r0(num($('#stN').value)), 0, 150000),
    d = await loadDay(today());
  setHist(d);
  P.hist[today()] = { ...P.hist[today()], st: n };
  saveProfile();
  lastPub = 0;
  publishStatus();
  closeSheet();
  coachSpaceRedraw();
  render(); // Today, behind the sheet, shows the steps too
};
A.coRecipeKeep = ({ id }) => {
  const r = ((P.co.recipes && P.co.recipes.list) || []).find(x => x.id === id);
  if (!r) return;
  const mine = {
    id: 'co' + r.id,
    n: r.n,
    sv: r.sv,
    items: clone(r.items),
    ...(r.from ? { from: r.from, url: r.url } : {}),
  };
  S.recipes[mine.id] = mine;
  Store.put('recipes', mine.id, mine);
  toast('Saved to your recipes. Log a serving from the Add sheet.', 'good');
  coachSpaceRedraw();
};
A.coachSpace = () => {
  if (!hasCoach()) return A.cgJoin();
  while (sheets.length) closeSheet();
  openSheet(
    `${sh('Your coach: ' + CG.coach.coach_name)}<div class="sheet-b" id="csBody">${coachSpaceHtml()}</div>`,
    true,
  );
};
/* after a tick or a save inside the Coach space: the same sheet, redrawn where it was */
function coachSpaceRedraw() {
  const b = $('#csBody');
  if (!b) return;
  const at = b.scrollTop;
  b.innerHTML = coachSpaceHtml();
  b.scrollTop = at;
}
function coachSpaceHtml() {
  const l = CG.coach,
    co = P.co || {},
    who = esc(l.coach_name),
    out = [];
  if (l.status === 'paused')
    out.push(
      `<div class="banner">${ic('lock')}<span>Sharing is paused. ${who} sees nothing until you resume.</span></div>`,
    );
  const due = formsDue();
  if (due.length)
    out.push(
      due
        .map(
          d =>
            `<button class="pstrip hot" data-act="cgCheckin" data-kind="${d.kind}">${ic('edit')}<span class="grow"><b>${esc(d.form.title || FORM_KINDS[d.kind])}</b><small style="display:block">Ready for you to fill in</small></span>${ic('chev-r')}</button>`,
        )
        .join(''),
    );
  const un = myUnread(),
    lastMsg = myThread().slice(-1)[0];
  out.push(
    `<button class="pstrip ${un ? 'hot' : ''}" data-act="chat">${ic('chat')}<span class="grow" style="min-width:0"><b>Messages${un ? ' · ' + un + ' new' : ''}</b><small class="ell" style="display:block">${lastMsg ? esc(lastMsg.t.slice(0, 70)) : 'Ask ' + who + ' anything about your plan'}</small></span>${ic('chev-r')}</button>`,
  );
  if (co.phases && co.phases.list && co.phases.list.length) {
    const now = phaseNow(co.phases);
    out.push(
      `<div class="grp">Your roadmap</div>${now ? '' : `<p class="small muted">You are between phases today.</p>`}${roadmapHtml(co.phases, myWeek, false)}<p class="tiny muted">Dates are the plan, not a promise of a result. Weekly figures are your own, from your diary.</p>`,
    );
  }
  const st = co.steps;
  if (st && (st.goal || st.cardio)) {
    const got = (P.hist[today()] || {}).st;
    out.push(
      `<div class="grp">Steps and cardio</div><section class="card stack">${st.goal ? `<div class="between"><span><b>${fmt(st.goal)}</b> steps a day</span><button class="btn sm ghost" data-act="stepsToday">${got ? fmt(got) + ' today' : "Add today's"}</button></div>` : ''}${st.cardio ? `<p class="small">${esc(st.cardio)}</p>` : ''}</section>`,
    );
  }
  if (co.habits && co.habits.list && co.habits.list.length)
    out.push(
      `<div class="grp">Habits</div><p class="small muted">${co.habits.list.length} from ${who}. Tick them on Today.</p>`,
    );
  if (co.supps && co.supps.list && co.supps.list.length) {
    const sp = day().sp || {};
    out.push(
      `<div class="grp">Supplements</div><section class="card stack">${co.supps.list.map(s => `<button class="chk" data-act="suppTick" data-id="${s.id}" aria-pressed="${sp[s.id] ? 'true' : 'false'}"><span class="tb"></span><span>${esc(s.n)}<small class="muted" style="display:block;font-weight:400">${esc([s.amt, s.when].filter(Boolean).join(', '))}</small></span></button>`).join('')}<p class="tiny muted">General guidance from your coach, not medical advice. Check with a doctor or pharmacist first if you take medication, are pregnant or have a condition.</p></section>`,
    );
  }
  if (co.menu && co.menu.meals && co.menu.meals.length) {
    // a menu that covers a whole day (three meals or more) is sized to the person's own calories, within
    // sensible bounds; a single meal or two is shown as the coach wrote it
    const full = co.menu.meals.length >= 3 && co.menu.total > 0,
      f = full ? clamp(P.t.k / co.menu.total, 0.5, 2) : 1,
      sv = Math.round(f * 4) / 4;
    out.push(
      `<div class="grp">${esc(co.menu.title || 'Menu of the week')}</div><section class="card" style="padding:4px 14px">${co.menu.meals.map(x => `<div class="entry" style="cursor:default"><span class="n">${esc(x.n)}</span><span class="k">${fmt(x.k * sv)}</span><span class="s">${MEALS[x.m]} · ${sv === 1 ? '1 serving' : sv + ' servings'} · ${r0(x.p * sv)} g protein${full ? ' ' + srcBadge('AI') : ''}</span></div>`).join('')}</section><p class="tiny muted">${full ? `Sized to your ${fmt(P.t.k)} kcal target by scaling the servings to the nearest quarter, so the figures are estimates.` : `As your coach wrote it: ${fmt(co.menu.total)} kcal in all.`}</p>`,
    );
  }
  if (co.recipes && co.recipes.list && co.recipes.list.length)
    out.push(
      `<div class="grp">Recipes from ${who}</div><section class="card" style="padding:4px 14px">${co.recipes.list.map(r => `<div class="entry" style="cursor:default;grid-template-columns:1fr auto auto;align-items:center"><span class="n">${esc(r.n)}</span><span class="k">${fmt(r.per.k)}</span>${S.recipes['co' + r.id] ? '<span class="pill good">Saved</span>' : `<button class="btn sm ghost" data-act="coRecipeKeep" data-id="${r.id}">Save</button>`}<span class="s">kcal a serving · ${r.per.p} g protein · makes ${r.sv}</span></div>`).join('')}</section>`,
    );
  if (co.vault && co.vault.list && co.vault.list.length)
    out.push(
      `<div class="grp">Vault</div><section class="card" style="padding:4px 14px">${co.vault.list.map(v => (v.url ? `<a class="entry" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit"><span class="n">${esc(v.t)}</span><span class="k">${ic('chev-r')}</span><span class="s" style="white-space:normal">${esc(v.note || '')}</span></a>` : `<div class="entry" style="cursor:default"><span class="n">${esc(v.t)}</span><span class="k"></span><span class="s" style="white-space:normal">${esc(v.note || '')}</span></div>`)).join('')}</section>`,
    );
  out.push(
    `<div class="grp">You and ${who}</div><button class="btn ghost" data-act="measSheet">${ic('scale')} Measurements</button><button class="btn ghost" data-act="myCoach">${ic('lock')} What ${who} can see</button>`,
  );
  return out.join('');
}

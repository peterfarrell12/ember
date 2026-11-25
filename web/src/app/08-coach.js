/* ================= v3: coach view ================= */
let CO = { clients: {}, seeded: false },
  LIVE = {};
const isCoach = () => FEATURES.coach && P && P.mode === 'coach' && Store.owner !== false;
const daysAgo = k => (k ? Math.round((pdate(today()) - pdate(k)) / 864e5) : null);
const initials = n =>
  String(n || '?')
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/* A compact picture of one athlete, built from their own data. */
function myStatus() {
  const tk = today(),
    hs = [];
  for (let i = 0; i < 7; i++) {
    const h = P.hist[addDays(tk, -i)];
    if (h && h.n > 0) hs.push(h);
  }
  const avg = f => (hs.length ? r0(hs.reduce((s, h) => s + (h[f] || 0), 0) / hs.length) : 0);
  const p = activeProg(),
    ts = trendSeries(),
    last = ts[ts.length - 1],
    b30 = trendAt(ts, addDays(tk, -30));
  const rl = Object.keys(TR.rlog).sort(),
    rp = TR.rehab && rehabPlan(TR.rehab.id),
    from = addDays(tk, -13),
    td = S.days[tk] ? tasksFor(S.days[tk]) : [];
  return {
    upd: tk,
    streak: streak().count,
    sess7: TR.sess.filter(s => s.kind === 'train' && s.d >= addDays(tk, -6)).length,
    plan7: p ? p.days.length : 0,
    lastSess: TR.sess.length ? TR.sess[0].d : null,
    kcalAvg: avg('k'),
    kcalT: P.t.k,
    protAvg: avg('p'),
    protT: P.t.p,
    logged7: hs.length,
    kg: last ? r1(last.t) : null,
    kg30: last && b30 != null ? r1(last.t - b30) : null,
    ready: TR.ready[tk] ? TR.ready[tk].score : null,
    pain: rl.length ? TR.rlog[rl[rl.length - 1]].pain : null,
    painPrev: rl.length > 1 ? TR.rlog[rl[rl.length - 2]].pain : null,
    rehabN: rp ? rp.n : '',
    rehabPh: rp ? TR.rehab.phase + 1 : 0,
    progN: p ? p.n : '',
    progWk: p ? Math.floor(P.prog.at / p.days.length) + 1 : 0,
    progWeeks: p ? p.weeks || 0 : 0,
    prs14: TR.sess.filter(s => s.d >= from).reduce((a, s) => a + (s.prs || 0), 0),
    tasksDone: td.filter(t => t.done).length,
    tasksTot: td.length,
  };
}
function myEvents() {
  const from = addDays(today(), -14);
  const ev = TR.sess
    .filter(s => s.d >= from)
    .map(s => ({
      d: s.d,
      k: s.kind === 'rehab' ? 'pulse' : s.prs ? 'trophy' : 'dumbbell',
      s:
        (s.kind === 'rehab' ? 'Rehab: ' : 'Finished ') +
        s.n +
        ', ' +
        s.dur +
        ' min' +
        (s.prs ? ', ' + s.prs + ' record' + (s.prs === 1 ? '' : 's') : '') +
        (s.kind === 'rehab' && TR.rlog[s.d] ? ', pain ' + TR.rlog[s.d].pain + '/10' : ''),
    }));
  Object.keys(TR.ready)
    .filter(k => k >= from && TR.ready[k].score < 40)
    .forEach(k => ev.push({ d: k, k: 'alert', s: 'Low recovery score: ' + TR.ready[k].score }));
  P.wts
    .filter(w => w.d >= from)
    .slice(-3)
    .forEach(w => ev.push({ d: w.d, k: 'scale', s: 'Weighed in at ' + w.kg + ' kg' }));
  return ev.sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 12);
}
function alertsFor(st) {
  const a = [];
  if (!st) return a;
  const idle = daysAgo(st.upd),
    ls = daysAgo(st.lastSess);
  if (idle != null && idle >= 4) a.push('No activity for ' + idle + ' days');
  if (st.plan7 > 0 && st.sess7 < st.plan7 * 0.5)
    a.push('Behind on sessions: ' + st.sess7 + ' of ' + st.plan7 + ' in the last 7 days');
  else if (ls != null && ls >= 6) a.push('No session for ' + ls + ' days');
  if (st.pain != null && st.pain >= 5) a.push('Pain at ' + st.pain + ' out of 10');
  else if (st.pain != null && st.painPrev != null && st.pain > st.painPrev + 1) a.push('Pain is rising');
  if (st.ready != null && st.ready < 40) a.push('Low recovery score: ' + st.ready);
  if (st.logged7 != null && st.logged7 <= 2) a.push('Food logged on ' + st.logged7 + ' of the last 7 days');
  return a;
}
const SEED_V = 3;
const SAMPLES = [
  {
    name: 'Aoife Brennan',
    goal: 'Hyrox doubles in March',
    tpl: 't-hyrox',
    at: 9,
    st: {
      updAgo: 0,
      lastAgo: 0,
      streak: 23,
      sess7: 4,
      kcalAvg: 2150,
      kcalT: 2200,
      protAvg: 128,
      protT: 130,
      logged7: 7,
      kg: 64.2,
      kg30: -0.6,
      ready: 78,
      prs14: 2,
    },
    ev: [
      [0, 'trophy', 'Finished Strength and sleds, 58 min, 1 record'],
      [1, 'dumbbell', 'Finished Engine, 46 min'],
      [3, 'dumbbell', 'Finished Upper and ergs, 52 min'],
    ],
    notes: [[6, 'Sled push is the limiter. Add a heavy set on Mondays.']],
    msgs: [[7, 'Great week, Aoife. Hold the run pace on Thursday and we add load next block.']],
  },
  {
    name: 'Conor Devlin',
    goal: 'Back playing after a hamstring strain',
    tpl: 't-field2',
    at: 5,
    rehab: 'r-ham',
    phase: 1,
    st: {
      updAgo: 1,
      lastAgo: 3,
      streak: 4,
      sess7: 1,
      kcalAvg: 2840,
      kcalT: 2700,
      protAvg: 141,
      protT: 170,
      logged7: 4,
      kg: 88.4,
      kg30: 0.3,
      ready: 52,
      pain: 5,
      painPrev: 3,
      prs14: 0,
    },
    ev: [
      [1, 'pulse', 'Rehab: Hamstring, pain 5/10'],
      [3, 'dumbbell', 'Finished Strength and power, 41 min'],
      [4, 'pulse', 'Rehab: Hamstring, pain 3/10'],
    ],
    notes: [[2, 'Pain jumped after Tuesday training. Hold phase 2, no sprinting yet.']],
    msgs: [[4, 'Conor, keep the Nordics slow and stop at four reps for now.']],
  },
  {
    name: 'Niamh Kilroy',
    goal: 'Lose 6 kg and get stronger',
    tpl: 't-home3',
    at: 4,
    st: {
      updAgo: 6,
      lastAgo: 8,
      streak: 0,
      sess7: 0,
      kcalAvg: 1980,
      kcalT: 1750,
      protAvg: 74,
      protT: 115,
      logged7: 1,
      kg: 76.9,
      kg30: 0.4,
      ready: null,
      prs14: 0,
    },
    ev: [
      [8, 'dumbbell', 'Finished Day A, 33 min'],
      [10, 'scale', 'Weighed in at 76.5 kg'],
    ],
    notes: [[5, 'Gone quiet since the work trip. Call rather than message.']],
    msgs: [[9, 'How did the week away go? Two short sessions is a win this week.']],
  },
  {
    name: 'Darragh Feeney',
    goal: 'Stay strong through the league',
    tpl: 't-field2',
    at: 8,
    st: {
      updAgo: 0,
      lastAgo: 1,
      streak: 12,
      sess7: 2,
      kcalAvg: 3050,
      kcalT: 3100,
      protAvg: 172,
      protT: 175,
      logged7: 6,
      kg: 84.1,
      kg30: 0.2,
      ready: 71,
      prs14: 1,
    },
    ev: [
      [1, 'trophy', 'Finished Strength and power, 44 min, 1 record'],
      [4, 'dumbbell', 'Finished Speed and resilience, 39 min'],
    ],
    notes: [[3, 'Match on Sunday. Keep Thursday light.']],
    msgs: [],
  },
  {
    name: 'Sinead Fahy',
    goal: 'Padel league and a stronger shoulder',
    tpl: 't-padel2',
    at: 6,
    rehab: 'r-shoulder',
    phase: 1,
    st: {
      updAgo: 0,
      lastAgo: 0,
      streak: 9,
      sess7: 2,
      kcalAvg: 1890,
      kcalT: 1950,
      protAvg: 104,
      protT: 110,
      logged7: 5,
      kg: 61,
      kg30: -0.2,
      ready: 66,
      pain: 2,
      painPrev: 3,
      prs14: 0,
    },
    ev: [
      [0, 'pulse', 'Rehab: Shoulder, pain 2/10'],
      [2, 'dumbbell', 'Finished Rotate and push, 37 min'],
    ],
    notes: [[8, 'Shoulder settling. Move to phase 3 if pain stays at 2 next week.']],
    msgs: [[2, 'Pain is trending the right way, Sinead. Same again this week.']],
  },
  {
    name: 'Tomas Hegarty',
    goal: 'Lose 10 kg before June',
    tpl: 't-full3',
    at: 13,
    st: {
      updAgo: 0,
      lastAgo: 1,
      streak: 31,
      sess7: 2,
      kcalAvg: 2010,
      kcalT: 2000,
      protAvg: 150,
      protT: 160,
      logged7: 7,
      kg: 97.3,
      kg30: -2.1,
      ready: 60,
      prs14: 3,
    },
    ev: [
      [1, 'trophy', 'Finished Day B, 51 min, 2 records'],
      [2, 'scale', 'Weighed in at 97.1 kg'],
      [3, 'dumbbell', 'Finished Day A, 48 min'],
    ],
    notes: [[10, 'Thirty days of logging. Raise calories by 100 if the pace goes over 0.7 kg a week.']],
    msgs: [[3, 'Two kilos down in a month and three records. Do not change a thing.']],
  },
  {
    name: 'Ciara Mulvey',
    goal: 'First half marathon in April',
    tpl: 't-bw3',
    at: 3,
    st: {
      updAgo: 0,
      lastAgo: 2,
      streak: 6,
      sess7: 1,
      kcalAvg: 1720,
      kcalT: 2100,
      protAvg: 82,
      protT: 105,
      logged7: 3,
      kg: 58.2,
      kg30: 0,
      ready: 34,
      prs14: 0,
    },
    ev: [
      [0, 'alert', 'Low recovery score: 34'],
      [2, 'dumbbell', 'Finished Day A, 28 min'],
    ],
    notes: [[1, 'Under-eating against her mileage. Raise it at the next check-in.']],
    msgs: [],
  },
  {
    name: 'Eoin Brannigan',
    goal: 'Build muscle',
    tpl: 't-ul4',
    at: 18,
    st: {
      updAgo: 0,
      lastAgo: 0,
      streak: 18,
      sess7: 4,
      kcalAvg: 3350,
      kcalT: 3300,
      protAvg: 181,
      protT: 180,
      logged7: 7,
      kg: 79.8,
      kg30: 0.9,
      ready: 74,
      prs14: 4,
    },
    ev: [
      [0, 'trophy', 'Finished Upper B, 62 min, 1 record'],
      [1, 'dumbbell', 'Finished Lower A, 58 min'],
      [2, 'trophy', 'Finished Upper A, 60 min, 2 records'],
    ],
    notes: [],
    msgs: [[6, 'Weight is climbing at the right rate, Eoin. Add a set to the rows.']],
  },
];
function seedSamples() {
  Object.keys(CO.clients).forEach(k => {
    if (CO.clients[k].kind === 'sample') delete CO.clients[k];
  });
  const ago = arr => (arr || []).map(a => ({ d: addDays(today(), -a[0]), t: a[1] }));
  SAMPLES.forEach((s, i) => {
    const t = TEMPLATES.find(x => x.id === s.tpl),
      rp = s.rehab && rehabPlan(s.rehab);
    const id = 's' + i;
    CO.clients[id] = {
      id,
      kind: 'sample',
      name: s.name,
      goal: s.goal,
      since: addDays(today(), -60 - i * 20),
      prog: clone({ n: t.n, weeks: t.weeks, days: t.days }),
      progAt: s.at,
      rehab: rp ? { id: rp.id, n: rp.n, phase: s.phase || 0 } : null,
      tasks: ['ready', 'train', 'protein'],
      t: { k: s.st.kcalT, p: s.st.protT },
      notes: ago(s.notes),
      msgs: ago(s.msgs),
      st: clone(s.st),
      ev: s.ev.filter(e => e[1] !== 'dumbbell' && e[1] !== 'trophy').map(e => ({ ago: e[0], k: e[1], s: e[2] })),
    };
    fillSample(CO.clients[id], s, i);
  });
  CO.seeded = true;
  CO.seedV = SEED_V;
  CO.demo = true;
  saveCO();
}
const needSeed = () => CO.demo !== false && (CO.seedV || 0) < SEED_V;
/* Every client in one shape, whatever their source. */
function clientList() {
  const out = [
    {
      id: 'me',
      kind: 'me',
      name: 'You',
      goal: P.goalKg
        ? 'Reach ' + P.goalKg + ' kg'
        : P.goal === 'lose'
          ? 'Lose weight'
          : P.goal === 'gain'
            ? 'Gain'
            : 'Maintain',
      st: myStatus(),
      ev: myEvents(),
      msgs: P.cmsgs || [],
      notes: P.cnotes || [],
    },
  ];
  Object.keys(LIVE).forEach(uid => {
    const d = LIVE[uid],
      c = CO.clients['u:' + uid] || {};
    out.push({
      id: 'u:' + uid,
      kind: 'live',
      uid,
      name: d.name || 'Client ' + uid.slice(-4),
      goal: d.goal || '',
      st: d.st || {},
      ev: d.ev || [],
      ...(d._link
        ? {
            link: d._link,
            paused: d._status === 'paused',
            share: d.share || null,
            view: d.view || null,
            resp: d.resp || {},
          }
        : {}),
      msgs: c.msgs || [],
      notes: c.notes || [],
    });
  });
  Object.values(CO.clients)
    .filter(c => c.kind === 'manual' || c.kind === 'sample')
    .forEach(c =>
      out.push({
        ...c,
        st: clientStatus(c),
        ev: (c.ev || []).map(e => ({ d: e.d || addDays(today(), -(e.ago || 0)), k: e.k, s: e.s })),
      }),
    );
  return out;
}
const getClient = id => clientList().find(c => c.id === id);
const adher = st => (st.plan7 ? Math.min(100, r0((st.sess7 / st.plan7) * 100)) : null);
const kindPill = c =>
  c.kind === 'me'
    ? '<span class="pill gold">You</span>'
    : c.kind === 'sample'
      ? '<span class="pill">Sample</span>'
      : c.kind === 'live'
        ? '<span class="pill good">Live</span>'
        : '';

/* ---------- mode switch ---------- */
A.modeToggle = () => {
  P.mode = P.mode === 'coach' ? 'me' : 'coach';
  if (P.mode === 'coach' && needSeed()) seedSamples();
  saveProfile();
  closeAll();
  S.tab = P.mode === 'coach' ? 'clients' : 'today';
  render();
  $('#main').scrollTop = 0;
  toast(P.mode === 'coach' ? 'Coach view' : 'Your view');
  if (P.mode === 'coach') loadLive();
};
function renderChrome() {
  const gy = isGym(),
    co = isCoach() || gy;
  $('#chipStreak').classList.toggle('hide', co);
  $('#chipGems').classList.toggle('hide', co);
  $('#chipYou').classList.toggle('hide', co);
  $('#chipCal').classList.toggle('hide', co);
  $('#brandTag').classList.toggle('hide', !co);
  const m = $('#chipMode');
  m.classList.toggle('hide', Store.owner === false || !co);
  {
    const L = levelOf(P.xp),
      lo = 50 * (L - 1) * L,
      hi = 50 * L * (L + 1),
      y = $('#chipYou');
    y.style.setProperty('--p', clamp(((P.xp - lo) / (hi - lo)) * 100, 3, 100));
    y.innerHTML = `<span>${P.coachName ? esc(initials(P.coachName)) : ic('user')}</span>`;
    y.setAttribute('aria-label', 'You: level ' + L + ', settings and connections');
  }
  m.innerHTML = co ? ic('user') + '<span>My view</span>' : ic('users');
  m.setAttribute('aria-label', co ? 'Switch to your own view' : 'Switch to coach or gym view');
  m.dataset.act = co ? 'modeBack' : 'modeMenu';
  $('#brandTag').textContent = gy ? 'Gym' : 'Coach';
  const tab = (t, i, l) =>
    `<button class="tab" data-act="tab" data-tab="${t}" ${S.tab === t ? 'aria-current="page"' : ''}>${ic(i)}${l}</button>`;
  $('nav.tabs').innerHTML = gy
    ? tab('gday', 'home', 'Today') +
      tab('gtime', 'cal', 'Timetable') +
      `<button class="fab" data-act="gAdd" aria-label="Add a class, member or announcement">${ic('plus')}</button>` +
      tab('gpeople', 'users', 'People') +
      `<button class="tab" data-act="modeBack">${ic('swap')}My view</button>`
    : co
      ? tab('clients', 'users', 'Clients') +
        tab('library', 'book', 'Library') +
        `<button class="fab" data-act="coAdd" aria-label="Add a client">${ic('plus')}</button>` +
        tab('feed', 'pulse', 'Feed') +
        `<button class="tab" data-act="modeToggle">${ic('swap')}My view</button>`
      : tab('today', 'home', 'Today') +
        tab('train', 'dumbbell', 'Train') +
        `<button class="fab" data-act="add" aria-label="Add food, water, exercise or a weigh-in">${ic('plus')}</button>` +
        tab('progress', 'chart', 'Progress') +
        tab('quests', 'trophy', 'Quests');
}
function viewCoach() {
  return S.tab === 'library' ? coLibrary() : S.tab === 'feed' ? coFeed() : coClients();
}

/* ---------- clients ---------- */
function coClients() {
  const cs = clientList(),
    withAl = cs.map(c => ({ c, al: alertsFor(c.st) }));
  const flagged = withAl.filter(x => x.al.length),
    ad = cs.map(c => adher(c.st)).filter(v => v != null);
  const row = ({ c, al }) => {
    const a = adher(c.st);
    return `<button class="crow" data-act="coClient" data-id="${c.id}"><span class="av">${esc(initials(c.name))}</span><span class="grow"><span class="row" style="gap:6px"><b class="ell">${esc(c.name)}</b>${kindPill(c)}</span><span class="small muted ell" style="display:block">${esc(c.st.progN || 'No program')}${c.st.rehabN ? ' · rehab: ' + esc(c.st.rehabN) : ''}</span>${a != null ? `<span class="bar ${a >= 75 ? 'good' : a >= 50 ? 'gold' : 'ember'}" style="margin-top:6px;display:block"><i style="width:${a}%"></i></span>` : ''}</span><span class="cr">${a != null ? `<b class="tn">${a}%</b>` : ''}${al.length ? `<span class="pill bad">${al.length}</span>` : ''}${(n => (n ? `<span class="pill ice">${ic('chat')} ${n}</span>` : ''))(unreadFrom(c))}</span></button>`;
  };
  const tc = trustChecks(coachProfile());
  return `<div class="between"><h2 class="sec-h" style="font-size:22px">Clients</h2><button class="btn sm ghost" data-act="coAdd">${ic('plus')} Add</button></div>
  ${WK ? `<section class="card stack" style="border-color:var(--ember)"><div class="between"><b>${esc(WK.name)}${WK.client && CO.clients[WK.client] ? ' with ' + esc(CO.clients[WK.client].name) : ''}</b><span class="pill gold">In progress</span></div><div class="two"><button class="btn sm ember" data-act="wkResume">Resume</button><button class="btn sm ghost" data-act="wkDiscard">Discard</button></div></section>` : ''}
  <div class="two"><button class="act" data-act="coProfile">${ic('shield')}<span>Your profile<small>${tc.filter(t => t[1]).length} of ${tc.length} trust checks</small></span></button>${FEATURES.community ? `<button class="act" data-act="catalogue">${ic('search')}<span>Coach catalogue<small>How clients find you</small></span></button>` : `<button class="act" data-act="cgInvite">${ic('link')}<span>Invite a client<small>They choose what you see</small></span></button>`}</div>${cgInvitesCard()}
  <div class="grid3"><div class="stat"><div class="num">${cs.length}</div><span>Clients</span></div><div class="stat"><div class="num">${ad.length ? r0(ad.reduce((a, b) => a + b, 0) / ad.length) + '%' : 'n/a'}</div><span>Sessions done</span></div><div class="stat"><div class="num">${flagged.length}</div><span>Need a look</span></div></div>
  ${flagged.length ? `<section class="card"><h2>Needs a look</h2>${flagged.map(({ c, al }) => `<button class="entry" data-act="coClient" data-id="${c.id}"><span class="n">${esc(c.name)}</span><span class="k">${ic('chev-r')}</span><span class="s" style="white-space:normal;color:var(--bad)">${esc(al.join(' · '))}</span></button>`).join('')}</section>` : ''}
  <section class="card" style="padding:4px 14px">${withAl.map(row).join('')}</section>
  ${cs.some(c => c.kind === 'sample') ? `<div class="banner">${ic('users')}<span>Clients marked Sample are invented, with made-up numbers, plans and notes, so you can see this view working. <button class="link" data-act="coDropSamples">Remove demo data</button></span></div>` : `<button class="link" data-act="coDemoOn" style="align-self:flex-start">Show demo data</button>`}
  <p class="tiny muted">Live clients are people in your Claude organisation who open Ember after you share it with them as contributors. Everyone else you add here is tracked by you.</p>`;
}
A.coDropSamples = () => {
  Object.keys(CO.clients).forEach(k => {
    if (CO.clients[k].kind === 'sample') delete CO.clients[k];
  });
  CO.demo = false;
  saveCO();
  closeAll();
  render();
  toast('Demo data removed');
};
A.coDemoOn = () => {
  CO.demo = true;
  CO.seedV = 0;
  seedSamples();
  closeAll();
  render();
  toast('Demo data is back');
};
const recOf = id => CO.clients[id] || (CO.clients[id] = { id, kind: 'live', msgs: [], notes: [] });
async function pushAssign(uid, part, val) {
  if (coachingOn()) return cgAssign(uid, part, val);
  try {
    const ref = Store.db.doc('assign/' + uid);
    const cur = await ref.get();
    const data = cur.exists ? clone(cur.data()) : {};
    data[part] = { ...val, v: Date.now() };
    await ref.set(data);
    return true;
  } catch (e) {
    toast('That could not be sent to the client. Check your connection.');
    return false;
  }
}
/* Assign a program or rehab plan to one client, whatever kind of client they are. */
async function assignItem(cid, what, id) {
  const c = getClient(cid);
  if (!c) return;
  const tpl = TEMPLATES.find(t => t.id === id);
  const prog = what === 'prog' ? tpl || S.progs[id] : null,
    plan = what === 'rehab' ? rehabPlan(id) : null;
  const name = (prog || plan).n;
  if (c.kind === 'me') {
    if (prog) {
      let pid = id;
      if (tpl) {
        const p = clone({ id: newId(), n: tpl.n, about: tpl.about, weeks: tpl.weeks, days: tpl.days, src: 'tpl' });
        saveProg(p);
        pid = p.id;
      }
      P.prog = { id: pid, at: 0, n: 0, started: today() };
    } else {
      TR.rehab = { id, phase: 0, started: today() };
      addTask('rehab');
      saveTR();
    }
    saveProfile();
  } else if (c.kind === 'live') {
    if (
      !(await pushAssign(
        c.uid,
        what,
        prog
          ? { p: clone({ n: prog.n, about: prog.about || '', weeks: prog.weeks || 0, days: prog.days }) }
          : { plan: clone({ n: plan.n, intro: plan.intro || '', phases: plan.phases }) },
      ))
    )
      return;
  } else {
    const r = CO.clients[cid];
    if (prog) {
      r.prog = clone({ n: prog.n, weeks: prog.weeks || 0, days: prog.days });
      r.progAt = 0;
    } else r.rehab = { id, n: plan.n, phase: 0 };
    r.ev = [{ d: today(), k: 'book', s: 'Assigned ' + name }].concat(r.ev || []).slice(0, 12);
    saveCO();
  }
  toast(name + ' assigned to ' + c.name);
}
let CA = null;
A.coPick = ({ what }) => {
  CA = { cid: CC, what };
  const rows =
    what === 'prog'
      ? Object.values(S.progs)
          .map(p => [p.id, p.n, p.days.length + ' days a week', 'Yours'])
          .concat(TEMPLATES.map(t => [t.id, t.n, t.about, t.tag]))
      : REHAB.concat(Object.values(TR.rplans)).map(r => [r.id, r.n, r.intro || '', r.phases.length + ' phases']);
  openSheet(
    `${sh(what === 'prog' ? 'Assign a program' : 'Assign a rehab plan')}<div class="sheet-b"><div class="list">${rows.map(r => `<button class="res" data-act="coPickGo" data-id="${r[0]}"><span class="n">${esc(r[1])}</span><span class="k"><span class="pill">${esc(r[3])}</span></span><span class="s" style="white-space:normal">${esc(r[2])}</span></button>`).join('')}</div></div>`,
    true,
  );
};
A.coPickGo = async ({ id }) => {
  closeSheet();
  await assignItem(CA.cid, CA.what, id);
  renderClient();
  render();
};
A.coAssignFrom = ({ what, id }) => {
  CA = { what, id };
  openSheet(
    `${sh('Assign to')}<div class="sheet-b"><div class="list">${clientList()
      .map(
        c =>
          `<button class="res" data-act="coAssignTo" data-id="${c.id}"><span class="n">${esc(c.name)}</span><span class="k">${kindPill(c)}</span><span class="s">${esc(what === 'prog' ? c.st.progN || 'No program yet' : c.st.rehabN || 'No rehab plan')}</span></button>`,
      )
      .join('')}</div></div>`,
  );
};
A.coAssignTo = async ({ id }) => {
  closeAll();
  await assignItem(id, CA.what, CA.id);
  render();
};
const coachBtn = (what, id) =>
  isCoach()
    ? `<button class="btn" data-act="coAssignFrom" data-what="${what}" data-id="${id}">${ic('users')} Assign to a client</button>`
    : '';
A.coTasks = () => {
  const c = getClient(CC);
  const cur = c.kind === 'me' ? P.tasks.filter(t => t.auto).map(t => t.auto) : recOf(c.id).tasks || [];
  CA = { keys: new Set(cur) };
  openSheet(
    `${sh('Daily tasks for ' + c.name)}<div class="sheet-b"><div class="list" id="ctList"></div></div><div class="sheet-f"><button class="btn" data-act="coTasksSave">Save</button></div>`,
  );
  const draw = () => {
    $('#ctList').innerHTML = Object.entries(TASK_AUTO)
      .map(
        ([k, v]) =>
          `<button class="res" data-act="coTaskT" data-k="${k}"><span class="n">${v[0]}</span><span class="k"><span class="pill ${CA.keys.has(k) ? 'good' : ''}">${CA.keys.has(k) ? 'On' : 'Off'}</span></span></button>`,
      )
      .join('');
  };
  A.coTaskT = ({ k }) => {
    CA.keys.has(k) ? CA.keys.delete(k) : CA.keys.add(k);
    draw();
  };
  draw();
};
A.coTasksSave = async () => {
  const c = getClient(CC),
    keys = [...CA.keys];
  if (c.kind === 'me') {
    P.tasks = P.tasks.filter(t => !t.auto).concat(keys.map(k => ({ id: k, auto: k })));
    saveProfile();
  } else if (c.kind === 'live') {
    if (!(await pushAssign(c.uid, 'tasks', { keys }))) return;
    recOf(c.id).tasks = keys;
    saveCO();
  } else {
    CO.clients[c.id].tasks = keys;
    saveCO();
  }
  closeSheet();
  renderClient();
  toast('Tasks set');
};
A.coTargets = () => {
  const c = getClient(CC),
    t = (c.kind === 'me' ? P.t : recOf(c.id).t) || { k: '', p: '' };
  openSheet(
    `${sh('Targets for ' + c.name)}<div class="sheet-b"><div class="grid2"><label class="f">Calories a day<input class="inp" id="ctK" inputmode="numeric" value="${t.k}"></label><label class="f">Protein, g<input class="inp" id="ctP" inputmode="numeric" value="${t.p}"></label></div></div><div class="sheet-f"><button class="btn" data-act="coTargetsSave">Save</button></div>`,
  );
};
A.coTargetsSave = async () => {
  const c = getClient(CC),
    k = r0(num($('#ctK').value)),
    p = r0(num($('#ctP').value));
  if (!(k >= 1000 && k <= 6000)) return toast('Set calories between 1,000 and 6,000.');
  if (c.kind === 'me') {
    P.t.k = k;
    P.t.p = p;
    P.t.c = Math.max(50, Math.round((k - p * 4 - P.t.f * 9) / 4 / 5) * 5);
    saveProfile();
  } else if (c.kind === 'live') {
    if (!(await pushAssign(c.uid, 't', { k, p }))) return;
    recOf(c.id).t = { k, p };
    saveCO();
  } else {
    const r = CO.clients[c.id];
    r.t = { k, p };
    r.st.kcalT = k;
    r.st.protT = p;
    saveCO();
  }
  closeSheet();
  renderClient();
  toast('Targets set');
};
A.coSend = async ({ as }) => {
  const t = ($('#ccMsg').value || '').trim();
  if (!t) return toast('Write something first.');
  const c = getClient(CC),
    item = { d: today(), t: t.slice(0, 600) },
    key = as === 'msg' ? 'msgs' : 'notes';
  if (c.kind === 'me') {
    const pk = as === 'msg' ? 'cmsgs' : 'cnotes';
    P[pk] = [item].concat(P[pk] || []).slice(0, 20);
    if (as === 'msg') P.coachMsg = item;
    saveProfile();
  } else {
    if (as === 'msg' && c.kind === 'live' && !(await pushAssign(c.uid, 'msg', item))) return;
    const r = recOf(c.id);
    r[key] = [item].concat(r[key] || []).slice(0, 20);
    saveCO();
  }
  renderClient();
  if (as === 'msg' && (c.kind === 'manual' || c.kind === 'sample'))
    copyText(item.t, 'Saved and copied. Paste it into a message to them.');
  else toast(as === 'msg' ? 'Sent' : 'Note saved');
};
A.coDraft = async () => {
  if (!AI.sample) return toast('Drafting needs Claude, which is not available in this view.');
  const c = getClient(CC),
    st = c.st,
    box = $('#ccMsg');
  box.value = 'Drafting…';
  try {
    const r = await AI.sample.json(
      [
        'coach_draft',
        {
          p0: c.kind === 'me' ? 'the coach themself, so write it as a note to self' : c.name,
          p1: c.goal || 'not stated',
          p2: st.sess7 ?? 'unknown',
          p3: st.plan7 || 'none',
          p4: st.progN || 'no program',
          p5: st.prs14 || 0,
          p6: st.logged7 ?? 'unknown',
          p7: st.kcalAvg || 'unknown',
          p8: st.kcalT || 'no target',
          p9: st.protAvg || 'unknown',
          p10: st.protT || 'no target',
          p11: st.kg ?? 'unknown',
          p12: st.kg30 ?? 'unknown',
          p13: st.ready ?? 'not checked in',
          p14: st.rehabN
            ? 'Rehab: ' +
              st.rehabN +
              ', phase ' +
              st.rehabPh +
              ', last pain ' +
              (st.pain ?? 'unknown') +
              '/10, before that ' +
              (st.painPrev ?? 'unknown') +
              '/10.'
            : 'No rehab plan.',
          p15: alertsFor(st).join('; ') || 'none',
        },
      ],
      { cache: false },
    );
    if ($('#ccMsg')) $('#ccMsg').value = String((r && r.text) || '').slice(0, 600);
  } catch (e) {
    if ($('#ccMsg')) $('#ccMsg').value = '';
    toast(aiError(e));
  }
};
A.coRemove = () => {
  delete CO.clients[CC];
  saveCO();
  closeAll();
  render();
  toast('Client removed');
};

/* ---------- library and feed ---------- */
function coLibrary() {
  const mine = Object.values(S.progs);
  return `<div class="between"><h2 class="sec-h" style="font-size:22px">Library</h2></div>
  <div class="two"><button class="act" data-act="progAI">${ic('spark')}<span>Build with Claude<small>Goal, days, kit</small></span></button><button class="act" data-act="progNew">${ic('edit')}<span>Write a program<small>From scratch</small></span></button></div>
  ${mine.length ? `<div class="grp">Your programs</div><div class="list">${mine.map(p => `<button class="res" data-act="progView" data-id="${p.id}"><span class="n">${esc(p.n)}</span><span class="k muted small">${p.days.length} days</span><span class="s" style="white-space:normal">${esc(p.about || '')}</span></button>`).join('')}</div>` : ''}
  <div class="grp">Ready-made programs</div><div class="list">${TEMPLATES.map(t => `<button class="res" data-act="tplView" data-id="${t.id}"><span class="n">${esc(t.n)}</span><span class="k"><span class="pill">${esc(t.tag)}</span></span><span class="s" style="white-space:normal">${esc(t.about)}</span></button>`).join('')}</div>
  <div class="grp">Rehab plans</div><div class="list">${REHAB.concat(Object.values(TR.rplans))
    .map(
      r =>
        `<button class="res" data-act="rehabView" data-id="${r.id}"><span class="n">${esc(r.n)}</span><span class="k muted small">${r.phases.length} phases</span><span class="s" style="white-space:normal">${esc(r.intro || '')}</span></button>`,
    )
    .join('')}</div>
  <button class="btn ghost" data-act="exLib">${ic('search')} Exercise library</button>`;
}
function coFeed() {
  const ev = clientList()
    .flatMap(c => (c.ev || []).map(e => ({ ...e, c })))
    .sort((a, b) => (a.d < b.d ? 1 : -1))
    .slice(0, 40);
  return `<div class="between"><h2 class="sec-h" style="font-size:22px">Feed</h2></div>
  ${inboxCard()}
  ${squadCard()}
  ${ev.length ? `<section class="card" style="padding:4px 14px">${ev.map(e => `<button class="crow" data-act="coClient" data-id="${e.c.id}"><span class="av sm">${ic(e.k || 'dumbbell')}</span><span class="grow"><b>${esc(e.c.name)}</b><span class="small" style="display:block">${esc(e.s)}</span><span class="tiny muted">${niceDate(e.d)}</span></span></button>`).join('')}</section>` : `<p class="empty">Sessions, check-ins and weigh-ins from your clients will show up here.</p>`}`;
}

/* ---------- live clients: shared status and assignments, for people in the same Claude organisation ---------- */
let lastPub = 0;
async function publishStatus() {
  if (!FEATURES.coach) return;
  if (coachingOn()) return cgPublish();
  if (DEMO || Store.mode !== 'cloud' || Store.owner !== false || Date.now() - lastPub < 60000) return;
  lastPub = Date.now();
  try {
    await Store.db.doc('clients/' + Store.uid).set({
      name: P.coachName || '',
      goal: P.goalKg ? 'Reach ' + P.goalKg + ' kg' : '',
      st: myStatus(),
      ev: myEvents().slice(0, 10),
      msgs: (P.thread || []).filter(m => m.f === 'u').slice(-30),
      ph: sharedPhotos(),
      v: Date.now(),
    });
  } catch (e) {}
}
async function loadLive() {
  if (!FEATURES.coach) return;
  if (coachingOn()) return cgLoad(true);
  if (Store.mode !== 'cloud' || Store.owner === false) return;
  try {
    const qs = await withTimeout(Store.db.collection('clients').limit(200).get());
    const next = {};
    qs.docs.forEach(d => {
      if (d.id !== Store.uid) next[d.id] = clone(d.data());
    });
    LIVE = next;
    if (isCoach() && !sheets.length) render();
  } catch (e) {}
}
/* A client's app picks up what their coach assigned. */
async function pullAssign() {
  if (!FEATURES.coach) return;
  if (coachingOn()) return cgLoad();
  if (Store.mode !== 'cloud' || Store.owner !== false) return;
  try {
    const s = await withTimeout(Store.db.doc('assign/' + Store.uid).get());
    if (!s.exists) return;
    applyAssign(clone(s.data()));
  } catch (e) {}
}
/* Apply what a coach has set. `offer` (real accounts): a programme or new targets are put to the person as
   an offer they accept or decline, not applied behind their back. */
function applyAssign(a, offer) {
  {
    const seen = P.asg || (P.asg = {});
    let ch = false;
    const fresh = k => a[k] && a[k].v > (seen[k] || 0);
    if (offer && cgOffers(a, seen)) ch = true;
    if (!offer && fresh('prog') && a.prog.p) {
      const p = { ...a.prog.p, id: 'coach', src: 'coach' };
      saveProg(p);
      P.prog = { id: 'coach', at: 0, n: 0, started: today() };
      seen.prog = a.prog.v;
      ch = true;
    }
    if (fresh('rehab') && a.rehab.plan) {
      TR.rplans.coach = { ...a.rehab.plan, id: 'coach', custom: true };
      TR.rehab = { id: 'coach', phase: 0, started: today() };
      addTask('rehab');
      saveTR();
      seen.rehab = a.rehab.v;
      ch = true;
    }
    if (fresh('tasks')) {
      P.tasks = P.tasks
        .filter(t => !t.auto)
        .concat((a.tasks.keys || []).filter(k => TASK_AUTO[k]).map(k => ({ id: k, auto: k })));
      seen.tasks = a.tasks.v;
      ch = true;
    }
    if (!offer && fresh('t')) {
      P.t.k = a.t.k;
      if (a.t.p) P.t.p = a.t.p;
      seen.t = a.t.v;
      ch = true;
    }
    if (fresh('msg')) {
      P.coachMsg = { d: a.msg.d, t: a.msg.t };
      seen.msg = a.msg.v;
      ch = true;
    }
    if (a.chat && a.chat.list) {
      const th = myThread(),
        add = a.chat.list.filter(m => !th.some(x => x.id === m.id));
      if (add.length) {
        P.thread = th
          .concat(add)
          .sort((x, y) => x.ts - y.ts)
          .slice(-CHAT_MAX);
        saveProfile();
        if (!sheets.length) render();
        if (!CH) toast('New message from your coach');
      }
    }
    if (ch) {
      saveProfile();
      render();
      toast('Your coach updated your plan');
    }
  }
}
A.coachMsgOk = () => {
  P.coachMsg = null;
  saveProfile();
  render();
};

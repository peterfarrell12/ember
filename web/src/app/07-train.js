/* ================= v3: training, rehab, recovery, tasks ================= */
let TR = null;
S.progs = {};
const defaultTR = () => ({ lifts: {}, sess: [], rehab: null, rplans: {}, rlog: {}, ready: {}, cx: {} });
const saveTR = () => Store.put('meta', 'train', TR);
const lifts = () =>
  WK && WK.client && CO.clients[WK.client]
    ? CO.clients[WK.client].lifts || (CO.clients[WK.client].lifts = {})
    : TR.lifts;
const exn = it =>
  typeof it === 'string' ? (EXS[it] && EXS[it].n) || (TR.cx[it] && TR.cx[it].n) || it : it.name || exn(it.ex);
const exg = id => (EXS[id] && EXS[id].g) || (TR.cx[id] && TR.cx[id].g) || 'legs';
const isLift = id => LIFT_GROUPS.includes(exg(id));
function parseReps(s) {
  const m = String(s || '').match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(sec|s|min|km|m)?(?![a-z])/i);
  if (!m) return { lo: 0, hi: 0, u: 'reps' };
  const u = (m[3] || '').toLowerCase();
  return { lo: +m[1], hi: +(m[2] || m[1]), u: u === 's' || u === 'sec' ? 's' : u || 'reps' };
}
const itemLine = it =>
  it.sets +
  ' × ' +
  it.reps +
  (it.rest ? ' · rest ' + (it.rest >= 120 && it.rest % 60 === 0 ? it.rest / 60 + ' min' : it.rest + ' s') : '');
const mmss = s => Math.floor(s / 60) + ':' + pad(Math.floor(s % 60));
let actx = null;
function initAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) {}
}
function beep(f = 880, ms = 200) {
  try {
    if (!actx) return;
    const o = actx.createOscillator(),
      g = actx.createGain();
    o.frequency.value = f;
    o.connect(g);
    g.connect(actx.destination);
    g.gain.setValueAtTime(0.18, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + ms / 1000);
    o.start();
    o.stop(actx.currentTime + ms / 1000);
  } catch (e) {}
}

/* ---------- programs ---------- */
const activeProg = () => (P.prog && S.progs[P.prog.id] && S.progs[P.prog.id].days.length ? S.progs[P.prog.id] : null);
function daysHtml(p, startable) {
  return p.days
    .map(
      (
        d,
        i,
      ) => `<div class="card"><div class="between"><h2>${esc(d.n)}</h2>${startable ? `<button class="btn sm ghost" data-act="trainDay" data-i="${i}">${ic('play', 'fill')} Start</button>` : `<span class="muted small">${d.items.length} exercises</span>`}</div>${d.focus || d.goal ? `<p class="small muted" style="margin-top:2px">${esc(d.focus || d.goal)}</p>` : ''}
    ${d.items.map(it => `<div class="entry" style="cursor:default"><span class="n">${esc(exn(it))}</span><span class="k muted small">${esc(it.sets + ' × ' + it.reps)}</span>${it.note ? `<span class="s">${esc(it.note)}</span>` : ''}</div>`).join('')}</div>`,
    )
    .join('');
}
A.progs = () => {
  const mine = Object.values(S.progs),
    act = activeProg();
  openSheet(
    `${sh('Programs')}<div class="sheet-b">
    <div class="two"><button class="act" data-act="progAI">${ic('spark')}<span>Build one for me<small>Goal, days, kit</small></span></button><button class="act" data-act="progNew">${ic('edit')}<span>Make my own<small>Your routine</small></span></button></div>
    ${mine.length ? `<div class="grp">Yours</div><div class="list">${mine.map(p => `<button class="res" data-act="progView" data-id="${p.id}"><span class="n">${esc(p.n)}</span><span class="k">${act && act.id === p.id ? '<span class="pill good">Active</span>' : ''}</span><span class="s">${p.days.length} day${p.days.length === 1 ? '' : 's'} a week${p.weeks ? ' · ' + p.weeks + ' weeks' : ''}</span></button>`).join('')}</div>` : ''}
    <div class="grp">Ready-made</div><div class="list">${TEMPLATES.map(t => `<button class="res" data-act="tplView" data-id="${t.id}"><span class="n">${esc(t.n)}</span><span class="k"><span class="pill">${esc(t.tag)}</span></span><span class="s" style="white-space:normal">${esc(t.about)}</span></button>`).join('')}</div></div>`,
    true,
  );
};
A.tplView = ({ id }) => {
  const t = TEMPLATES.find(x => x.id === id);
  openSheet(
    `${sh(t.n)}<div class="sheet-b"><p class="muted">${esc(t.about)} Runs for ${t.weeks} weeks.</p>${daysHtml(t)}</div><div class="sheet-f">${isCoach() ? coachBtn('prog', id) : `<button class="btn ember" data-act="progUse" data-tpl="${id}">Start this program</button>`}</div>`,
    true,
  );
};
A.progView = ({ id }) => {
  const p = S.progs[id];
  if (!p) return;
  const act = activeProg() && P.prog.id === id;
  openSheet(
    `${sh(p.n)}<div class="sheet-b">${p.about ? `<p class="muted">${esc(p.about)}</p>` : ''}${daysHtml(p, act)}</div><div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="progDelete" data-id="${id}" aria-label="Delete program">${ic('trash')}</button><button class="btn ghost" style="width:auto" data-act="progEdit" data-id="${id}" aria-label="Edit program">${ic('edit')}</button>${isCoach() ? coachBtn('prog', id) : act ? '' : `<button class="btn ember" data-act="progUse" data-id="${id}">Make this my program</button>`}</div>`,
    true,
  );
};
function saveProg(p) {
  S.progs[p.id] = p;
  Store.put('programs', p.id, p);
}
A.progUse = ({ id, tpl }) => {
  if (tpl) {
    const t = TEMPLATES.find(x => x.id === tpl);
    const p = clone({ id: newId(), n: t.n, about: t.about, weeks: t.weeks, days: t.days, src: 'tpl' });
    saveProg(p);
    id = p.id;
  }
  P.prog = { id, at: 0, n: 0, started: today() };
  saveProfile();
  closeAll();
  S.tab = 'train';
  render();
  toast('Program set. Your first session is ready.');
};
A.progDelete = ({ id }) => {
  delete S.progs[id];
  Store.del('programs', id);
  if (P.prog && P.prog.id === id) {
    P.prog = null;
    saveProfile();
  }
  closeAll();
  render();
  toast('Program deleted');
};
A.progAI = () => {
  const sel = (id, opts) =>
    `<select class="inp" id="${id}">${opts.map(o => `<option>${o}</option>`).join('')}</select>`;
  openSheet(
    `${sh('Build a program')}<div class="sheet-b" id="aiBody">
    <label class="f">Main goal${sel('aiGoal', ['Build muscle', 'Get stronger', 'Lose fat and keep muscle', 'Hyrox performance', 'Field sport performance', 'Padel or tennis performance', 'Running performance', 'General fitness'])}</label>
    <div class="grid2"><label class="f">Days a week${sel('aiDays', [3, 2, 4, 5, 6])}</label><label class="f">Session length${sel('aiLen', ['60 minutes', '30 minutes', '45 minutes', '75 minutes'])}</label></div>
    <label class="f">Kit${sel('aiKit', ['Full gym', 'Dumbbells and a bench', 'Bands and bodyweight', 'Bodyweight only'])}</label>
    <label class="f">Experience${sel('aiLvl', ['Trained for a year or more', 'New to lifting', 'Trained for several years'])}</label>
    <label class="f">Anything to work around, optional<input class="inp" id="aiNote" placeholder="Matches on Sundays. Tight hips." autocomplete="off"></label>
  </div><div class="sheet-f"><button class="btn ember" data-act="progAIGo">${ic('spark')} Write my program</button></div>`,
    true,
  );
};
const CATALOG = () =>
  Object.values(EXS)
    .map(e => e.id + ': ' + e.n + ' (' + e.g + ', ' + EQUIP[e.eq].toLowerCase() + ')')
    .join('\n');
function cleanItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(it => {
      if (!it) return null;
      let ex = EXS[it.ex] ? it.ex : '';
      const name = String(it.name || '')
        .trim()
        .slice(0, 60);
      if (!ex && name) {
        const hit = Object.values(EXS).find(e => e.n.toLowerCase() === name.toLowerCase());
        if (hit) ex = hit.id;
        else {
          ex = 'x' + newId();
          TR.cx[ex] = { n: name, g: 'rehab' };
        }
      }
      return ex
        ? {
            ex,
            sets: clamp(r0(num(it.sets, 3)), 1, 10),
            reps: String(it.reps || '10').slice(0, 14),
            rest: clamp(r0(num(it.rest, 60)), 0, 600),
            ...(it.note ? { note: String(it.note).slice(0, 90) } : {}),
          }
        : null;
    })
    .filter(Boolean);
}
A.progAIGo = async () => {
  if (!AI.sample)
    return toast(
      'Building a program needs Claude, which is not available in this view. Pick a ready-made one instead.',
    );
  const v = id => $(id).value;
  const ask = `Goal: ${v('#aiGoal')}. ${v('#aiDays')} sessions a week of about ${v('#aiLen')}. Kit: ${v('#aiKit')}. Experience: ${v('#aiLvl')}.${v('#aiNote').trim() ? ' Work around: ' + v('#aiNote').trim().slice(0, 300) + '.' : ''}`;
  const body = $('#aiBody'),
    foot = topSheet().querySelector('.sheet-f');
  foot.classList.add('hide');
  body.innerHTML = `<div class="busy"><div class="spinner"></div>Writing your program</div>`;
  try {
    const r = await AI.sample.json(['build_program', { ask, catalog: CATALOG() }], {
      cache: false,
      modelTier: 'default',
    });
    const days = (r && Array.isArray(r.days) ? r.days : [])
      .map((d, i) => ({
        n: String(d.name || 'Day ' + (i + 1)).slice(0, 40),
        focus: String(d.focus || '').slice(0, 80),
        items: cleanItems(d.items),
      }))
      .filter(d => d.items.length);
    if (!days.length) throw { code: 'invalid_json' };
    const p = {
      id: newId(),
      n: String(r.name || 'My program').slice(0, 50),
      about: String(r.about || '').slice(0, 200),
      weeks: clamp(r0(num(r.weeks, 8)), 1, 26),
      days,
      src: 'ai',
    };
    saveProg(p);
    saveTR();
    closeAll();
    A.progView({ id: p.id });
  } catch (e) {
    closeSheet();
    toast(aiError(e));
  }
};

/* ---------- program and rehab plan editor ---------- */
let PE = null;
A.progNew = () => openEditor({ kind: 'prog', p: { id: '', n: '', days: [{ n: 'Day 1', focus: '', items: [] }] } });
A.progEdit = ({ id }) => openEditor({ kind: 'prog', p: clone(S.progs[id]) });
function openEditor(pe) {
  PE = pe;
  closeAll();
  const rh = pe.kind === 'rehab';
  openSheet(
    `${sh(rh ? 'Rehab plan' : pe.p.id ? 'Edit program' : 'New program')}<div class="sheet-b" id="peBody"></div><div class="sheet-f"><button class="btn" data-act="peSave">Save ${rh ? 'and start' : 'program'}</button></div>`,
    true,
  );
  renderEditor();
}
function renderEditor() {
  const b = $('#peBody');
  if (!b) return;
  const rh = PE.kind === 'rehab',
    w = rh ? 'phase' : 'day';
  b.innerHTML = `<label class="f">Name<input class="inp" value="${esc(PE.p.n)}" placeholder="${rh ? 'Physio plan' : 'My routine'}" data-on="peName" autocomplete="off"></label>
    ${PE.p.days
      .map(
        (
          d,
          i,
        ) => `<div class="card stack"><input class="inp" value="${esc(d.n)}" data-on="peDay" data-i="${i}" aria-label="Name of this ${w}">
      <div>${d.items.map((it, j) => `<button class="entry" data-act="peItem" data-i="${i}" data-j="${j}"><span class="n">${esc(exn(it))}</span><span class="k muted small">${ic('edit')}</span><span class="s">${esc(itemLine(it))}${it.note ? ' · ' + esc(it.note) : ''}</span></button>`).join('') || `<p class="empty">No exercises yet.</p>`}</div>
      <button class="addline" data-act="peAdd" data-i="${i}">${ic('plus')} Add an exercise</button>${PE.p.days.length > 1 ? `<button class="link" data-act="peDelDay" data-i="${i}" style="align-self:flex-start;color:var(--muted)">Remove this ${w}</button>` : ''}</div>`,
      )
      .join('')}
    <button class="btn ghost" data-act="peAddDay">${ic('plus')} Add a ${w}</button>`;
}
I.peName = el => (PE.p.n = el.value);
I.peDay = el => (PE.p.days[+el.dataset.i].n = el.value);
A.peAddDay = () => {
  PE.p.days.push({ n: (PE.kind === 'rehab' ? 'Phase ' : 'Day ') + (PE.p.days.length + 1), focus: '', items: [] });
  renderEditor();
};
A.peDelDay = ({ i }) => {
  PE.p.days.splice(+i, 1);
  renderEditor();
};
A.peAdd = ({ i }) =>
  openPicker(id => {
    PE.p.days[+i].items.push({
      ex: id,
      sets: 3,
      reps: exg(id) === 'mobility' ? '30s' : isLift(id) ? '8-12' : '10',
      rest: isLift(id) ? 90 : 30,
    });
    renderEditor();
  });
A.peItem = ({ i, j }) => {
  const it = PE.p.days[+i].items[+j];
  openSheet(`${sh(exn(it))}<div class="sheet-b"><div class="grid3"><label class="f">Sets<input class="inp" id="piS" inputmode="numeric" value="${it.sets}"></label><label class="f">Reps or time<input class="inp" id="piR" value="${esc(it.reps)}"></label><label class="f">Rest, s<input class="inp" id="piT" inputmode="numeric" value="${it.rest || 0}"></label></div>
    <label class="f">Note, optional<input class="inp" id="piN" value="${esc(it.note || '')}" autocomplete="off"></label><p class="tiny muted">Reps can be a number, a range like 8-12, a hold like 30s, or a distance like 400 m.</p></div>
    <div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="piDel" aria-label="Remove exercise">${ic('trash')}</button><button class="btn" data-act="piOk">Done</button></div>`);
  A.piOk = () => {
    it.sets = clamp(r0(num($('#piS').value, 3)), 1, 12);
    it.reps = $('#piR').value.trim() || '10';
    it.rest = clamp(r0(num($('#piT').value)), 0, 900);
    const n = $('#piN').value.trim();
    if (n) it.note = n;
    else delete it.note;
    closeSheet();
    renderEditor();
  };
  A.piDel = () => {
    PE.p.days[+i].items.splice(+j, 1);
    closeSheet();
    renderEditor();
  };
};
A.peSave = () => {
  const p = PE.p;
  p.n = (p.n || '').trim();
  if (!p.n) return toast('Give it a name.');
  p.days = p.days.filter(d => d.items.length);
  if (!p.days.length) return toast('Add at least one exercise.');
  if (PE.kind === 'client') {
    const c = CO.clients[PE.cid];
    c.prog = { n: p.n, weeks: (c.prog && c.prog.weeks) || 0, days: p.days };
    saveCO();
    saveTR();
    const cid = PE.cid;
    closeAll();
    render();
    A.coClient({ id: cid });
    toast('Program updated');
    return;
  }
  if (PE.kind === 'rehab') {
    const id = p.id || 'c' + newId();
    TR.rplans[id] = {
      id,
      n: p.n,
      intro: 'Your own plan.',
      custom: true,
      phases: p.days.map(d => ({ n: d.n, goal: d.focus || '', items: d.items })),
    };
    startRehab(id);
    return;
  }
  if (!p.id) p.id = newId();
  saveProg(p);
  saveTR();
  if (!activeProg()) P.prog = { id: p.id, at: 0, n: 0, started: today() };
  saveProfile();
  closeAll();
  S.tab = 'train';
  render();
  toast('Program saved');
};

/* ---------- exercise picker and library ---------- */
let PK = null;
function openPicker(cb, title = 'Add an exercise', g = '') {
  PK = { cb, q: '', g };
  openSheet(
    `${sh(title)}<div class="sheet-b"><div class="searchbar">${ic('search')}<input id="pkQ" type="text" placeholder="Search ${Object.keys(EXS).length} exercises" data-on="pk" autocomplete="off" autocapitalize="off"></div>
    <select class="inp" id="pkG" data-on="pk" aria-label="Type"><option value="">All types</option>${Object.entries(
      GROUPS,
    )
      .map(([k, v]) => `<option value="${k}" ${k === g ? 'selected' : ''}>${v}</option>`)
      .join('')}</select><div id="pkList"></div></div>`,
    true,
  );
  renderPicker();
}
function renderPicker() {
  const q = PK.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = Object.values(EXS).concat(
    Object.entries(TR.cx).map(([id, c]) => ({ id, n: c.n, g: c.g, eq: 'other', mine: true })),
  );
  const hits = all.filter(e => (!PK.g || e.g === PK.g) && q.every(t => e.n.toLowerCase().includes(t))).slice(0, 80);
  $('#pkList').innerHTML =
    (hits.length
      ? `<div class="list">${hits.map(e => `<button class="res" data-act="pkPick" data-id="${e.id}"><span class="n">${esc(e.n)}</span><span class="k muted small">${lifts()[e.id] && lifts()[e.id].pr ? 'Best ' + r0(lifts()[e.id].pr) + ' kg' : ''}</span><span class="s">${GROUPS[e.g] || ''}${e.mine ? ' · yours' : ' · ' + EQUIP[e.eq]}</span></button>`).join('')}</div>`
      : `<p class="empty">Nothing matches.</p>`) +
    (PK.q.trim().length > 2
      ? `<button class="btn sm ghost" data-act="pkNew" style="margin-top:10px">${ic('plus')} Add "${esc(PK.q.trim())}" as my own exercise</button>`
      : '');
}
I.pk = () => {
  PK.q = $('#pkQ').value;
  PK.g = $('#pkG').value;
  renderPicker();
};
A.pkPick = ({ id }) => {
  const cb = PK.cb;
  closeSheet();
  cb(id);
};
A.pkNew = () => {
  const id = 'x' + newId();
  TR.cx[id] = { n: PK.q.trim().slice(0, 60), g: PK.g || 'legs' };
  saveTR();
  A.pkPick({ id });
};
A.exLib = () => openPicker(id => A.exInfo({ id }), 'Exercise library');
A.exInfo = ({ id }) => {
  const e = EXS[id] || { n: exn(id), g: exg(id), eq: 'other', cue: '' },
    L = lifts()[id];
  let chart = '';
  if (L && L.h && L.h.length > 1) {
    const v = L.h.map(h => h[1] * (1 + h[2] / 30)),
      lo = Math.min(...v) * 0.97,
      hi = Math.max(...v) * 1.03,
      W = 320,
      H = 90;
    const pts = v
      .map(
        (y, i) =>
          (8 + ((W - 16) * i) / (v.length - 1)).toFixed(1) +
          ',' +
          (8 + (H - 26) * (1 - (y - lo) / (hi - lo || 1))).toFixed(1),
      )
      .join(' ');
    chart = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Strength over time"><polyline points="${pts}" fill="none" stroke="var(--ember)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><text x="8" y="${H - 4}">${niceDate(L.h[0][0])}</text><text x="${W - 8}" y="${H - 4}" text-anchor="end">${niceDate(L.h[L.h.length - 1][0])}</text></svg>`;
  }
  openSheet(`${sh(e.n)}<div class="sheet-b"><div class="row"><span class="pill">${GROUPS[e.g] || 'Exercise'}</span><span class="pill">${EQUIP[e.eq] || 'Your exercise'}</span></div>${e.cue ? `<p>${esc(e.cue)}</p>` : ''}
    ${L && (L.pr || L.last) ? `<div class="card stack">${L.pr ? `<div><span class="num" style="font-size:30px">${r0(L.pr)} kg</span> <span class="muted small">best estimated one-rep max</span></div><div class="small muted tn">${[90, 80, 70, 60].map(p => p + '% is ' + round25((L.pr * p) / 100) + ' kg').join(' · ')}</div>` : ''}${L.note ? `<div class="small">${ic('pen')} ${esc(L.note)}</div>` : ''}${L.last ? `<div class="small">Last time: ${esc(L.last.map(s => (s[0] ? s[0] + ' kg × ' : '') + s[1]).join(', '))}</div>` : ''}${chart}</div>` : `<p class="small muted">No sessions logged for this one yet.</p>`}</div>`);
};

/* ---------- workout player ---------- */
let WK = LS.get('ember:wk'),
  wkTimer = 0;
const saveDraft = () => (WK ? LS.set('ember:wk', WK) : LS.del('ember:wk'));
function suggest(it) {
  const L = lifts()[it.ex];
  if (!L || !L.last || !L.last.length) return { w: '', tip: '' };
  const ws = L.last.map(s => s[0]).filter(w => w > 0);
  if (!ws.length) return { w: '', tip: '' };
  const w = Math.max(...ws),
    rp = parseReps(it.reps);
  if (rp.u === 'reps' && rp.hi && L.last.length >= (it.sets || 1) && L.last.every(s => s[1] >= rp.hi && s[0] >= w)) {
    const up = w >= 40 ? 2.5 : w >= 10 ? 1 : 0.5;
    return { w: w + up, tip: 'You hit ' + rp.hi + ' on every set last time, so go up to ' + (w + up) + ' kg.' };
  }
  return { w, tip: '' };
}
const mkItem = it => {
  const s = suggest(it);
  return {
    ex: it.ex,
    sets: Array.from({ length: it.sets || 3 }, () => ({ w: s.w, r: '', done: 0 })),
    t: { reps: it.reps || '', rest: it.rest || 0, note: it.note || '' },
    tip: s.tip,
  };
};
function startSession(name, items, meta = {}) {
  initAudio();
  WK = {
    name,
    start: Date.now(),
    kind: meta.kind || 'train',
    progId: meta.progId || '',
    client: meta.client || '',
    items: [],
    pain: 0,
    rpe: 7,
    timer: null,
  };
  WK.items = items.map(mkItem);
  saveDraft();
  openPlayer();
}
A.trainStart = () => {
  const p = activeProg();
  if (!p) return A.progs();
  const d = p.days[P.prog.at % p.days.length];
  startSession(d.n, d.items, { progId: p.id });
};
A.trainDay = ({ i }) => {
  const p = activeProg();
  const d = p.days[+i];
  P.prog.at = +i;
  startSession(d.n, d.items, { progId: p.id });
};
A.quickStart = () => startSession('Workout', [], {});
A.wkResume = () => openPlayer();
A.wkDiscard = () => {
  WK = null;
  saveDraft();
  render();
  toast('Session discarded');
};
function openPlayer() {
  closeAll();
  openSheet(
    `<div class="sheet-h"><h3>${esc(WK.name)}${WK.client && CO.clients[WK.client] ? `<span class="small muted" style="display:block;font-family:var(--body);font-weight:600">with ${esc(CO.clients[WK.client].name)}</span>` : ''}</h3><span class="pill tn" id="wkClock">0:00</span><button class="icon-btn" data-act="wkHide" aria-label="Close and keep for later">${ic('x')}</button></div><div class="sheet-b" id="wkBody"></div>
    <div class="sheet-f" style="flex-direction:column"><div class="row hide" id="wkRest"><b class="tn" id="wkRestT" style="min-width:92px"></b><div class="grow prog"><i id="wkRestBar"></i></div><button class="link" data-act="wkRestAdj" data-n="-15">-15</button><button class="link" data-act="wkRestAdj" data-n="15">+15</button><button class="link" data-act="wkSkip">Skip</button></div>
    ${WK.kind === 'rehab' ? `<label class="f">Pain during this session, 0 is none and 10 is the worst: <b id="wkPainV" style="color:var(--ink)">${WK.pain || 0}</b><input type="range" min="0" max="10" step="1" value="${WK.pain || 0}" id="wkPain" data-on="wkPain"></label>` : ''}
    ${WK.kind === 'train' ? `<label class="f">How hard was it, 1 easy to 10 all out: <b id="wkRpeV" style="color:var(--ink)">${WK.rpe || 7}</b><input type="range" min="1" max="10" step="1" value="${WK.rpe || 7}" id="wkRpe" data-on="wkRpe"></label>` : ''}
    <button class="btn ember" data-act="wkFinish">${ic('check')} Finish session</button></div>`,
    true,
  );
  const w = sheets[sheets.length - 1];
  w._locked = true;
  w._onClose = () => clearInterval(wkTimer);
  renderPlayer();
  clearInterval(wkTimer);
  wkTimer = setInterval(wkClock, 400);
  wkClock();
}
function wkClock() {
  if (!WK || !$('#wkClock')) return clearInterval(wkTimer);
  $('#wkClock').textContent = mmss((Date.now() - WK.start) / 1000);
  const t = WK.timer,
    box = $('#wkRest');
  if (!t) return box.classList.add('hide');
  const left = (t.end - Date.now()) / 1000;
  if (left <= 0) {
    beep(t.then ? 660 : 880);
    WK.timer = null;
    if (t.then) {
      const s = WK.items[t.then[0]] && WK.items[t.then[0]].sets[t.then[1]];
      if (s && !s.done) setDone(t.then[0], t.then[1]);
    }
    box.classList.add('hide');
    saveDraft();
    return;
  }
  box.classList.remove('hide');
  $('#wkRestT').textContent = t.label + ' ' + mmss(Math.ceil(left));
  $('#wkRestBar').style.width = clamp(100 - (left / t.total) * 100, 0, 100) + '%';
}
function renderPlayer() {
  const b = $('#wkBody');
  if (!b) return;
  b.innerHTML =
    WK.items
      .map((it, i) => {
        const rp = parseReps(it.t.reps),
          L = lifts()[it.ex],
          g = exg(it.ex);
        const showW = (!['cond', 'mobility'].includes(g) && rp.u === 'reps') || it.sets.some(s => s.w !== '');
        const hold = rp.u === 's' || rp.u === 'min';
        return `<section class="card"><div class="between"><button class="wkn" data-act="exInfo" data-id="${it.ex}">${esc(exn(it.ex))}</button><button class="icon-btn" data-act="wkMenu" data-i="${i}" aria-label="Options">${ic('more', 'fill')}</button></div>
      <div class="small muted">${it.t.reps ? esc(it.sets.length + ' × ' + it.t.reps) : ''}${it.t.rest ? ' · rest ' + it.t.rest + ' s' : ''}${it.t.note ? ' · ' + esc(it.t.note) : ''}</div>
      ${L && L.last ? `<div class="tiny muted" style="margin-top:3px">Last time: ${esc(L.last.map(s => (s[0] ? s[0] + ' × ' : '') + s[1]).join(', '))}</div>` : ''}${L && L.note ? `<div class="tiny" style="margin-top:3px">${ic('pen')} ${esc(L.note)}</div>` : ''}${it.tip ? `<div class="pill good" style="margin-top:6px;white-space:normal">${ic('chart')} ${esc(it.tip)}</div>` : ''}
      <div class="sets">${it.sets.map((s, j) => `<div class="setrow ${s.done ? 'on' : ''}"><span class="sn">${j + 1}</span>${showW ? `<input class="inp" inputmode="decimal" placeholder="kg" value="${s.w}" data-on="wk" data-i="${i}" data-j="${j}" data-f="w" aria-label="Weight, set ${j + 1}">` : ''}<input class="inp" inputmode="decimal" placeholder="${esc(it.t.reps || 'reps')}" value="${s.r}" data-on="wk" data-i="${i}" data-j="${j}" data-f="r" aria-label="${hold ? 'Time' : 'Reps'}, set ${j + 1}">${hold ? `<button class="icon-btn solid" data-act="wkHold" data-i="${i}" data-j="${j}" aria-label="Start the timer">${ic('timer')}</button>` : ''}<button class="tick" data-act="wkTick" data-i="${i}" data-j="${j}" aria-label="Set ${j + 1} done" aria-pressed="${!!s.done}">${ic('check')}</button></div>`).join('')}</div>
      <button class="link" data-act="wkAddSet" data-i="${i}" style="font-size:13px">+ Add a set</button></section>`;
      })
      .join('') +
    `<button class="btn ghost" data-act="wkAdd">${ic('plus')} Add an exercise</button>${WK.items.length ? '' : `<p class="empty">Add your first exercise to get going.</p>`}`;
}
I.wk = el => {
  WK.items[+el.dataset.i].sets[+el.dataset.j][el.dataset.f] = el.value;
  saveDraft();
};
I.wkRpe = el => {
  WK.rpe = +el.value;
  $('#wkRpeV').textContent = el.value;
  saveDraft();
};
A.wkRestAdj = ({ n }) => {
  if (!WK.timer) return;
  WK.timer.end += +n * 1000;
  WK.timer.total = Math.max(5, WK.timer.total + +n);
  wkClock();
};
I.wkPain = el => {
  WK.pain = +el.value;
  $('#wkPainV').textContent = el.value;
  saveDraft();
};
function setDone(i, j) {
  const it = WK.items[i],
    s = it.sets[j];
  s.done = 1;
  if (s.r === '' || s.r == null) {
    const rp = parseReps(it.t.reps);
    s.r = rp.hi || '';
  }
  saveDraft();
  renderPlayer();
}
A.wkTick = ({ i, j }) => {
  initAudio();
  const it = WK.items[+i],
    s = it.sets[+j];
  if (s.done) {
    s.done = 0;
    saveDraft();
    return renderPlayer();
  }
  setDone(+i, +j);
  const lastOne = WK.items.every(x => x.sets.every(y => y.done));
  if (it.t.rest > 0 && !lastOne) WK.timer = { end: Date.now() + it.t.rest * 1000, total: it.t.rest, label: 'Rest' };
  saveDraft();
  wkClock();
};
A.wkHold = ({ i, j }) => {
  initAudio();
  const it = WK.items[+i],
    rp = parseReps(it.t.reps);
  const secs = num(it.sets[+j].r) || (rp.u === 'min' ? rp.hi * 60 : rp.hi) || 30;
  WK.timer = { end: Date.now() + secs * 1000, total: secs, label: 'Hold', then: [+i, +j] };
  beep(520, 120);
  wkClock();
};
A.wkSkip = () => {
  WK.timer = null;
  wkClock();
};
A.wkAddSet = ({ i }) => {
  const it = WK.items[+i],
    l = it.sets[it.sets.length - 1];
  it.sets.push({ w: l ? l.w : '', r: '', done: 0 });
  saveDraft();
  renderPlayer();
};
A.wkAdd = () =>
  openPicker(id => {
    WK.items.push(
      mkItem({
        ex: id,
        sets: 3,
        reps: isLift(id) ? '8-12' : exg(id) === 'mobility' ? '30s' : '10',
        rest: isLift(id) ? 90 : 30,
      }),
    );
    saveDraft();
    renderPlayer();
  });
A.wkMenu = ({ i }, el, e) => {
  e.stopPropagation();
  openMenu(el, [
    { act: 'wkTools', icon: 'scale', label: 'Warm-up sets and plates', data: { i } },
    { act: 'wkNote', icon: 'pen', label: 'Note for this exercise', data: { i } },
    { act: 'wkSwap', icon: 'copy', label: 'Swap for another exercise', data: { i } },
    { act: 'wkDelSet', icon: 'minus', label: 'Remove the last set', data: { i } },
    { act: 'wkDelEx', icon: 'trash', label: 'Remove this exercise', data: { i } },
  ]);
};
A.wkSwap = ({ i }) =>
  openPicker(
    id => {
      const it = WK.items[+i];
      const fresh = mkItem({ ex: id, sets: it.sets.length, reps: it.t.reps, rest: it.t.rest });
      WK.items[+i] = fresh;
      saveDraft();
      renderPlayer();
    },
    'Swap exercise',
    exg(WK.items[+i].ex),
  );
A.wkDelSet = ({ i }) => {
  const it = WK.items[+i];
  if (it.sets.length > 1) it.sets.pop();
  saveDraft();
  renderPlayer();
};
A.wkDelEx = ({ i }) => {
  WK.items.splice(+i, 1);
  saveDraft();
  renderPlayer();
};
A.wkHide = () => {
  closeSheet();
  render();
};
A.wkFinish = async () => {
  const done = WK.items
    .map(it => ({ ex: it.ex, sets: it.sets.filter(s => s.done).map(s => [num(s.w), num(s.r)]) }))
    .filter(it => it.sets.length);
  if (!done.length) return toast('Tick at least one set before you finish.');
  const own = !WK.client,
    cl = own ? null : CO.clients[WK.client],
    d = own ? await loadDay(today()) : null,
    date = today(),
    LS2 = lifts();
  const dur = clamp(Math.round((Date.now() - WK.start) / 60000), 1, 240),
    kind = WK.kind;
  let vol = 0,
    nsets = 0;
  const prs = [],
    mg = {};
  for (const it of done) {
    const L = LS2[it.ex] || (LS2[it.ex] = { h: [], pr: 0 });
    let best = 0,
      top = null;
    if (kind === 'train') mg[exg(it.ex)] = (mg[exg(it.ex)] || 0) + it.sets.length;
    for (const [w, r] of it.sets) {
      nsets++;
      if (w > 0 && r > 0) {
        vol += w * r;
        const e1 = w * (1 + r / 30);
        if (e1 > best) {
          best = e1;
          top = [w, r];
        }
      }
    }
    if (kind === 'train' && isLift(it.ex) && top) {
      if (best > (L.pr || 0) * 1.001) {
        if (L.pr) prs.push(exn(it.ex) + ', ' + top[0] + ' kg × ' + top[1]);
        L.pr = Math.round(best * 10) / 10;
      }
      L.h = (L.h || []).concat([[date, top[0], top[1]]]).slice(-24);
    }
    L.last = it.sets;
  }
  const rpe = kind === 'train' ? WK.rpe || 7 : 3,
    id = date + '-' + newId(),
    sum = { id, d: date, n: WK.name, dur, vol: r0(vol), sets: nsets, prs: prs.length, kind, rpe, load: rpe * dur, mg };
  const items = done.map(it => ({ ex: it.ex, n: exn(it.ex), sets: it.sets }));
  const cele = xp => ({
    icon: kind === 'rehab' ? 'pulse' : 'dumbbell',
    tone: prs.length ? '' : 'good',
    title: prs.length
      ? prs.length === 1
        ? 'New personal record'
        : prs.length + ' personal records'
      : kind === 'rehab'
        ? 'Rehab done'
        : 'Session complete',
    sub: WK.name + (cl ? ' with ' + cl.name : ''),
    confetti: prs.length > 0,
    list: [
      ['Time', dur + ' min', 1],
      ['Sets', String(nsets), 1],
    ].concat(
      vol ? [['Volume lifted', fmt(vol) + ' kg', 1]] : [],
      prs.map(p => [p, 'Record', 1]),
    ),
    rewards: xp ? ['+' + xp + ' XP'].concat(prs.length ? ['+5 gems'] : []) : [],
  });
  if (cl) {
    cl.sess = [{ ...sum, items }].concat(cl.sess || []).slice(0, 40);
    cl.sess.forEach((s, k) => {
      if (k >= 12) delete s.items;
    });
    if (kind === 'rehab') {
      cl.st.painPrev = cl.st.pain ?? null;
      cl.st.pain = WK.pain || 0;
    } else if (WK.progId === 'client' && cl.prog) cl.progAt = (cl.progAt || 0) + 1;
    cl.st.upd = date;
    delete cl.st.updAgo;
    cl.ev = [
      {
        d: date,
        k: prs.length ? 'trophy' : kind === 'rehab' ? 'pulse' : 'dumbbell',
        s:
          (kind === 'rehab' ? 'Rehab: ' : 'Finished ') +
          WK.name +
          ', ' +
          dur +
          ' min' +
          (prs.length ? ', ' + prs.length + ' record' + (prs.length === 1 ? '' : 's') : '') +
          (kind === 'rehab' ? ', pain ' + (WK.pain || 0) + '/10' : ''),
      },
    ]
      .concat(cl.ev || [])
      .slice(0, 12);
    celeQ.unshift(cele(0));
    const cid = cl.id;
    WK = null;
    saveDraft();
    clearInterval(wkTimer);
    saveCO();
    closeAll();
    render();
    flushCele();
    A.coClient({ id: cid });
    return;
  }
  Store.put('sessions', id, { ...sum, items });
  TR.sess = [sum].concat(TR.sess).slice(0, 80);
  const met = kind === 'rehab' ? 2.5 : done.filter(it => exg(it.ex) === 'cond').length * 2 > done.length ? 8 : 5;
  const x = { id: newId(), n: WK.name, k: xk(met, 1, dur), min: dur, src: 'm', tr: kind };
  d.x.push(x);
  xlogAdd(d.date, x);
  P.st.work++;
  if (kind === 'rehab') {
    TR.rlog[d.date] = { pain: WK.pain || 0, done: 1 };
    P.st.rehab = (P.st.rehab || 0) + 1;
    const ks = Object.keys(TR.rlog).sort();
    ks.slice(0, Math.max(0, ks.length - 120)).forEach(k => delete TR.rlog[k]);
  } else {
    P.st.sess = (P.st.sess || 0) + 1;
    P.st.prs = (P.st.prs || 0) + prs.length;
    if (WK.progId && P.prog && P.prog.id === WK.progId) {
      P.prog.at++;
      P.prog.n++;
    }
  }
  const xp = kind === 'rehab' ? 15 : 30 + 10 * Math.min(prs.length, 3);
  grant(xp, prs.length ? 5 : 0, d, false);
  celeQ.unshift(cele(xp));
  WK = null;
  saveDraft();
  clearInterval(wkTimer);
  saveTR();
  closeAll();
  S.tab = 'train';
  commitDay(d);
};
function sessSheet(s) {
  SV = s;
  openSheet(
    `${sh(s.n)}<div class="sheet-b"><div class="row" style="flex-wrap:wrap"><span class="pill">${niceDate(s.d)}</span><span class="pill">${s.dur} min</span>${s.vol ? `<span class="pill">${fmt(s.vol)} kg lifted</span>` : ''}${s.rpe && s.kind === 'train' ? `<span class="pill">Effort ${s.rpe}/10</span>` : ''}${s.prs ? `<span class="pill gold">${s.prs} record${s.prs === 1 ? '' : 's'}</span>` : ''}</div>
    ${(s.items || []).length ? `<div class="list">${s.items.map(it => `<div class="res" style="cursor:default"><span class="n">${esc(it.n)}</span><span class="k"></span><span class="s" style="white-space:normal">${esc(it.sets.map(x => (x[0] ? x[0] + ' kg × ' : '') + x[1]).join(', '))}</span></div>`).join('')}</div>` : `<p class="small muted">Only the summary was kept for this one.</p>`}</div>
    ${(s.items || []).length && !WK ? `<div class="sheet-f"><button class="btn" data-act="sessAgain">${ic('play', 'fill')} Do this session again</button></div>` : ''}`,
    true,
  );
}
let SV = null;
A.sessView = async ({ id }) => {
  let s = null;
  try {
    s = await Store.get('sessions', id);
  } catch (e) {}
  if (!s) return toast('That session could not be loaded.');
  sessSheet(s);
};
A.sessAgain = () => {
  const s = SV;
  if (!s) return;
  const mode = a => {
    const c = {};
    a.forEach(v => (c[v] = (c[v] || 0) + 1));
    return Object.keys(c).sort((x, y) => c[y] - c[x])[0];
  };
  startSession(
    s.n,
    s.items.map(it => ({
      ex: it.ex,
      sets: it.sets.length,
      reps: String(mode(it.sets.map(x => x[1])) || 10),
      rest: isLift(it.ex) ? 90 : 30,
    })),
    { kind: s.kind === 'rehab' ? 'rehab' : 'train', client: SV.client || '' },
  );
};

/* ---------- rehab ---------- */
const rehabPlan = id => REHAB.find(r => r.id === id) || TR.rplans[id] || null;
function addTask(auto) {
  if (!P.tasks.some(t => t.auto === auto)) P.tasks.push({ id: auto, auto });
}
function startRehab(id) {
  TR.rehab = { id, phase: 0, started: today() };
  addTask('rehab');
  saveTR();
  saveProfile();
  closeAll();
  S.tab = 'train';
  render();
  toast('Rehab plan started');
}
A.rehabList = () =>
  openSheet(
    `${sh('Rehab plans')}<div class="sheet-b"><div class="banner">${ic('pulse')}<span>These are general strengthening progressions, not a diagnosis. ${FLAGS}</span></div>
  <button class="act" data-act="rehabCustom">${ic('label')}<span>Use my physio's plan<small>Type it, paste it or photograph the sheet</small></span></button>
  <div class="list">${REHAB.concat(Object.values(TR.rplans))
    .map(
      r =>
        `<button class="res" data-act="rehabView" data-id="${r.id}"><span class="n">${esc(r.n)}</span><span class="k muted small">${r.phases.length} phase${r.phases.length === 1 ? '' : 's'}</span><span class="s" style="white-space:normal">${esc(r.intro || '')}</span></button>`,
    )
    .join('')}</div></div>`,
    true,
  );
A.rehabView = ({ id }) => {
  const r = rehabPlan(id);
  if (!r) return;
  openSheet(
    `${sh(r.n)}<div class="sheet-b"><p class="muted">${esc(r.intro || '')}</p>${r.custom ? '' : `<div class="banner">${ic('pulse')}<span>${esc(r.flags || FLAGS)}</span></div>`}${daysHtml({ days: r.phases })}${r.custom ? '' : `<p class="small muted">${GATE}</p>`}</div>
    <div class="sheet-f">${r.custom ? `<button class="btn ghost" style="width:auto" data-act="rehabDel" data-id="${id}" aria-label="Delete plan">${ic('trash')}</button>` : ''}${isCoach() ? coachBtn('rehab', id) : `<button class="btn ember" data-act="rehabStart" data-id="${id}">Start this plan</button>`}</div>`,
    true,
  );
};
A.rehabStart = ({ id }) => startRehab(id);
A.rehabDel = ({ id }) => {
  delete TR.rplans[id];
  if (TR.rehab && TR.rehab.id === id) TR.rehab = null;
  saveTR();
  closeAll();
  render();
};
A.rehabGo = () => {
  const r = rehabPlan(TR.rehab.id),
    ph = r.phases[TR.rehab.phase];
  startSession(r.n + ': ' + ph.n, ph.items, { kind: 'rehab' });
};
A.rehabPhase = ({ n }) => {
  const r = rehabPlan(TR.rehab.id);
  TR.rehab.phase = clamp(TR.rehab.phase + +n, 0, r.phases.length - 1);
  saveTR();
  render();
};
A.rehabEnd = () => {
  TR.rehab = null;
  P.tasks = P.tasks.filter(t => t.auto !== 'rehab');
  saveTR();
  saveProfile();
  render();
  toast('Rehab plan ended');
};
A.rehabCustom = () => {
  openSheet(
    `${sh("Your physio's plan")}<div class="sheet-b" id="rcBody"><textarea class="inp" id="rcText" placeholder="Phase 1: clamshells 3 x 15 each side, glute bridge 3 x 12, side plank 3 x 20 seconds..."></textarea>
    ${AI.sample && AI.images ? `<button class="btn ghost" data-act="rcPhoto">${ic('camera')} Photograph the sheet instead</button>` : ''}
    <p class="small muted">Claude lays it out exactly as written, without adding or changing exercises. Check it against the original before you start.</p></div>
    <div class="sheet-f"><button class="btn ghost" data-act="rcHand">Build by hand</button><button class="btn ember" data-act="rcGo">${ic('spark')} Lay it out</button></div>`,
    true,
  );
};
A.rcHand = () => openEditor({ kind: 'rehab', p: { id: '', n: '', days: [{ n: 'Phase 1', focus: '', items: [] }] } });
A.rcPhoto = () => {
  const inp = $('#fileMenu');
  inp.dataset.for = 'rehab';
  inp.click();
};
async function rehabFromAI(text, files) {
  if (!AI.sample) return toast('This needs Claude, which is not available in this view. Use Build by hand.');
  const body = $('#rcBody'),
    foot = topSheet().querySelector('.sheet-f');
  foot.classList.add('hide');
  body.innerHTML = `<div class="busy"><div class="spinner"></div>Laying out the plan</div>`;
  try {
    const r = await AI.sample.json(
      [
        'read_rehab_plan',
        {
          intro: files ? 'The photo shows' : 'Below is',
          catalog: CATALOG(),
          plan: files ? '' : '\n\nPlan:\n"""' + text.slice(0, 4000) + '"""',
        },
      ],
      { cache: false, ...(files ? { images: await prepImages(files) } : {}) },
    );
    const phases = (r && Array.isArray(r.phases) ? r.phases : [])
      .map((p, i) => ({
        n: String(p.name || 'Phase ' + (i + 1)).slice(0, 40),
        focus: String(p.goal || '').slice(0, 120),
        items: cleanItems(p.items),
      }))
      .filter(p => p.items.length);
    if (!phases.length) throw { code: 'invalid_json' };
    openEditor({ kind: 'rehab', p: { id: '', n: String(r.name || 'Physio plan').slice(0, 50), days: phases } });
    toast('Check it against the original, then save.');
  } catch (e) {
    closeSheet();
    toast(aiError(e));
  }
}
A.rcGo = () => {
  const t = ($('#rcText').value || '').trim();
  if (t.length < 10) return toast('Type or paste the plan first.');
  rehabFromAI(t);
};
$('#fileMenu').addEventListener(
  'change',
  e => {
    if (e.target.dataset.for !== 'rehab') return;
    e.stopImmediatePropagation();
    const f = e.target.files[0];
    e.target.value = '';
    delete e.target.dataset.for;
    if (f && $('#rcBody')) rehabFromAI('', [f]);
  },
  true,
);

/* ---------- recovery: readiness check-in and timed routines ---------- */
const RD_F = [
  ['h', 'Hours slept', 3, 10, 0.5, 7.5],
  ['q', 'Sleep quality', 1, 5, 1, 3],
  ['so', 'Soreness', 1, 5, 1, 2],
  ['en', 'Energy', 1, 5, 1, 3],
  ['st', 'Stress', 1, 5, 1, 2],
];
const RD_L = {
  q: ['', 'Awful', 'Poor', 'OK', 'Good', 'Great'],
  so: ['', 'None', 'A little', 'Some', 'Sore', 'Very sore'],
  en: ['', 'Flat', 'Low', 'OK', 'Good', 'Flying'],
  st: ['', 'Calm', 'Low', 'Some', 'High', 'Very high'],
};
const readyScore = v =>
  r0(
    100 *
      (0.3 * clamp((v.h - 4) / 4, 0, 1) +
        (0.2 * (v.q - 1)) / 4 +
        0.2 * (1 - (v.so - 1) / 4) +
        (0.2 * (v.en - 1)) / 4 +
        0.1 * (1 - (v.st - 1) / 4)),
  );
const readyBand = s =>
  s >= 75
    ? ['Good to push', 'good', 'You are recovered. A hard session will land well today.']
    : s >= 55
      ? ['Train as planned', '', 'Nothing unusual. Do the session you had planned.']
      : s >= 40
        ? ['Keep it easy', 'gold', 'Take the intensity down a notch, or shorten the session.']
        : ['Recover today', 'bad', 'Mobility, a walk and an early night will do more for you than training.'];
const deviceLine = h =>
  h
    ? [
        h.rd ? 'recovery ' + r0(h.rd) + '%' : '',
        h.hv ? 'HRV ' + r0(h.hv) + ' ms' : '',
        h.rh ? 'resting heart rate ' + r0(h.rh) : '',
        h.sl ? r1(h.sl) + ' h sleep' : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
let RD = null;
A.ready = () => {
  const tk = today(),
    h = P.hist[tk] || {};
  RD = { ...(TR.ready[tk] || Object.fromEntries(RD_F.map(f => [f[0], f[5]]))) };
  if (!TR.ready[tk] && h.sl) RD.h = clamp(Math.round(h.sl * 2) / 2, 3, 10);
  openSheet(`${sh('Recovery check-in')}<div class="sheet-b">${RD_F.map(([k, l, mn, mx, st]) => `<label class="f">${l}: <b id="rdV-${k}" style="color:var(--ink)"></b><input type="range" min="${mn}" max="${mx}" step="${st}" value="${RD[k]}" data-on="rd" data-k="${k}"></label>`).join('')}
    <div class="card" id="rdOut"></div>${deviceLine(h) ? `<p class="small muted">Your devices this morning: ${deviceLine(h)}.</p>` : ''}</div><div class="sheet-f"><button class="btn" data-act="readySave">Save check-in</button></div>`);
  rdUpdate();
};
function rdUpdate() {
  RD_F.forEach(([k]) => {
    $('#rdV-' + k).textContent = k === 'h' ? RD.h + ' h' : RD_L[k][RD[k]];
  });
  const s = readyScore(RD),
    b = readyBand(s);
  $('#rdOut').innerHTML =
    `<div class="row" style="align-items:baseline;gap:10px"><span class="num" style="font-size:40px;line-height:1">${s}</span><span class="pill ${b[1]}">${b[0]}</span></div><p class="small muted" style="margin-top:6px">${b[2]}</p>`;
}
I.rd = el => {
  RD[el.dataset.k] = +el.value;
  rdUpdate();
};
A.readySave = async () => {
  const tk = today(),
    first = !TR.ready[tk];
  TR.ready[tk] = { ...RD, score: readyScore(RD) };
  const ks = Object.keys(TR.ready).sort();
  ks.slice(0, Math.max(0, ks.length - 120)).forEach(k => delete TR.ready[k]);
  saveTR();
  closeSheet();
  const d = await loadDay(tk);
  if (first) {
    P.st.ready = (P.st.ready || 0) + 1;
    grant(5, 0, d, 'Check-in');
  }
  commitDay(d);
};
let RT = null,
  rtTimer = 0;
const rtTotal = r => r.steps.reduce((s, x) => s + x[1], 0);
A.routine = ({ id }) => {
  const r = ROUTINES.find(x => x.id === id);
  RT = { r, i: -1, end: 0, paused: 0 };
  openSheet(`${sh(r.n)}<div class="sheet-b" id="rtBody"></div><div class="sheet-f" id="rtFoot"></div>`, true);
  sheets[sheets.length - 1]._onClose = () => {
    clearInterval(rtTimer);
    RT = null;
  };
  renderRoutine();
};
function renderRoutine() {
  const b = $('#rtBody');
  if (!b || !RT) return;
  const r = RT.r;
  if (RT.i < 0) {
    b.innerHTML = `<p class="muted">${esc(r.about)} ${Math.round(rtTotal(r) / 60)} minutes.</p><div class="list">${r.id === 'q-breath' ? `<div class="res" style="cursor:default"><span class="n">In 4, hold 4, out 4, hold 4</span><span class="k muted small">15 rounds</span></div>` : r.steps.map(s => `<div class="res" style="cursor:default"><span class="n">${esc(s[0])}</span><span class="k muted small">${s[1]} s</span><span class="s">${esc(s[2])}</span></div>`).join('')}</div>`;
    $('#rtFoot').innerHTML = `<button class="btn ember" data-act="rtStart">${ic('play', 'fill')} Start</button>`;
    return;
  }
  const s = r.steps[RT.i],
    nx = r.steps[RT.i + 1];
  b.innerHTML = `<div class="rt"><div class="tiny muted">${RT.i + 1} of ${r.steps.length}</div><div class="num rtn" id="rtN"></div><h2 style="font-size:24px">${esc(s[0])}</h2><p class="muted">${esc(s[2])}</p><div class="prog" style="width:100%"><i id="rtBar"></i></div><p class="small muted">${nx ? 'Next: ' + esc(nx[0]) : 'Last one'}</p></div>`;
  $('#rtFoot').innerHTML =
    `<button class="btn ghost" data-act="rtPause">${RT.paused ? 'Resume' : 'Pause'}</button><button class="btn ghost" data-act="rtNext">Skip</button>`;
  rtTick();
}
function rtTick() {
  if (!RT || RT.i < 0 || !$('#rtN')) return;
  const s = RT.r.steps[RT.i];
  const left = RT.paused ? RT.paused : (RT.end - Date.now()) / 1000;
  if (left <= 0) return rtAdvance();
  $('#rtN').textContent = Math.ceil(left);
  $('#rtBar').style.width = clamp(100 - (left / s[1]) * 100, 0, 100) + '%';
}
function rtAdvance() {
  RT.i++;
  if (RT.i >= RT.r.steps.length) return rtDone();
  beep(RT.r.id === 'q-breath' ? 440 : 760, 160);
  RT.paused = 0;
  RT.end = Date.now() + RT.r.steps[RT.i][1] * 1000;
  renderRoutine();
}
A.rtStart = () => {
  initAudio();
  RT.started = Date.now();
  RT.i = -1;
  rtAdvance();
  clearInterval(rtTimer);
  rtTimer = setInterval(rtTick, 200);
};
A.rtPause = () => {
  if (RT.paused) {
    RT.end = Date.now() + RT.paused * 1000;
    RT.paused = 0;
  } else RT.paused = Math.max(0.1, (RT.end - Date.now()) / 1000);
  renderRoutine();
};
A.rtNext = () => rtAdvance();
async function rtDone() {
  clearInterval(rtTimer);
  const r = RT.r,
    min = Math.max(1, Math.round((Date.now() - RT.started) / 60000));
  beep(990, 400);
  closeSheet();
  const d = await loadDay(today());
  const first = !d.x.some(x => x.tr === 'mob');
  const x = { id: newId(), n: r.n, k: xk(2.3, 1, min), min, src: 'm', tr: 'mob' };
  d.x.push(x);
  xlogAdd(d.date, x);
  P.st.mob = (P.st.mob || 0) + 1;
  if (first) grant(10, 0, d, r.n + ' done');
  else toast(r.n + ' done');
  commitDay(d);
}

/* ---------- daily tasks ---------- */
const TASK_AUTO = {
  ready: ['Recovery check-in', d => !!TR.ready[d.date]],
  train: ['Training session', d => d.x.some(x => x.tr === 'train')],
  move: ['Move for 30 minutes', d => xmin(d) >= 30],
  mob: ['Mobility or recovery routine', d => d.x.some(x => x.tr === 'mob')],
  rehab: ['Rehab session', d => d.x.some(x => x.tr === 'rehab')],
  nocaf: [
    'No caffeine after 2 pm',
    d => new Date().getHours() >= 14 && !cafOf(d).some(c => new Date(c.t).getHours() >= 14),
  ],
  protein: ['Hit your protein target', (d, t) => t.p >= P.t.p * 0.95],
  water: ['Hit your water target', d => d.w >= P.t.w],
  steps: ['8,000 steps', d => ((P.hist[d.date] || {}).st || 0) >= 8000],
  weigh: ['Weigh in', d => P.wts.some(w => w.d === d.date)],
  close: ['Close out the day', d => !!d.done],
};
function tasksFor(d) {
  const t = totals(d);
  return P.tasks
    .filter(x => !x.auto || TASK_AUTO[x.auto])
    .map(x => ({
      id: x.id,
      auto: x.auto,
      label: x.auto ? TASK_AUTO[x.auto][0] : x.t,
      done: x.auto ? !!TASK_AUTO[x.auto][1](d, t) : !!(d.tk && d.tk[x.id]),
    }));
}
function checkTasks(d) {
  if (d.date !== today()) return;
  d.tk = d.tk || {};
  for (const t of tasksFor(d))
    if (t.done && !d.tk['r:' + t.id]) {
      d.tk['r:' + t.id] = 1;
      grant(5, 0, d, 'Task done');
    }
}
A.taskTick = async ({ id }) => {
  const d = await loadDay(today());
  d.tk = d.tk || {};
  if (d.tk[id]) delete d.tk[id];
  else d.tk[id] = 1;
  commitDay(d);
};
A.taskManage = () => {
  openSheet(`${sh('Daily tasks')}<div class="sheet-b" id="tmBody"></div>`, true);
  renderTasks();
};
function renderTasks() {
  const b = $('#tmBody');
  if (!b) return;
  const on = k => P.tasks.some(t => t.auto === k);
  b.innerHTML = `<p class="muted small">These tick themselves when Ember can see you did them. Each one pays 5 XP.</p><div class="list">${Object.entries(
    TASK_AUTO,
  )
    .map(
      ([k, v]) =>
        `<button class="res" data-act="taskToggle" data-k="${k}"><span class="n">${v[0]}</span><span class="k"><span class="pill ${on(k) ? 'good' : ''}">${on(k) ? 'On' : 'Off'}</span></span></button>`,
    )
    .join('')}</div>
    <div class="grp">Your own</div>${
      P.tasks.filter(t => !t.auto).length
        ? `<div class="list">${P.tasks
            .filter(t => !t.auto)
            .map(
              t =>
                `<button class="res" data-act="taskDel" data-id="${t.id}"><span class="n">${esc(t.t)}</span><span class="k muted small">Remove</span></button>`,
            )
            .join('')}</div>`
        : ''
    }
    <div class="row"><input class="inp" id="tmNew" placeholder="Cold shower, creatine, 10 pages" autocomplete="off"><button class="btn sm" data-act="taskAdd">Add</button></div>`;
}
A.taskToggle = ({ k }) => {
  if (P.tasks.some(t => t.auto === k)) P.tasks = P.tasks.filter(t => t.auto !== k);
  else P.tasks.push({ id: k, auto: k });
  saveProfile();
  renderTasks();
  render();
};
A.taskAdd = () => {
  const t = ($('#tmNew').value || '').trim();
  if (!t) return;
  P.tasks.push({ id: 't' + newId(), t: t.slice(0, 60) });
  saveProfile();
  renderTasks();
  render();
};
A.taskDel = ({ id }) => {
  P.tasks = P.tasks.filter(t => t.id !== id);
  saveProfile();
  renderTasks();
  render();
};

/* ---------- train tab ---------- */
function trainContext() {
  const tk = today(),
    from = addDays(tk, -14);
  const ss = TR.sess.filter(s => s.d >= from);
  const rd = Object.keys(TR.ready)
    .filter(k => k >= from)
    .map(k => TR.ready[k].score);
  const p = activeProg();
  const rl = Object.keys(TR.rlog)
    .sort()
    .slice(-7)
    .map(k => TR.rlog[k].pain);
  return `\nTraining: ${p ? 'on the program "' + p.n + '" (' + p.days.length + ' sessions a week), ' : 'no program set, '}${ss.filter(s => s.kind === 'train').length} strength sessions and ${ss.filter(s => s.kind === 'rehab').length} rehab sessions in the last 14 days, ${ss.reduce((a, s) => a + (s.prs || 0), 0)} personal records.${rd.length ? ' Recovery check-in scores (0 to 100): ' + rd.join(', ') + '.' : ''}${TR.rehab && rehabPlan(TR.rehab.id) ? ' Doing a rehab plan for: ' + rehabPlan(TR.rehab.id).n + ', phase ' + (TR.rehab.phase + 1) + (rl.length ? ', recent pain scores out of 10: ' + rl.join(', ') : '') + '.' : ''}`;
}

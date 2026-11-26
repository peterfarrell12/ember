/* ---------- Train: the week at a glance, the next session up front with your numbers, everything else in quiet rows ---------- */
const estMin = items =>
  Math.max(10, Math.round((300 + items.reduce((s, it) => s + (it.sets || 3) * (45 + (it.rest || 60)), 0)) / 300) * 5);
const TW_KIND = {
  train: ['dumbbell', 'Strength session'],
  cond: ['timer', 'Conditioning'],
  rehab: ['pulse', 'Rehab'],
  move: ['bolt', 'Activity logged'],
};
function trainWeek(tk, p) {
  const ws = weekStart(tk);
  let mins = 0;
  const cells = WD.map((w, i) => {
    const k = addDays(ws, i),
      ss = TR.sess.filter(s => s.d === k),
      h = P.hist[k] || {};
    mins += h.xm || 0;
    const kind = ss.some(s => s.kind === 'train')
      ? 'train'
      : ss.some(s => s.kind === 'cond')
        ? 'cond'
        : ss.some(s => s.kind === 'rehab')
          ? 'rehab'
          : h.xm || h.ex
            ? 'move'
            : '';
    const pln = kind !== 'train' && trainPlanned(k),
      st = kind || (pln ? (k < tk ? 'miss' : 'plan') : '');
    return `<button class="tw ${st} ${k === tk ? 'now' : k > tk && !pln ? 'future' : ''}" data-act="cal" data-date="${k}" aria-label="${niceDate(k)}: ${kind ? TW_KIND[kind][1] : pln ? (k < tk ? 'planned session missed' : 'session planned') : k > tk ? 'nothing planned' : 'nothing logged'}"><span class="node">${kind ? ic(TW_KIND[kind][0]) : pln && k >= tk ? ic('dumbbell') : `<b class="tn">${pdate(k).getDate()}</b>`}</span>${w}</button>`;
  }).join('');
  const n = TR.sess.filter(s => s.d >= ws && s.kind === 'train').length;
  const nx = p ? nextTrainDate() : '';
  return `<div class="tweek-w"><div class="week">${cells}</div><div class="between"><p class="small muted">${n} ${p ? 'of ' + p.days.length + ' ' : ''}strength session${(p ? p.days.length : n) === 1 ? '' : 's'} this week${mins ? ', ' + fmt(mins) + (mins === 1 ? ' minute' : ' minutes') + ' active' : ''}.${nx && nx !== tk ? ' Next: ' + midDate(nx) + '.' : ''}</p><button class="link" data-act="cal" style="font-size:13px;white-space:nowrap">${ic('cal')} Calendar</button></div></div>`;
}
function readyRow(tk) {
  const rd = TR.ready[tk],
    dev = deviceLine(P.hist[tk] || {});
  if (rd) {
    const b = readyBand(rd.score);
    return `<button class="th-rd" data-act="ready"><b class="num">${rd.score}</b><span class="grow"><b class="band ${b[1]}">${b[0]}</b><small>${b[2]}${dev ? ' Devices: ' + dev + '.' : ''}</small></span><span class="th-redo">Redo</span></button>`;
  }
  const hd = P.hist[tk] || {};
  if (hd.rd > 0) {
    const b = recBand(hd.rd);
    return `<button class="th-rd" data-act="body"><b class="num">${r0(hd.rd)}<small style="display:inline;font-size:16px">%</small></b><span class="grow"><b class="band ${b[0]}">${b[1]}, from your wearable</b><small>${bodyTip(hd)}</small></span>${ic('chev-r')}</button>`;
  }
  return `<button class="th-rd" data-act="ready"><span class="th-rdi">${ic('pulse')}</span><span class="grow"><b>Recovery check-in</b><small>${dev ? 'Devices: ' + dev + '. ' : ''}Thirty seconds on sleep and soreness tells you whether to push or back off.</small></span>${ic('chev-r')}</button>`;
}
/* Recent sessions: gym sessions, and with them the runs, matches and cycles logged as activities, newest first.
   A session opens (and can be repeated); an activity goes to its day. Six at first, the rest on request. */
let sessAll = false;
function recentTraining() {
  const acts = P.xlog
      .filter(x => !TR.sess.some(s => s.d === x.d && s.n === x.n))
      .map(x => ({ act: 1, d: x.d, n: x.n, min: x.min, k: x.k })),
    all = TR.sess.concat(acts).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  if (!all.length) return `<p class="empty">Finished sessions and logged activities are listed here.</p>`;
  return (
    all
      .slice(0, sessAll ? 60 : 6)
      .map(s =>
        s.act
          ? `<button class="entry" data-act="goDate" data-date="${s.d}"><span class="n">${esc(s.n)}</span><span class="k muted small">${s.min ? s.min + ' min' : ''}</span><span class="s">${niceDate(s.d)}${s.k ? ' · about ' + fmt(s.k) + ' kcal' : ''}</span></button>`
          : `<button class="entry" data-act="sessView" data-id="${s.id}"><span class="n">${esc(s.n)}</span><span class="k muted small">${s.dur} min</span><span class="s">${niceDate(s.d)} · ${s.sets} sets${s.vol ? ' · ' + fmt(s.vol) + ' kg' : ''}${s.prs ? ' · ' + s.prs + ' record' + (s.prs === 1 ? '' : 's') : ''}</span></button>`,
      )
      .join('') +
    (all.length > 6 && !sessAll
      ? `<button class="link" data-act="sessShowAll" style="align-self:flex-start;margin-top:8px">Show all ${Math.min(all.length, 60)}</button>`
      : '')
  );
}
A.sessShowAll = () => {
  sessAll = true;
  render();
};
function trainHero(tk, p) {
  const rd = readyRow(tk),
    did = TR.sess.find(s => s.d === tk && s.kind === 'train');
  if (WK) {
    const sets = WK.items.reduce((s, it) => s + it.sets.filter(x => x.done).length, 0),
      all = WK.items.reduce((s, it) => s + it.sets.length, 0);
    return `<section class="thero"><div><div class="th-k">In progress${WK.client && CO.clients[WK.client] ? ' with ' + esc(CO.clients[WK.client].name) : ''}</div><div class="th-t">${esc(WK.name)}</div><div class="th-f">Started ${Math.max(1, Math.round((Date.now() - WK.start) / 60000))} min ago. ${sets} of ${all} sets done.</div></div>
      <div class="bar hb p"><i style="width:${all ? (sets / all) * 100 : 0}%"></i></div>
      <div class="two"><button class="btn ember" data-act="wkResume">${ic('play', 'fill')} Resume</button><button class="btn onhero" data-act="wkDiscard">Discard</button></div>${p ? `<div class="th-links"><button data-act="progView" data-id="${p.id}">Whole program</button></div>` : ''}${rd}</section>`;
  }
  if (p && (did || (plan().since && plan().days.length && !trainPlanned(tk)))) return restHero(tk, p, did);
  if (p) {
    const i = P.prog.at % p.days.length,
      day = p.days[i],
      wk = Math.floor(P.prog.at / p.days.length) + 1,
      nsets = day.items.reduce((s, it) => s + (it.sets || 0), 0),
      show = day.items.slice(0, 4);
    return `<section class="thero"><div>${did ? `<div class="th-done">${ic('check')} Trained today: ${esc(did.n)}, ${did.dur} min</div>` : ''}<div class="th-k">${(k => (!did && k === tk ? 'Planned for today' + (plan().tm ? ' at ' + plan().tm : '') + '. ' : k ? 'Planned for ' + midDate(k) + '. ' : ''))(nextTrainDate())}${esc(p.n)}, ${p.weeks && wk > p.weeks ? 'block complete' : 'week ' + wk + (p.weeks ? ' of ' + p.weeks : '')}</div><div class="th-t">${esc(day.n)}</div>${day.focus ? `<div class="th-f">${esc(day.focus)}</div>` : ''}</div>
      <div class="th-meta"><span>${day.items.length} exercises</span><span>${nsets} sets</span><span>about ${estMin(day.items)} min</span></div>
      <div class="th-list">${show
        .map(it => {
          const s = suggest(it);
          return `<div class="th-x"><span class="ell">${esc(exn(it))}</span><span class="tn">${it.sets} × ${esc(it.reps)}</span><b class="tn ${s.tip ? 'up' : ''}">${s.w !== '' ? (s.tip ? '<i>up</i> ' : '') + s.w + ' kg' : ''}</b></div>`;
        })
        .join(
          '',
        )}${day.items.length > show.length ? `<div class="th-more">and ${day.items.length - show.length} more</div>` : ''}</div>
      <button class="btn ${did ? 'onhero' : 'ember'}" data-act="trainStart">${ic('play', 'fill')} ${did ? 'Start the next session' : 'Start session'}</button>
      <div class="th-links"><button data-act="progView" data-id="${p.id}">Whole program</button><button data-act="progs">Change program</button>${plan().days.length ? '' : `<button data-act="cal">Set training days</button>`}</div>${rd}</section>`;
  }
  return `<section class="thero"><div><div class="th-k">No program yet</div><div class="th-t">Pick a plan to follow</div><div class="th-f">Each session opens with your last numbers on every lift and tells you when it is time to go up.</div></div>
    <button class="btn ember" data-act="progs">${ic('book')} Choose a program</button><div class="th-links"><button data-act="progAI">Have Ember AI build one</button><button data-act="quickStart">Just start a workout</button></div>${rd}</section>`;
}
A.trainStats = () => {
  S.pv = 'train';
  A.tab({ tab: 'progress' });
};
function viewTrain() {
  const tk = today(),
    d = S.days[tk] || newDay(tk),
    p = activeProg(),
    ws = weekStart(tk);
  const cm = msgStrip();
  const ts = tasksFor(d),
    tdone = ts.filter(t => t.done).length;
  const tasks = `<section class="card"><div class="between"><h2>Today's tasks</h2><button class="link" data-act="taskManage">${ts.length ? 'Edit' : 'Add'}</button></div>
    ${ts.length ? `<div class="row small muted" style="margin-top:8px"><div class="grow">${bar(tdone, ts.length, 'good')}</div><span class="tn">${tdone} of ${ts.length}</span></div>` : ''}
    ${ts.map(t => (t.auto ? `<button class="task ${t.done ? 'on' : ''}" data-act="taskGo" data-k="${t.auto}"><span class="tb">${t.done ? ic('check') : ''}</span><span>${esc(t.label)}</span></button>` : `<button class="task ${t.done ? 'on' : ''}" data-act="taskTick" data-id="${t.id}"><span class="tb">${t.done ? ic('check') : ''}</span><span>${esc(t.label)}</span></button>`)).join('') || `<p class="empty">No tasks set. Add the habits you want ticked off each day.</p>`}</section>`;
  const rp = TR.rehab && rehabPlan(TR.rehab.id);
  let rehab;
  if (rp) {
    const ph = rp.phases[TR.rehab.phase],
      logs = Object.keys(TR.rlog).sort().slice(-14),
      doneToday = TR.rlog[tk] && TR.rlog[tk].done;
    let sp = '';
    if (logs.length > 1) {
      const W = 320,
        H = 60;
      sp = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pain over your last sessions"><polyline points="${logs.map((k, i) => (6 + ((W - 12) * i) / (logs.length - 1)).toFixed(1) + ',' + (6 + (H - 22) * (TR.rlog[k].pain / 10)).toFixed(1)).join(' ')}" fill="none" stroke="var(--ember)" stroke-width="2.5" stroke-linejoin="round"/><text x="6" y="${H - 3}">Pain, last ${logs.length} sessions</text><text x="${W - 6}" y="${H - 3}" text-anchor="end">now ${TR.rlog[logs[logs.length - 1]].pain}/10</text></svg>`;
    }
    // pain of 6 or more last time: hold the phase rather than offer the next one (general guidance, not a diagnosis)
    const lastPain = logs.length ? TR.rlog[logs[logs.length - 1]].pain : 0,
      sore = lastPain >= 6;
    rehab = `<section class="card stack"><div class="between"><div><div class="tiny muted" style="font-weight:700">Rehab, ${esc(rp.n.toLowerCase())}</div><h2>Phase ${TR.rehab.phase + 1} of ${rp.phases.length}: ${esc(ph.n)}</h2></div>${doneToday ? `<span class="pill good">Done today</span>` : ''}</div>
      <div class="phs" aria-hidden="true">${rp.phases.map((_, k) => `<i class="${k < TR.rehab.phase ? 'done' : k === TR.rehab.phase ? 'on' : ''}"></i>`).join('')}</div>
      ${ph.goal ? `<p class="small muted">${esc(ph.goal)}</p>` : ''}${sp}<button class="btn" data-act="rehabGo">${ic('play', 'fill')} ${doneToday ? 'Do it again' : "Do today's rehab"}</button>
      ${sore ? `<div class="banner">${ic('alert')}<span>Pain was ${lastPain} out of 10 last time. Stay at this phase, or drop back one, until it settles. If it does not, see a physio or your doctor.</span></div>` : ''}${rp.custom ? '' : `<p class="tiny muted">${GATE}</p>`}<div class="row" style="gap:16px;flex-wrap:wrap">${!sore && TR.rehab.phase < rp.phases.length - 1 ? `<button class="link" data-act="rehabPhase" data-n="1">Move to phase ${TR.rehab.phase + 2}</button>` : ''}${TR.rehab.phase > 0 ? `<button class="link" data-act="rehabPhase" data-n="-1">Back a phase</button>` : ''}<button class="link" data-act="rehabEnd" style="color:var(--muted)">End plan</button></div></section>`;
  } else
    rehab = `<button class="act" data-act="rehabList">${ic('shield')}<span>Start a rehab plan<small>Staged plans for hips, knees, ankles, backs, shoulders and more, or load your physio's</small></span></button>`;
  const wkS = TR.sess.filter(s => s.d >= ws),
    st = (v, l) => `<div class="stat"><div class="num">${v}</div><span>${l}</span></div>`;
  const week = TR.sess.length
    ? `<section class="card"><div class="between"><h2>This week</h2><button class="link" data-act="trainStats">Trends</button></div><div class="stat4 row4" style="margin-top:12px">${st(wkS.length, wkS.length === 1 ? 'Session' : 'Sessions')}${st(fmt(wkS.reduce((s, x) => s + (x.sets || 0), 0)), 'Sets')}${st(fmt(wkS.reduce((s, x) => s + (x.vol || 0), 0)), 'Kilos')}${st(
        wkS.reduce((s, x) => s + (x.prs || 0), 0),
        'Records',
      )}</div></section>`
    : '';
  const find =
    FEATURES.community && Store.owner !== false
      ? `<div class="two"><button class="act" data-act="catalogue">${ic('search')}<span>Find a coach<small>Checked profiles and reviews</small></span></button><button class="act" data-act="squad">${ic('users')}<span>Squad<small>Board, wins, challenge</small></span></button></div>`
      : '';
  return `${cm}${trainWeek(tk, p)}${trainHero(tk, p)}
  <div class="tiles"><button class="tile" data-act="quickStart">${ic('bolt')}Quick workout</button><button class="tile" data-act="timer">${ic('timer')}Interval timer</button><button class="tile" data-act="addExercise">${ic('pulse')}Log activity</button><button class="tile" data-act="exLib">${ic('book')}Exercises</button></div>
  ${tasks}${rehab}
  <div class="rail-w"><div class="rail-h"><h2>Recovery routines</h2><span class="muted tiny">Guided, with a timer</span></div><div class="rail">${ROUTINES.map(r => `<button class="rcard" data-act="routine" data-id="${r.id}"><b>${esc(r.n)}</b><small>${esc(r.about)}</small><span class="tn">${ic('clock')} ${Math.round(rtTotal(r) / 60)} min</span></button>`).join('')}</div></div>
  ${week}
  <section class="card"><div class="between"><h2>Recent sessions</h2>${TR.sess.length ? `<button class="link" data-act="trainStats">All trends</button>` : ''}</div>
    ${recentTraining()}</section>
  ${Store.owner !== false ? gymStrip() : ''}${find}${coachCardForClient()}`;
}

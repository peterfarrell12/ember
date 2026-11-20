/* ---------- Calendar: a weekly pattern for training and rehab, your own events, and what actually happened ---------- */
const PLAN_KINDS = {
  match: ['Match or game', 'trophy'],
  class: ['Class', 'users'],
  cardio: ['Run, ride or swim', 'bolt'],
  appt: ['Appointment', 'clock'],
  rest: ['Rest day', 'moon'],
  other: ['Something else', 'flag'],
};
const WDL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const wdOf = k => (pdate(k).getDay() + 6) % 7;
const longDate = k => WDL[wdOf(k)] + ' ' + pdate(k).getDate() + ' ' + MONTHS[pdate(k).getMonth()];
const shortDate = k => WD[wdOf(k)] + ' ' + pdate(k).getDate() + ' ' + MONTHS[pdate(k).getMonth()].slice(0, 3);
function plan() {
  if (!P.plan) P.plan = { days: [], tm: '', rehab: 'daily', ev: [], moved: {}, skip: {}, done: {}, since: '' };
  return P.plan;
}
function planSave() {
  const pl = plan(),
    old = addDays(today(), -60);
  for (const k of Object.keys(pl.moved)) if (k < old) delete pl.moved[k];
  for (const k of Object.keys(pl.skip)) if (k < old) delete pl.skip[k];
  for (const k of Object.keys(pl.done)) if (k.slice(0, 10) < old) delete pl.done[k];
  pl.ev = pl.ev.filter(e => e.wd != null || e.d >= old);
  saveProfile();
  render();
  renderCal();
}
/* Is a program session planned for this date: a chosen weekday, or the day one was moved to; not a day it was moved from or skipped. */
function trainPlanned(k) {
  const pl = plan();
  if (!activeProg() || !pl.since) return false;
  if (Object.keys(pl.moved).some(f => pl.moved[f] === k)) return true;
  if (pl.moved[k] || pl.skip[k] || k < pl.since) return false;
  return pl.days.includes(wdOf(k));
}
/* Which session of the program falls on a date from today on: the rotation simply continues, so a missed day pushes everything back. */
function sessionOn(k) {
  const p = activeProg(),
    tk = today(),
    doneToday = TR.sess.some(s => s.d === tk && s.kind === 'train');
  let n = 0;
  for (let c = tk; c < k; c = addDays(c, 1)) if (trainPlanned(c) && !(c === tk && doneToday)) n++;
  return p.days[(P.prog.at + n) % p.days.length];
}
function nextTrainDate() {
  const tk = today(),
    did = TR.sess.some(s => s.d === tk && s.kind === 'train');
  for (let i = did ? 1 : 0; i < 21; i++) {
    const k = addDays(tk, i);
    if (trainPlanned(k)) return k;
  }
  return '';
}
/* ---------- the plan as a calendar file (.ics), for the phone's own calendar and its alerts ---------- */
function planIcs(days = 28) {
  const tk = today(),
    stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    txt = s =>
      String(s)
        .replace(/[\\;,]/g, m => '\\' + m)
        .replace(/\n/g, ' '),
    out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ember//Training plan//EN', 'CALSCALE:GREGORIAN'];
  let n = 0;
  for (let i = 0; i < days; i++) {
    const k = addDays(tk, i),
      ymd = k.replace(/-/g, '');
    planFor(k)
      .filter(x => !x.skipped && !x.done && !x.missed)
      .forEach(x => {
        const tm = /^\d\d:\d\d$/.test(x.tm || '') ? x.tm.replace(':', '') + '00' : '';
        out.push(
          'BEGIN:VEVENT',
          // the same entry gets the same id each time, so adding the plan again updates it
          'UID:' +
            ymd +
            '-' +
            norm(x.type + ' ' + x.t)
              .trim()
              .replace(/ /g, '-') +
            '@ember',
          'DTSTAMP:' + stamp,
          tm ? 'DTSTART:' + ymd + 'T' + tm : 'DTSTART;VALUE=DATE:' + ymd,
          tm
            ? 'DURATION:PT' + clamp(r0(x.min || 60), 10, 600) + 'M'
            : 'DTEND;VALUE=DATE:' + addDays(k, 1).replace(/-/g, ''),
          'SUMMARY:' + txt(x.t),
          ...(x.sub ? ['DESCRIPTION:' + txt(x.sub)] : []),
          ...(tm ? ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + txt(x.t), 'TRIGGER:-PT30M', 'END:VALARM'] : []),
          'END:VEVENT',
        );
        n++;
      });
  }
  out.push('END:VCALENDAR');
  return { n, text: out.join('\r\n') + '\r\n' };
}
A.calExport = async () => {
  const { n, text } = planIcs();
  if (!n) return toast('Nothing is planned in the next four weeks yet.');
  const file = new File([text], 'ember-plan.ics', { type: 'text/calendar' });
  try {
    // a phone offers its calendar from the share sheet; a computer downloads the file
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Ember plan' });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = 'ember-plan.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(n + (n === 1 ? ' entry' : ' entries') + ' saved as ember-plan.ics. Open it to add them to your calendar.');
};
function planFor(k) {
  const pl = plan(),
    tk = today(),
    out = [],
    ss = TR.sess.filter(s => s.d === k),
    used = new Set(),
    p = activeProg(),
    tr = ss.find(s => s.kind === 'train');
  const sdesc = s =>
    s.dur + ' min, ' + s.sets + ' sets' + (s.prs ? ', ' + s.prs + (s.prs === 1 ? ' record' : ' records') : '');
  if (p && trainPlanned(k)) {
    if (tr) {
      used.add(tr.id);
      out.push({ type: 'train', done: 1, t: tr.n, sub: sdesc(tr), sid: tr.id, tm: pl.tm });
    } else if (k < tk)
      out.push({
        type: 'train',
        missed: 1,
        t: 'Training session',
        sub: 'Missed. The program picks up where you left off.',
        tm: pl.tm,
      });
    else {
      const dy = sessionOn(k);
      out.push({
        type: 'train',
        plan: 1,
        t: dy.n,
        sub: [dy.focus, 'about ' + estMin(dy.items) + ' min'].filter(Boolean).join(', '),
        min: estMin(dy.items),
        tm: pl.tm,
      });
    }
  } else if (p && pl.skip[k] && k >= tk && pl.days.includes(wdOf(k)))
    out.push({ type: 'train', skipped: 1, t: 'Training skipped', sub: 'Put it back if plans change.' });
  ss.forEach(s => {
    if (!used.has(s.id))
      out.push({ type: s.kind === 'rehab' ? 'rehab' : 'train', done: 1, t: s.n, sub: sdesc(s), sid: s.id });
  });
  const rp = TR.rehab && rehabPlan(TR.rehab.id);
  if (
    rp &&
    k >= tk &&
    !ss.some(s => s.kind === 'rehab') &&
    (pl.rehab === 'daily' || (pl.rehab === 'train' && pl.days.includes(wdOf(k))))
  )
    out.push({
      type: 'rehab',
      plan: 1,
      t: 'Rehab, ' + rp.n.toLowerCase(),
      sub: 'Phase ' + (TR.rehab.phase + 1) + ': ' + rp.phases[TR.rehab.phase].n,
    });
  pl.ev.forEach(e => {
    const on = e.wd != null ? wdOf(k) === e.wd && k >= e.from : e.d === k;
    if (!on) return;
    out.push({
      type: 'ev',
      id: e.id,
      k: e.k,
      t: e.t,
      tm: e.tm || '',
      min: e.min || 0,
      sub: [e.min && e.k !== 'rest' ? e.min + ' min' : '', e.wd != null ? 'every ' + WDL[e.wd] : '']
        .filter(Boolean)
        .join(', '),
      done: !!pl.done[k + '|' + e.id],
    });
  });
  // anything else logged that day: a run, a match, a cycle, a recovery routine. Training of every kind is on the calendar.
  P.xlog
    .filter(x => x.d === k && !ss.some(s => s.n === x.n))
    .forEach(x =>
      out.push({
        type: 'act',
        done: 1,
        t: x.n,
        sub: [x.min ? x.min + ' min' : '', x.k ? 'about ' + fmt(x.k) + ' kcal' : ''].filter(Boolean).join(', '),
      }),
    );
  gymMine(k).forEach(x => out.push(x));
  return out.sort((a, b) => ((a.tm || '99') < (b.tm || '99') ? -1 : (a.tm || '99') > (b.tm || '99') ? 1 : 0));
}
/* Planned sessions kept since the pattern was set, looking back four weeks at most. */
function planKept() {
  const pl = plan(),
    tk = today();
  if (!pl.since) return null;
  let n = 0,
    done = 0;
  for (let k = pl.since > addDays(tk, -28) ? pl.since : addDays(tk, -28); k < tk; k = addDays(k, 1))
    if (trainPlanned(k)) {
      n++;
      if (TR.sess.some(s => s.d === k && s.kind === 'train')) done++;
    }
  return n ? { n, done } : null;
}

function calPattern() {
  const pl = plan(),
    p = activeProg(),
    kept = planKept(),
    need = p ? p.days.length : 0;
  return `<section class="card stack" id="calPat"><h2>Your week</h2>
      ${
        p
          ? `<div><div class="between small"><b>Training days</b><span class="muted">${pl.days.length} picked, ${esc(p.n)} has ${need} a week</span></div><div class="wds">${WD.map((w, i) => `<button data-act="calDay" data-wd="${i}" aria-pressed="${pl.days.includes(i)}" aria-label="${WDL[i]}">${w[0]}</button>`).join('')}</div></div>
        <label class="f" style="max-width:180px">Usual time, optional<input class="inp" type="time" id="calTm" value="${pl.tm || ''}" data-on="calTm"></label>
        ${kept ? `<div class="row small"><div class="grow">${bar(kept.done, kept.n, 'good')}</div><span class="muted tn">${kept.done} of ${kept.n} planned sessions kept</span></div>` : ''}`
          : `<p class="small muted">Choose a program and you can give its sessions fixed days of the week. Missed one? The plan slides along so you never skip a session.</p><button class="btn sm" data-act="calProg" style="align-self:flex-start">${ic('book')} Choose a program</button>`
      }
      ${
        TR.rehab && rehabPlan(TR.rehab.id)
          ? `<div class="f">Rehab${segHtml(
              'calRehab',
              [
                ['daily', 'Every day'],
                ['train', 'Training days'],
                ['off', 'Not on the calendar'],
              ],
              pl.rehab,
            )}</div>`
          : ''
      }
      <button class="btn sm ghost" data-act="calExport" style="align-self:flex-start">${ic('cal')} Add to my phone's calendar</button>
      <p class="tiny muted">Ember does not send reminders yet. This puts the next four weeks, as planned today, into your own calendar, with an alert half an hour before anything that has a time. If the plan changes, add it again: the entries update rather than double up.</p></section>`;
}
let CAL = null;
A.cal = ({ date } = {}) => {
  if (CAL) return;
  CAL = { mode: 'plan', fwd: 4, back: 0, sel: date || (S.tab === 'today' ? S.date : today()) };
  CAL.cur = CAL.sel;
  openSheet(
    `${sh(
      'Calendar',
      `<div style="width:148px">${segHtml(
        'calMode',
        [
          ['plan', 'Plan'],
          ['month', 'Month'],
        ],
        CAL.mode,
      )}</div>`,
    )}<div class="sheet-b" id="calBody"></div>`,
    true,
  );
  sheets[sheets.length - 1]._onClose = () => {
    CAL = null;
  };
  SEG.calMode = v => {
    CAL.mode = v;
    CAL.cur = CAL.sel;
    renderCal();
  };
  SEG.calRehab = v => {
    plan().rehab = v;
    planSave();
  };
  renderCal();
};
A.calSel = ({ date }) => {
  CAL.sel = date;
  if (CAL.mode === 'month' && pdate(date).getMonth() !== pdate(CAL.cur).getMonth()) CAL.cur = date;
  renderCal();
};
A.calNav = ({ n }) => {
  if (CAL.mode === 'week') CAL.cur = addDays(CAL.cur, 7 * n);
  else {
    const d = pdate(CAL.cur);
    CAL.cur = dkey(new Date(d.getFullYear(), d.getMonth() + +n, 1, 12));
  }
  renderCal();
};
A.calToday = () => {
  CAL.sel = CAL.cur = today();
  renderCal();
};
function renderCal() {
  const b = $('#calBody');
  if (!b || !CAL) return;
  const tk = today(),
    sel = CAL.sel,
    pl = plan(),
    p = activeProg(),
    cd = pdate(CAL.cur),
    keep = b.scrollTop;
  if (CAL.mode === 'plan') {
    b.innerHTML = planView() + calPattern();
    b.scrollTop = keep;
    return;
  }
  let keys,
    title,
    mon = -1;
  if (CAL.mode === 'week') {
    const ws = weekStart(CAL.cur);
    keys = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const a = pdate(keys[0]),
      z = pdate(keys[6]);
    title =
      a.getDate() +
      (a.getMonth() !== z.getMonth() ? ' ' + MONTHS[a.getMonth()].slice(0, 3) : '') +
      ' to ' +
      z.getDate() +
      ' ' +
      MONTHS[z.getMonth()];
  } else {
    mon = cd.getMonth();
    const y = cd.getFullYear(),
      first = new Date(y, mon, 1, 12),
      lead = (first.getDay() + 6) % 7,
      dim = new Date(y, mon + 1, 0).getDate(),
      start = addDays(dkey(first), -lead);
    keys = Array.from({ length: Math.ceil((lead + dim) / 7) * 7 }, (_, i) => addDays(start, i));
    title = MONTHS[mon] + ' ' + y;
  }
  const cells = keys
    .map(k => {
      const items = planFor(k),
        h = P.hist[k],
        out = mon >= 0 && pdate(k).getMonth() !== mon;
      return `<button class="cd ${k === tk ? 'now' : ''} ${k === sel ? 'sel' : ''} ${out ? 'out' : ''}" data-act="calSel" data-date="${k}" aria-label="${longDate(k)}${items.length ? ': ' + esc(items.map(i => i.t + (i.done ? ', done' : i.missed ? ', missed' : '')).join('; ')) : ''}"><b class="tn">${pdate(k).getDate()}</b><span class="cm">${items
        .slice(0, 3)
        .map(it => `<i class="${it.type} ${it.done ? 'done' : it.missed ? 'miss' : it.skipped ? 'skip' : ''}"></i>`)
        .join('')}</span>${h && h.n ? `<u class="${h.zn ? 'zn' : ''}"></u>` : ''}</button>`;
    })
    .join('');
  /* the selected day */
  const items = planFor(sel),
    h = P.hist[sel],
    w = P.wts.find(x => x.d === sel);
  const row = it => {
    const tm = `<span class="tm tn">${it.tm || ''}</span>`;
    if (it.type === 'ev') {
      const K = PLAN_KINDS[it.k] || PLAN_KINDS.other;
      return `<div class="ag ${it.done ? 'done' : ''}">${tm}<button class="ag-i ev" data-act="calEv" data-id="${it.id}" data-date="${sel}" aria-label="Edit ${esc(it.t)}">${ic(K[1])}</button><button class="grow ag-t" data-act="calEv" data-id="${it.id}" data-date="${sel}"><b>${esc(it.t)}</b><small>${esc(it.sub || K[0])}</small></button>${it.k === 'rest' ? '' : `<button class="tick sm" data-act="calTick" data-id="${it.id}" data-date="${sel}" aria-pressed="${!!it.done}" aria-label="Done">${ic('check')}</button>`}</div>`;
    }
    if (it.type === 'act')
      return `<div class="ag done">${tm}<span class="ag-i train">${ic('check')}</span><span class="grow"><b>${esc(it.t)}</b><small>${esc(it.sub)}</small></span></div>`;
    if (it.done)
      return `<div class="ag done">${tm}<span class="ag-i ${it.type}">${ic('check')}</span><button class="grow ag-t" data-act="sessView" data-id="${it.sid}"><b>${esc(it.t)}</b><small>${esc(it.sub)}</small></button></div>`;
    if (it.missed)
      return `<div class="ag">${tm}<span class="ag-i miss">${ic('alert')}</span><span class="grow"><b>${esc(it.t)}</b><small>${esc(it.sub)}</small></span></div>`;
    if (it.skipped)
      return `<div class="ag">${tm}<span class="ag-i">${ic('dumbbell')}</span><span class="grow"><b>${esc(it.t)}</b><small>${esc(it.sub)}</small></span><button class="btn sm ghost" data-act="calUnskip" data-date="${sel}">Put back</button></div>`;
    if (it.type === 'rehab')
      return `<div class="ag">${tm}<span class="ag-i rehab">${ic('pulse')}</span><span class="grow"><b>${esc(it.t)}</b><small>${esc(it.sub)}</small></span>${sel === tk ? `<button class="btn sm" data-act="calRehab">Do it</button>` : ''}</div>`;
    return `<div class="ag">${tm}<span class="ag-i train">${ic('dumbbell')}</span><span class="grow"><b>${esc(it.t)}</b><small>${esc(it.sub)}</small><span class="row" style="gap:14px;margin-top:5px"><button class="link" style="font-size:13px" data-act="calMove" data-date="${sel}">Move</button><button class="link" style="font-size:13px;color:var(--muted)" data-act="calSkip" data-date="${sel}">Skip</button></span></span>${sel === tk ? `<button class="btn sm ember" data-act="calStart">Start</button>` : ''}</div>`;
  };
  const facts =
    (h && (h.n || h.ex || h.st)) || w
      ? [
          h && h.n ? fmt(h.k) + ' kcal eaten' + (h.zn ? ', closed inside your zone' : '') : '',
          h && h.xm ? h.xm + ' min active' : '',
          h && h.st ? fmt(h.st) + ' steps' : '',
          w ? 'weighed ' + w.kg + ' kg' : '',
        ]
          .filter(Boolean)
          .join(', ')
      : '';
  b.innerHTML = `<div class="between"><h2 class="sec-h" style="font-size:20px">${title}</h2><div class="row" style="gap:6px"><button class="icon-btn solid" data-act="calNav" data-n="-1" aria-label="Earlier">${ic('chev-l')}</button><button class="icon-btn solid" data-act="calNav" data-n="1" aria-label="Later">${ic('chev-r')}</button></div></div>
    <div><div class="calhd">${WD.map(w => `<span>${w}</span>`).join('')}</div><div class="calgrid">${cells}</div>
      <div class="row tiny muted" style="gap:12px;margin-top:10px;flex-wrap:wrap"><span class="row cm" style="gap:5px;height:auto"><i class="train done"></i>Training</span><span class="row cm" style="gap:5px;height:auto"><i class="rehab done"></i>Rehab</span><span class="row cm" style="gap:5px;height:auto"><i class="ev done"></i>Your events</span><span class="row cm" style="gap:5px;height:auto"><i class="train"></i>Planned</span><span class="row" style="gap:5px"><u class="lg"></u>Food logged</span></div></div>
    <section class="card"><div class="between"><h2>${sel === tk ? 'Today' : longDate(sel)}</h2><div class="row" style="gap:6px">${sel !== tk ? `<button class="btn sm ghost" data-act="calToday">Today</button>` : ''}<button class="btn sm" data-act="calEv" data-date="${sel}">${ic('plus')} Add</button></div></div>
      <div style="margin-top:8px">${items.map(row).join('') || `<p class="empty">Nothing planned${sel < tk ? ' or logged' : ''}.</p>`}</div>
      ${facts ? `<p class="small muted" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">${facts.charAt(0).toUpperCase() + facts.slice(1)}.</p>` : ''}
      ${sel <= tk ? `<button class="link" data-act="goDate" data-date="${sel}" style="margin-top:10px">Open this day's diary</button>` : ''}</section>
    ${calPattern()}`;
  b.scrollTop = keep;
}
A.calDay = ({ wd }) => {
  const pl = plan(),
    i = +wd;
  pl.days = pl.days.includes(i) ? pl.days.filter(x => x !== i) : pl.days.concat([i]).sort();
  if (!pl.since) pl.since = today();
  planSave();
};
I.calTm = el => {
  const pl = plan();
  pl.tm = /^\d\d:\d\d$/.test(el.value) ? el.value : '';
  saveProfile();
  render();
};
A.calProg = () => {
  closeAll();
  S.tab = 'train';
  render();
  A.progs();
};
A.calStart = () => {
  closeAll();
  A.trainStart();
};
A.calRehab = () => {
  closeAll();
  A.rehabGo();
};
const moveOrigin = k => {
  const pl = plan();
  return Object.keys(pl.moved).find(f => pl.moved[f] === k) || k;
};
const calBack = () => {
  while (sheets.length && !sheets[sheets.length - 1].querySelector('#calBody')) closeSheet();
};
A.calSkip = ({ date }) => {
  calBack();
  const pl = plan(),
    o = moveOrigin(date);
  delete pl.moved[o];
  pl.skip[o] = 1;
  planSave();
  toast('Session skipped. Everything after it moves up.');
};
A.calUnskip = ({ date }) => {
  delete plan().skip[date];
  planSave();
};
A.calMove = ({ date }) => {
  const opts = Array.from({ length: 10 }, (_, i) => addDays(today(), i)).filter(k => k !== date && !trainPlanned(k));
  openSheet(
    `${sh('Move this session to')}<div class="sheet-b"><div class="opts">${opts.map(k => `<button data-act="calMoveTo" data-from="${date}" data-to="${k}">${k === today() ? 'Today' : shortDate(k)}</button>`).join('')}</div><p class="small muted">Only this one moves. Your usual training days stay as they are.</p></div>`,
  );
};
A.calMoveTo = ({ from, to }) => {
  const pl = plan(),
    o = moveOrigin(from);
  if (o === to) delete pl.moved[o];
  else pl.moved[o] = to;
  calBack();
  if (CAL) CAL.sel = to;
  planSave();
  toast('Moved to ' + (to === today() ? 'today' : shortDate(to)));
};
/* your own events */
let EV = null;
A.calEv = ({ id, date }) => {
  if (String(id || '').startsWith('g:')) return A.gym({ tab: 'mine' });
  const e = id ? plan().ev.find(x => x.id === id) : null;
  EV = e
    ? { ...e, d: e.d || date }
    : { id: '', t: '', k: 'match', d: date || (CAL ? CAL.sel : today()), wd: null, tm: '', min: 60 };
  openSheet(`${sh(e ? 'Edit event' : 'Add to your calendar')}<div class="sheet-b">
    <div class="f">What is it<div class="opts" id="evKinds">${Object.entries(PLAN_KINDS)
      .map(([k, v]) => `<button data-act="evKind" data-v="${k}" aria-pressed="${EV.k === k}">${v[0]}</button>`)
      .join('')}</div></div>
    <label class="f">Name<input class="inp" id="evT" value="${esc(EV.t)}" placeholder="Padel doubles" autocomplete="off"></label>
    ${segHtml(
      'evRep',
      [
        ['once', 'One day'],
        ['week', 'Every week'],
      ],
      EV.wd != null ? 'week' : 'once',
    )}
    <label class="f">Date<input class="inp" type="date" id="evD" value="${EV.d}"></label><div class="grid2"><label class="f">Time, optional<input class="inp" type="time" id="evTm" value="${EV.tm || ''}"></label><label class="f">Minutes<input class="inp" id="evMin" inputmode="numeric" value="${EV.min || ''}"></label></div>
    <p class="small muted" id="evNote"></p></div>
    <div class="sheet-f">${e ? `<button class="btn ghost" style="width:auto" data-act="calEvDel" aria-label="Delete">${ic('trash')}</button>` : ''}<button class="btn" data-act="calEvSave">Save</button></div>`);
  EV.rep = EV.wd != null ? 'week' : 'once';
  SEG.evRep = v => {
    EV.rep = v;
    evNote();
  };
  evNote();
};
function evNote() {
  const n = $('#evNote');
  if (n) n.textContent = EV.rep === 'week' ? 'Repeats every week on the weekday of the date above, starting then.' : '';
}
A.evKind = ({ v }, el) => {
  $$('button', el.parentNode).forEach(x => x.setAttribute('aria-pressed', x === el));
  EV.k = v;
};
A.calEvSave = () => {
  const pl = plan(),
    d = $('#evD').value;
  if (!/^\d{4}-\d\d-\d\d$/.test(d)) return toast('Pick a date.');
  const e = {
    id: EV.id || newId(),
    k: EV.k,
    t: $('#evT').value.trim().slice(0, 60) || PLAN_KINDS[EV.k][0],
    tm: /^\d\d:\d\d$/.test($('#evTm').value) ? $('#evTm').value : '',
    min: clamp(r0(num($('#evMin').value)), 0, 600),
  };
  if (EV.rep === 'week') {
    e.wd = wdOf(d);
    e.from = d;
    e.d = '';
  } else {
    e.wd = null;
    e.d = d;
  }
  pl.ev = pl.ev.filter(x => x.id !== e.id).concat([e]);
  closeSheet();
  if (CAL) CAL.sel = d;
  planSave();
};
A.calEvDel = () => {
  const pl = plan();
  pl.ev = pl.ev.filter(x => x.id !== EV.id);
  closeSheet();
  planSave();
  toast('Removed from your calendar');
};
let calLogD = '';
A.calTick = ({ id, date }) => {
  if (String(id || '').startsWith('g:')) return A.gym({ tab: 'cls' });
  const pl = plan(),
    key = date + '|' + id,
    e = pl.ev.find(x => x.id === id);
  if (pl.done[key]) delete pl.done[key];
  else pl.done[key] = 1;
  planSave();
  if (pl.done[key] && e && ['match', 'class', 'cardio'].includes(e.k) && date <= today()) {
    calLogD = date;
    toast('Done', '', { act: 'calLog', label: 'Log it as exercise' });
  }
};
A.calLog = async () => {
  const d = calLogD;
  if (!d) return;
  await goDate(d);
  A.addExercise();
};

/* what is on the plan for a day, in one line for Today */
function planStrip(k) {
  const items = planFor(k).filter(it => !it.skipped && it.type !== 'act');
  if (!items.length) return '';
  const left = items.filter(it => !it.done && !it.missed);
  return `<button class="pstrip" data-act="cal" data-date="${k}">${ic('cal')}<span class="grow"><b>${left.length ? 'On your plan' : 'Plan done for the day'}</b><small>${esc(
    items
      .slice(0, 3)
      .map(it => (it.tm ? it.tm + ' ' : '') + it.t + (it.done ? ' (done)' : ''))
      .join(', '),
  )}${items.length > 3 ? ' and ' + (items.length - 3) + ' more' : ''}</small></span>${ic('chev-r')}</button>`;
}

/* ---------- the plan, week by week: what is coming, what was done, tap anything to open it ---------- */
function planView() {
  const tk = today(),
    p = activeProg(),
    pl = plan(),
    ws0 = weekStart(tk);
  let head,
    out = '';
  if (p) {
    const per = p.days.length,
      wk = Math.floor(P.prog.at / per) + 1,
      tot = (p.weeks || 0) * per,
      nx = nextTrainDate(),
      kept = planKept();
    head = `<section class="thero"><div><div class="th-k">${pl.days.length ? 'Your plan' : 'No training days picked yet'}</div><div class="th-t" style="font-size:28px">${esc(p.n)}</div><div class="th-f">${p.weeks ? 'Week ' + Math.min(wk, p.weeks) + ' of ' + p.weeks : 'Week ' + wk}${tot ? ', ' + Math.min(P.prog.at, tot) + ' of ' + tot + ' sessions done' : ''}${nx ? '. Next session ' + (nx === tk ? 'today' : midDate(nx)) : ''}.</div></div>
      ${tot ? `<div class="bar hb p"><i style="width:${clamp((P.prog.at / tot) * 100, 0, 100)}%"></i></div>` : ''}
      ${kept ? `<div class="th-meta"><span>${kept.done} of ${kept.n} planned sessions kept</span></div>` : ''}
      ${pl.days.length ? '' : `<button class="btn ember" data-act="calPat">Pick your training days</button>`}</section>`;
  } else
    head = `<section class="card stack"><h2>No program yet</h2><p class="small muted">Pick a program and its sessions are laid out here week by week. You can still add matches, classes and appointments.</p><button class="btn sm" data-act="calProg" style="align-self:flex-start">${ic('book')} Choose a program</button></section>`;
  for (let w = -CAL.back; w < CAL.fwd; w++) {
    const ws = addDays(ws0, 7 * w);
    let n = 0,
      mins = 0,
      rows = '';
    for (let i = 0; i < 7; i++) {
      const k = addDays(ws, i),
        items = planFor(k).filter(it => !it.skipped),
        dn = `<span class="pd ${k === tk ? 'now' : ''}"><b>${WD[i]}</b><span class="tn">${pdate(k).getDate()}</span></span>`;
      if (!items.length) {
        rows += `<button class="pr rest" data-act="calEv" data-date="${k}">${dn}<span class="grow">${k < tk ? 'Nothing logged' : 'Rest day'}</span>${k >= tk ? ic('plus') : ''}</button>`;
        continue;
      }
      items.forEach((it, j) => {
        if (it.type === 'train' && !it.missed) {
          n++;
          if (it.plan && p) mins += estMin(sessionOn(k).items);
        }
        const icon = it.done
          ? 'check'
          : it.missed
            ? 'alert'
            : it.type === 'ev'
              ? (PLAN_KINDS[it.k] || PLAN_KINDS.other)[1]
              : it.type === 'rehab'
                ? 'pulse'
                : 'dumbbell';
        rows += `<button class="pr ${it.type} ${it.done ? 'done' : it.missed ? 'miss' : ''}" data-act="calItem" data-date="${k}" data-i="${j}">${j ? '<span class="pd"></span>' : dn}<span class="pr-i">${ic(icon)}</span><span class="grow" style="min-width:0"><b class="ell">${esc(it.t)}</b><small class="ell">${esc([it.tm, it.sub].filter(Boolean).join(', '))}</small></span>${k === tk && !it.done ? `<span class="pill gold">Today</span>` : ''}${ic('chev-r')}</button>`;
      });
    }
    out += `<div class="pwk"><div class="between"><h2>${w === 0 ? 'This week' : w === 1 ? 'Next week' : w === -1 ? 'Last week' : pdate(ws).getDate() + ' ' + MONTHS[pdate(ws).getMonth()].slice(0, 3) + ' to ' + pdate(addDays(ws, 6)).getDate() + ' ' + MONTHS[pdate(addDays(ws, 6)).getMonth()].slice(0, 3)}</h2><span class="muted small">${n} session${n === 1 ? '' : 's'}${mins ? ', about ' + mins + ' min' : ''}</span></div><div class="card" style="padding:2px 14px">${rows}</div></div>`;
  }
  return `${head}<div class="between"><button class="btn sm ghost" data-act="calMore" data-n="-1">Earlier weeks</button><button class="btn sm" data-act="calEv" data-date="${tk}">${ic('plus')} Add an event</button></div>${out}<button class="btn ghost" data-act="calMore" data-n="1">Show more weeks</button>`;
}
A.calMore = ({ n }) => {
  if (+n < 0) CAL.back = Math.min(12, CAL.back + 2);
  else CAL.fwd = Math.min(26, CAL.fwd + 4);
  renderCal();
};
A.calPat = () => {
  const el = $('#calPat');
  if (el) el.scrollIntoView({ block: 'start' });
};
A.calItem = ({ date, i }) => {
  const it = planFor(date).filter(x => !x.skipped)[+i],
    tk = today();
  if (!it) return;
  if (it.type === 'ev') return A.calEv({ id: it.id, date });
  if (it.type === 'act') {
    closeAll();
    return goDate(date);
  }
  if (it.done && it.sid) return A.sessView({ id: it.sid });
  if (it.missed) return toast('That one was missed. The program carries on from where you left off.');
  if (it.type === 'rehab') return date === tk ? A.calRehab() : toast('Rehab is done on the day.');
  const dy = sessionOn(date);
  openSheet(
    `${sh(dy.n)}<div class="sheet-b"><div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill gold">${date === tk ? 'Today' : longDate(date)}${plan().tm ? ', ' + plan().tm : ''}</span><span class="pill">${dy.items.length} exercises</span><span class="pill">about ${estMin(dy.items)} min</span></div>${dy.focus ? `<p class="muted">${esc(dy.focus)}</p>` : ''}
    <div class="list">${dy.items
      .map(x => {
        const s = suggest(x);
        return `<div class="res" style="cursor:default"><span class="n">${esc(exn(x))}</span><span class="k tn">${s.w !== '' ? s.w + ' kg' : ''}</span><span class="s">${x.sets} × ${esc(x.reps)}${x.rest ? ', rest ' + x.rest + ' s' : ''}${s.tip ? ', go up this time' : ''}</span></div>`;
      })
      .join('')}</div>
    <p class="tiny muted">Weights are what you lifted last time, or the next step up when you hit every rep.</p></div>
    <div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="calSkip" data-date="${date}">Skip</button><button class="btn ghost" style="width:auto" data-act="calMove" data-date="${date}">Move</button>${date === tk ? `<button class="btn ember" data-act="calStart">${ic('play', 'fill')} Start</button>` : trainPlanned(tk) ? '' : `<button class="btn" data-act="calMoveTo" data-from="${date}" data-to="${tk}">Do it today</button>`}</div>`,
    true,
  );
};

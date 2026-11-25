/* ---------- Today: budget gauge, one next step, one-tap repeats, meals, trackers ---------- */
const WARM = { pend: {}, bad: {} };
/* Load a neighbouring day in the background so Today and Add can offer "same as yesterday". */
function warmDay(k) {
  if (S.days[k] || WARM.pend[k] || WARM.bad[k]) return;
  WARM.pend[k] = 1;
  Store.get('days', k).then(
    d => {
      delete WARM.pend[k];
      if (!S.days[k]) S.days[k] = d ? { ...newDay(k), ...d } : newDay(k);
      if (ADD && $('#addList')) renderAddList();
      else if (S.tab === 'today' && !isCoach() && !sheets.length) render();
    },
    () => {
      delete WARM.pend[k];
      WARM.bad[k] = 1;
    },
  );
}
/* The amount a food is logged at when no amount is asked for: last time's, else its first household measure, else 100 g. */
function defAmount(food) {
  const units = unitsFor(food),
    { ui, qty, sv } = startAmount(food, units),
    u = units[ui],
    g = r1(qty * u.g * sv),
    bw = units[0].bw || 'g';
  return { qty, sv, u, g, label: amtLabel(u, qty, sv, g, bw, food.nog) };
}
/* Foods logged most often at this meal, most frequent first. */
function usuals(meal, n, min = 1) {
  return P.rec
    .map((r, i) => ({ r, i, c: (r.ms && r.ms[meal]) || 0 }))
    .filter(x => x.c >= min)
    .sort((a, b) => b.c - a.c || a.i - b.i)
    .slice(0, n)
    .map(x => x.r);
}
let lastLog = null;
async function quickLog(food, meal, opts = {}) {
  const a = defAmount(food);
  if (!(a.g > 0)) return openFood(food, { meal });
  remember(food, a.qty, a.u.short, meal, a.sv);
  const e = { ...portion(food, a.g), m: meal, u: a.label, q: a.qty, us: a.u.short, sv: a.sv };
  const ids = await logEntries([e], undefined, { keep: !!opts.keep, quiet: true });
  lastLog = { date: S.date, ids };
  if (!opts.silent) toast(food.n + ' added to ' + MEALS[meal].toLowerCase(), '', { act: 'undoLog', label: 'Undo' });
  return { id: ids[0], n: food.n, k: e.k };
}
async function removeEntries(date, ids) {
  const d = await loadDay(date),
    n = dropEntries(d, ids);
  if (n) commitDay(d);
  return n;
}
/* The drink logged most often from the caffeine tracker, or plain coffee until there is one. */
function usualDrink() {
  let best = DRINK.filter,
    n = 0;
  for (const [id, v] of Object.entries(P.dr || {}))
    if (DRINK[id] && (v.n || 0) > n) {
      best = DRINK[id];
      n = v.n;
    }
  return best;
}
const HOME = { rows: [] };

function heroCard(d, t, z) {
  const left = r0(z.b - t.k),
    state = t.k > z.hi ? 'over' : t.k >= z.lo ? 'in' : '';
  const max = Math.max(z.hi * 1.1, t.k * 1.03),
    pc = v => clamp((v / max) * 100, 0, 100);
  const note =
    state === 'in'
      ? 'Inside your zone'
      : state === 'over'
        ? fmt(r0(t.k - z.hi)) + ' kcal past your zone'
        : !t.k
          ? 'Nothing logged yet'
          : fmt(r0(z.lo - t.k)) + ' kcal to reach your zone';
  const mac = (l, cur, goal, cls) =>
    `<div class="hm"><div class="hm-l">${l}</div><div class="bar hb ${cls}"><i style="width:${clamp(goal ? (cur / goal) * 100 : 0, 0, 100)}%"></i></div><div class="hm-v tn"><b>${r0(cur)}</b> / ${goal} g</div></div>`;
  return `<section class="hero2 ${state}">
    <div class="h-top"><div><div class="num h-n">${fmt(Math.abs(left))}</div><div class="h-cap">kcal ${left >= 0 ? 'left' : 'over'}</div></div>
      <div class="h-kv tn"><span>Eaten</span><b>${fmt(t.k)}</b>${t.ex ? `<span>Exercise</span><b>${P.exAdd ? '+' : ''}${fmt(t.ex)}</b>` : ''}<span>Budget</span><b>${fmt(z.b)}</b></div></div>
    <div class="gauge" role="img" aria-label="${fmt(t.k)} of ${fmt(z.b)} kcal eaten. Your zone is ${fmt(z.lo)} to ${fmt(z.hi)}."><i class="gz" style="left:${pc(z.lo)}%;width:${pc(z.hi) - pc(z.lo)}%"></i><i class="gf" style="width:${pc(t.k)}%"></i><i class="gt" style="left:${pc(z.b)}%"></i></div>
    <div class="g-lab"><span>${note}</span><span class="tn">Zone ${fmt(z.lo)}–${fmt(z.hi)}</span></div>
    <button class="h-mac" data-act="dayNut" aria-label="Protein ${r0(t.p)} of ${P.t.p} g, carbs ${r0(t.c)} of ${P.t.c} g, fat ${r0(t.f)} of ${P.t.f} g. Open the full nutrition for the day, with fibre, sugars and salt.">${mac('Protein', t.p, P.t.p, 'p')}${mac('Carbs', t.c, P.t.c, 'c')}${mac('Fat', t.f, P.t.f, 'f')}</button>
  </section>`;
}
/* The single most useful thing to do next, or nothing. */
function nextUp(d, t, z) {
  if (d.date !== today()) return null;
  const h = new Date().getHours(),
    st = streak(),
    m = mealNow(),
    y = S.days[addDays(d.date, -1)];
  const has = k => d.e.some(e => e.m === k);
  if (WK)
    return {
      i: 'dumbbell',
      t: 'Session in progress',
      s: WK.name + ', started ' + Math.max(1, Math.round((Date.now() - WK.start) / 60000)) + ' min ago.',
      b: [['wkResume', 'Resume']],
    };
  if (!d.done) {
    const slot = !has(m) && (m !== 's' || !d.e.length) ? m : null;
    if (slot) {
      const ys = y ? y.e.filter(e => e.m === slot) : [],
        name = MEALS[slot].toLowerCase();
      const title = !d.e.length
        ? onBreak()
          ? 'You are on a break'
          : st.count > 0
            ? 'Log something to keep your ' + st.count + '-day streak'
            : "Start today's diary"
        : MEALS[slot] + ' is not logged yet';
      if (ys.length)
        return {
          i: 'flame',
          fill: !d.e.length,
          t: title,
          s:
            "Yesterday's " +
            name +
            ': ' +
            ys
              .slice(0, 3)
              .map(e => e.n)
              .join(', ') +
            (ys.length > 3 ? ' and ' + (ys.length - 3) + ' more' : '') +
            ', ' +
            fmt(ys.reduce((s, e) => s + e.k, 0)) +
            ' kcal.',
          b: [
            ['copyYesterday', 'Same again', slot],
            ['add', 'Something else', slot],
          ],
        };
      return {
        i: 'flame',
        fill: !d.e.length,
        t: title,
        s: 'Search for it, say it, or take a photo.',
        b: [['add', 'Log ' + name, slot]],
      };
    }
    const pl = r0(P.t.p - t.p),
      kl = r0(z.b - t.k);
    if (h >= 15 && pl >= P.t.p * 0.35 && kl > 150)
      return {
        i: 'spark',
        t: pl + ' g of protein still to go',
        s: 'You have ' + fmt(kl) + ' kcal left to fit it into.',
        b: [['ideas', 'See what fits']],
      };
    if (h >= 20 && has('d'))
      return {
        i: 'check',
        t: 'Close out today',
        s:
          fmt(t.k) +
          ' kcal eaten' +
          (t.k >= z.lo && t.k <= z.hi ? ', inside your zone' : '') +
          '. Closing the day banks your XP.',
        b: [['closeDay', 'Close the day']],
      };
  }
  const p = activeProg();
  const pl = plan(),
    fixed = pl.since && pl.days.length,
    due = fixed
      ? trainPlanned(d.date)
      : TR.sess.filter(s => s.d >= weekStart(d.date) && s.kind === 'train').length < (p ? p.days.length : 0);
  if (p && h >= 6 && h < 22 && !d.x.some(x => x.tr === 'train') && due)
    return {
      i: 'dumbbell',
      t: (fixed ? 'Planned for today: ' : 'Next session: ') + p.days[P.prog.at % p.days.length].n,
      s: p.n + (fixed && pl.tm ? ', at ' + pl.tm : '') + '.',
      b: [
        ['trainStart', 'Start'],
        ['tab', 'Open training', 'train'],
      ],
    };
  const lw = P.wts.length ? P.wts[P.wts.length - 1] : null,
    gap = lw ? Math.round((pdate(d.date) - pdate(lw.d)) / 864e5) : 99;
  if (P.goalKg && gap >= 7)
    return {
      i: 'scale',
      t: 'Time for a weigh-in',
      s: lw
        ? 'Your last one was ' + gap + ' days ago. A weekly weigh-in keeps the trend line honest.'
        : 'One weigh-in starts your trend line.',
      b: [['addWeight', 'Weigh in']],
    };
  return null;
}
function nextCard(n) {
  if (!n) return '';
  const btn = ([act, label, arg], i) =>
    `<button class="btn sm ${i ? 'ghost' : 'ember'}" data-act="${act}" ${arg ? (act === 'tab' ? `data-tab="${arg}"` : `data-meal="${arg}"`) : ''}>${label}</button>`;
  return `<section class="next"><div class="nx-i">${ic(n.i, n.fill ? 'fill' : '')}</div><div class="grow"><h2>${esc(n.t)}</h2><p>${esc(n.s)}</p><div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px">${n.b.map(btn).join('')}</div></div></section>`;
}
function againRail(d) {
  const m = mealNow(),
    us = usuals(m, 8),
    keyOf = r => (r.n + '|' + (r.b || '')).toLowerCase(),
    seen = new Set(us.map(keyOf));
  // what is already in this meal today is not offered again: the strip is for what is still to log
  const have = new Set(d.e.filter(e => e.m === m).map(keyOf));
  const list = us
    .concat(P.rec.filter(r => !seen.has(keyOf(r))))
    .filter(r => !have.has(keyOf(r)))
    .slice(0, 8);
  if (!list.length) return '';
  const strong = us.length && us[0].ms[m] >= 2;
  HOME.rows = [];
  return `<div class="rail-w"><div class="rail-h"><h2>${strong ? 'Your usual ' + MEALS[m].toLowerCase() : 'Log again'}</h2><span class="muted tiny">One tap adds it to ${MEALS[m].toLowerCase()}</span></div>
    <div class="rail">${list
      .map(r => {
        const f = resolveRecent(r),
          a = defAmount(f),
          i = HOME.rows.push(f) - 1;
        return `<button class="chipf" data-act="again" data-i="${i}" aria-label="Add ${esc(f.n)}, ${esc(a.label)}">${ic('plus')}<span><b>${esc(f.n)}</b><small class="tn">${fmt(portion(f, a.g).k)} kcal, ${esc(a.u.short === 'g' ? a.g + ' g' : (a.qty === 1 ? '' : a.qty + ' × ') + a.u.short)}</small></span></button>`;
      })
      .join('')}</div></div>`;
}
function mealsCard(d) {
  return `<section class="card meals">${Object.keys(MEALS)
    .map(m => {
      const es = d.e.filter(e => e.m === m),
        mk = es.reduce((s, e) => s + e.k, 0),
        mp = es.reduce((s, e) => s + e.p, 0),
        name = MEALS[m].toLowerCase();
      return `<div class="ml"><div class="ml-h"><button class="ml-t" data-act="add" data-meal="${m}"><h2>${MEALS[m]}</h2><small>${es.length ? es.length + (es.length === 1 ? ' food, ' : ' foods, ') + r0(mp) + ' g protein' : 'Nothing yet'}</small></button>
      ${es.length ? `<span class="ml-k tn">${fmt(mk)}<small> kcal</small></span>` : ''}<button class="icon-btn" data-act="mealMenu" data-meal="${m}" aria-label="${MEALS[m]} options">${ic('more', 'fill')}</button><button class="ml-add" data-act="add" data-meal="${m}" aria-label="Add to ${name}">${ic('plus')}</button></div>
      ${es.map(e => `<button class="entry" data-act="editEntry" data-id="${e.id}"><span class="n">${esc(e.n)}</span><span class="k">${fmt(e.k)}</span><span class="s">${srcBadge(e.src)}<span class="ell">${esc([e.b, e.u || (e.g ? e.g + ' g' : '')].filter(Boolean).join(' · '))}</span></span></button>`).join('')}</div>`;
    })
    .join('')}</section>`;
}
function trackers(d, t, isToday) {
  const tot = cafOf(d).reduce((s, c) => s + c.mg, 0),
    atBed = r0(cafLevel(cafDoses(d.date), bedTime(d.date)));
  const h = P.hist[d.date] || {},
    mins = xmin(d);
  const lw = P.wts.length ? P.wts[P.wts.length - 1] : null,
    pace = lw ? weeklyPace(trendSeries()) : null;
  const tile = (icon, name, val, unit, sub, extra, acts, open, wide) => {
    const head = `<${open ? `button data-act="${open}"` : 'div'} class="trk-h">${ic(icon)}<span>${name}</span></${open ? 'button' : 'div'}><div class="trk-v"><b class="num">${val}</b> ${unit}</div>${extra}<div class="trk-s">${sub}</div>`;
    return wide
      ? `<div class="trk wide"><div class="trk-l">${head}</div><div class="trk-a">${acts}</div></div>`
      : `<div class="trk">${head}<div class="trk-a">${acts}</div></div>`;
  };
  return `<div class="trks">
    ${tile('drop', 'Water', fmt(d.w), '/ ' + fmt(P.t.w) + ' ml', d.w >= P.t.w ? 'Target reached' : fmt(P.t.w - d.w) + ' ml to go', bar(d.w, P.t.w, 'ice'), `<button class="tkb" data-act="water" data-n="-250" aria-label="Remove 250 ml">${ic('minus')}</button><button class="tkb w" data-act="water" data-n="250">${ic('plus')} 250 ml</button>`, 'waterSheet', true)}
    ${fastTile(tile)}
    ${tile('cup', 'Caffeine', fmt(tot), '/ ' + CAF_MAX + ' mg', tot ? (atBed > 50 ? 'About ' + atBed + ' mg still active at ' + P.bed : 'About ' + atBed + ' mg left by ' + P.bed) : S.date === today() ? 'None today' : 'None that day', bar(tot, CAF_MAX, tot > CAF_MAX ? 'ember' : 'gold'), `<button class="tkb" data-act="caf" aria-label="All drinks and your caffeine curve">${ic('chart')}</button><button class="tkb w" data-act="cafAdd" data-id="${usualDrink().id}">${ic('plus')}<span class="ell">${esc(usualDrink().s || usualDrink().n)}</span></button>`, 'caf', true)}
    ${tile('pulse', 'Exercise', fmt(t.ex), 'kcal', [mins ? mins + ' min' : '', h.st ? fmt(h.st) + ' steps' : ''].filter(Boolean).join(', ') || (d.x.length ? d.x.length + (d.x.length === 1 ? ' activity' : ' activities') : 'Nothing yet'), '', `<button class="tkb w" data-act="addExercise">${ic('plus')} Add</button>`)}
    ${tile('scale', 'Weight', lw ? lw.kg : '–', 'kg', lw ? (lw.d === today() ? 'Weighed in today' : 'Last ' + niceDate(lw.d)) + (pace != null && Math.abs(pace) >= 0.05 ? ', ' + (pace < 0 ? 'down ' : 'up ') + Math.abs(r1(pace)) + ' kg a week' : '') : 'No weigh-ins yet', '', `<button class="tkb" data-act="tab" data-tab="progress" aria-label="Weight trend">${ic('chart')}</button><button class="tkb w" data-act="addWeight">${ic('plus')} Weigh in</button>`)}
  </div>`;
}
function questStrip(d, t) {
  const ids = questsFor(d.date),
    doneN = ids.filter(id => d.q[id]).length,
    nx = ids.find(id => !d.q[id]);
  let sub = 'All three done. Chest opened.';
  if (nx) {
    const q = QUESTS[nx],
      [a, b] = q.prog(d, t);
    sub = q.t + ', ' + fmt(a) + ' of ' + fmt(b) + (q.u || '');
  }
  return `<button class="qs" data-act="tab" data-tab="quests"><span class="qs-p">${ids.map(id => `<i class="${d.q[id] ? 'on' : ''}">${ic(d.q[id] ? 'check' : QUESTS[id].i)}</i>`).join('')}</span><span class="grow"><b>Daily quests</b><small>${esc(sub)}</small></span><span class="pill ${d.chest ? 'good' : 'gold'}">${ic('chest')} ${doneN} of 3</span></button>`;
}
function viewToday() {
  const d = day(),
    t = totals(d),
    z = zone(d),
    isToday = S.date === today();
  warmDay(addDays(S.date, -1));
  const ws = weekStart(S.date),
    tk = today();
  const week = WD.map((w, i) => {
    const k = addDays(ws, i),
      h = P.hist[k];
    const done = h && h.n > 0,
      fr = h && h.z && !done;
    const cls = done
      ? 'done'
      : fr
        ? 'frozen'
        : k === tk
          ? 'today'
          : k > tk
            ? 'future'
            : k >= P.created
              ? 'missed'
              : 'future';
    return `<button class="wk ${cls} ${k === S.date ? 'sel' : ''}" data-act="goDate" data-date="${k}" aria-label="${niceDate(k)}"><span class="node">${done ? ic('flame', 'fill') : fr ? ic('snow') : `<b class="tn">${pdate(k).getDate()}</b>`}</span>${w}</button>`;
  }).join('');
  const ts = isToday ? tasksFor(d) : [],
    p = activeProg();
  const closeBtn = d.done
    ? `<div class="between card"><span class="row">${ic('check')}<b>Day closed</b></span><span class="pill ${d.zone ? 'good' : ''}">${d.zone ? 'In your zone' : 'Outside your zone'}</span></div>`
    : d.e.length
      ? `<button class="btn" data-act="closeDay">${ic('check')} Close out ${isToday ? 'today' : 'this day'}</button>`
      : '';
  return `
  ${Store.mode === 'local' ? (authConfigured() ? `<div class="banner" data-act="signIn" role="button" tabindex="0">${ic('lock')}<span>Saved on this device only. Sign in to keep your diary safe and use it on your other devices.</span></div>` : `<div class="banner">${ic('lock')}<span>Saved on this device only.</span></div>`) : ''}
  <div class="datenav"><button class="icon-btn solid" data-act="shiftDate" data-n="-1" aria-label="Previous day">${ic('chev-l')}</button><button class="d" data-act="cal" aria-label="${niceDate(S.date)}, open the calendar">${ic('cal')}${niceDate(S.date)}</button><button class="icon-btn solid" data-act="shiftDate" data-n="1" aria-label="Next day">${ic('chev-r')}</button></div>
  <div class="week">${week}</div>
  ${heroCard(d, t, z)}
  ${bodyCard(S.date)}
  ${isToday && myUnread() ? msgStrip() : ''}
  ${planStrip(S.date)}
  ${cgOfferCard()}${cgCheckinCard()}${weekReviewCard()}
  ${noteCard()}
  ${nextCard(nextUp(d, t, z))}
  ${againRail(d)}
  ${mealsCard(d)}
  ${trackers(d, t, isToday)}
  ${d.x.length ? `<section class="card"><div class="meal-h"><h2>Exercise</h2><span class="k">${fmt(t.ex)} kcal</span></div>${d.x.map(x => `<button class="entry" data-act="delExercise" data-id="${x.id}"><span class="n">${esc(x.n)}</span><span class="k">${fmt(x.k)}</span><span class="s">${XSRC[x.src] ? `<span class="src l">${XSRC[x.src]}</span>` : ''}${x.min ? x.min + ' min · ' : ''}${x.km ? x.km + ' km · ' : ''}tap to remove</span></button>`).join('')}</section>` : ''}
  ${isToday ? questStrip(d, t) : ''}
  <div class="two"><button class="act" style="grid-column:1/-1" data-act="tab" data-tab="train">${ic('dumbbell')}<span>${WK ? 'Session in progress: ' + esc(WK.name) : p ? 'Next session: ' + esc(p.days[P.prog.at % p.days.length].n) : 'Training, rehab and recovery'}<small>${ts.length ? ts.filter(x => x.done).length + ' of ' + ts.length + ' tasks done today' : 'Programs, routines and tasks'}</small></span></button>
    <button class="act" data-act="coach">${ic('chat')}<span>Coach<small>Review and questions</small></span></button><button class="act" data-act="ideas">${ic('spark')}<span>What can I eat?<small>${fmt(Math.max(0, r0(z.b - t.k)))} kcal left</small></span></button></div>
  ${closeBtn}`;
}

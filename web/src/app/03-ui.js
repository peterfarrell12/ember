/* ---------- toasts, celebrations, sheets ---------- */
function toast(msg, kind = '', action = null) {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML =
    (kind === 'xp' ? ic('bolt', 'fill') : '') +
    `<span>${esc(msg)}</span>` +
    (action ? `<button data-act="${action.act}">${esc(action.label)}</button>` : '');
  const box = $('#toasts');
  if (action)
    $$('.toast', box).forEach(t => {
      if (t.querySelector('button')) t.remove();
    });
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(
    () => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    },
    kind === 'xp' ? 1500 : action ? 4500 : 2600,
  );
}
let celeOpen = false;
function flushCele() {
  if (celeOpen || !celeQ.length) return;
  const c = celeQ.shift();
  celeOpen = true;
  $('#cele').innerHTML = `<div class="cele" role="dialog" aria-modal="true"><div class="box">
    <div class="em ${c.tone || ''}">${ic(c.icon, c.fill ? 'fill' : '')}</div>
    <h3>${esc(c.title)}</h3>${c.sub ? `<p class="muted">${esc(c.sub)}</p>` : ''}
    ${c.list ? `<ul>${c.list.map(l => `<li class="${l[2] ? '' : 'no'}"><span>${esc(l[0])}</span><b class="tn">${esc(l[1])}</b></li>`).join('')}</ul>` : ''}
    ${c.rewards && c.rewards.length ? `<div class="rw">${c.rewards.map(r => `<span class="pill gold">${esc(r)}</span>`).join('')}</div>` : ''}
    <button class="btn" data-act="celeNext">Continue</button></div></div>`;
  if (c.confetti) confetti();
  const b = $('#cele .btn');
  if (b) b.focus({ preventScroll: true });
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confetti'),
    app = $('#app');
  cv.classList.remove('hide');
  const W = (cv.width = app.clientWidth),
    H = (cv.height = app.clientHeight);
  const ctx = cv.getContext('2d');
  const cols = ['#E4511B', '#C48A1C', '#1B7F56', '#2F7FA8', '#F4B740'];
  const ps = Array.from({ length: 90 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H * 0.42,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 12 - 4,
    s: 5 + Math.random() * 6,
    c: cols[(Math.random() * cols.length) | 0],
    r: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
  }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of ps) {
      p.vy += 0.32;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - f / 95);
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }
    if (++f < 95) requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, W, H);
      cv.classList.add('hide');
    }
  })();
}
const sheets = [];
function openSheet(html, full = false) {
  const wrap = document.createElement('div');
  wrap.className = 'scrim';
  wrap.innerHTML = `<div class="sheet ${full ? 'full' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  wrap.addEventListener('mousedown', e => {
    if (e.target === wrap && !wrap._locked) closeSheet();
  });
  $('#sheets').appendChild(wrap);
  sheets.push(wrap);
  return wrap.firstElementChild;
}
function closeSheet(n = 1) {
  while (n-- > 0 && sheets.length) {
    const w = sheets.pop();
    if (w._onClose) w._onClose();
    w.remove();
  }
  closeMenu();
}
const closeAll = () => closeSheet(sheets.length);
const topSheet = () => (sheets.length ? sheets[sheets.length - 1].firstElementChild : null);
const sh = (title, extra = '') =>
  `<div class="sheet-h"><h3>${esc(title)}</h3>${extra}<button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div>`;
function closeMenu() {
  const m = $('.menu');
  if (m) m.remove();
}
function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items
    .map(
      i =>
        `<button data-act="${i.act}" ${Object.entries(i.data || {})
          .map(([k, v]) => `data-${k}="${esc(v)}"`)
          .join(' ')}>${ic(i.icon)}${esc(i.label)}</button>`,
    )
    .join('');
  const app = $('#app').getBoundingClientRect(),
    r = anchor.getBoundingClientRect();
  $('#app').appendChild(m);
  m.style.top = Math.min(r.bottom - app.top + 6, app.height - m.offsetHeight - 12) + 'px';
  m.style.right = Math.max(12, app.right - r.right) + 'px';
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
}

/* ---------- main render ---------- */
function render() {
  if (!S.ready) return;
  renderChrome();
  asFab();
  const st = streak();
  const cs = $('#chipStreak');
  cs.classList.toggle('off', !st.todayDone);
  cs.querySelector('span').textContent = st.count;
  cs.title = st.atRisk ? 'Log something today to keep your streak' : 'Day streak';
  $('#chipGems span').textContent = fmt(P.gems);
  $$('nav.tabs .tab').forEach(b =>
    b.dataset.tab === S.tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'),
  );
  const m = $('#main');
  $('#chipYou').classList.toggle('on', S.tab === 'you');
  applyTheme();
  m.innerHTML =
    demoBanner() +
    (isGym()
      ? viewGym()
      : isCoach()
        ? viewCoach()
        : S.tab === 'today'
          ? viewToday()
          : S.tab === 'train'
            ? viewTrain()
            : S.tab === 'progress'
              ? viewProgress()
              : S.tab === 'quests'
                ? viewQuests()
                : viewMore());
}
function bar(cur, goal, cls = '') {
  return `<div class="bar ${cls}"><i style="width:${clamp(goal ? (cur / goal) * 100 : 0, 0, 100)}%"></i></div>`;
}

function questRow(id, d, t) {
  const q = QUESTS[id];
  const [a, b] = q.prog(d, t);
  const done = !!d.q[id];
  return `<div class="quest ${done ? 'done' : ''}"><div class="qi">${ic(done ? 'check' : q.i)}</div><div><div class="qt">${q.t}</div>${bar(a, b, done ? 'good' : 'gold')}</div><div class="qn">${done ? '+20 XP' : fmt(a) + ' / ' + fmt(b) + (q.u || '')}</div></div>`;
}

function viewFood() {
  const n = S.range,
    tk = today();
  const keys = Array.from({ length: n }, (_, i) => addDays(tk, i - n + 1));
  const hs = keys.map(k => P.hist[k]);
  const logged = hs.filter(h => h && h.n > 0);
  const avg = f => (logged.length ? logged.reduce((s, h) => s + (h[f] || 0), 0) / logged.length : 0);
  const zoneDays = keys.filter(k => {
    const h = P.hist[k];
    if (!h || !h.n) return false;
    const b = P.t.k + (P.exAdd ? h.ex || 0 : 0);
    return h.k >= b * 0.9 && h.k <= b * 1.08;
  }).length;
  // calories chart
  const W = 340,
    H = 150,
    padL = 4,
    padB = 18,
    padT = 8;
  const maxV = Math.max(P.t.k * 1.25, ...hs.map(h => (h ? h.k : 0)));
  const bw = (W - padL * 2) / n;
  const y = v => padT + (H - padT - padB) * (1 - v / maxV);
  const bars = keys
    .map((k, i) => {
      const h = hs[i];
      const v = h ? h.k : 0;
      const x = padL + i * bw + bw * 0.15,
        w = bw * 0.7;
      const col = !v
        ? 'var(--line)'
        : v > P.t.k * 1.08
          ? 'var(--ember)'
          : v >= P.t.k * 0.9
            ? 'var(--good)'
            : 'var(--muted)';
      const lbl = n === 7 ? WD[(pdate(k).getDay() + 6) % 7][0] : i % 5 === 4 || i === n - 1 ? pdate(k).getDate() : '';
      return `<rect x="${x}" y="${v ? y(v) : H - padB - 3}" width="${w}" height="${v ? H - padB - y(v) : 3}" rx="${Math.min(4, w / 2)}" fill="${col}"/><text x="${x + w / 2}" y="${H - 4}" text-anchor="middle">${lbl}</text>`;
    })
    .join('');
  const ty = y(P.t.k);
  const pk = avg('p') * 4,
    ck = avg('c') * 4,
    fk = avg('f') * 9,
    sum = pk + ck + fk || 1;
  // weight chart
  const wts = P.wts
    .slice()
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .slice(-40);
  let wchart = `<p class="empty">No weigh-ins yet. Add one to start your trend line.</p>`;
  if (wts.length >= 2) {
    const lo = Math.min(...wts.map(w => w.kg)) - 0.5,
      hi = Math.max(...wts.map(w => w.kg)) + 0.5;
    const t0 = pdate(wts[0].d).getTime(),
      t1 = pdate(wts[wts.length - 1].d).getTime() || t0 + 1;
    const px = w => 8 + (W - 16) * ((pdate(w.d).getTime() - t0) / Math.max(1, t1 - t0)),
      py = w => 10 + 100 * (1 - (w.kg - lo) / (hi - lo));
    const pts = wts.map(w => px(w).toFixed(1) + ',' + py(w).toFixed(1)).join(' ');
    const last = wts[wts.length - 1];
    wchart = `<svg class="chart" viewBox="0 0 ${W} 132" role="img" aria-label="Weight trend"><line x1="8" x2="${W - 8}" y1="110" y2="110" stroke="var(--line)"/><polygon points="8,110 ${pts} ${W - 8},110" fill="var(--ember-soft)"/><polyline points="${pts}" fill="none" stroke="var(--ember)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${px(last)}" cy="${py(last)}" r="5" fill="var(--ember)" stroke="var(--surface)" stroke-width="2"/><text x="8" y="127">${niceDate(wts[0].d)} · ${wts[0].kg} kg</text><text x="${W - 8}" y="127" text-anchor="end">${niceDate(last.d)} · ${last.kg} kg</text></svg>`;
  } else if (wts.length === 1)
    wchart = `<p class="empty">One weigh-in so far: ${wts[0].kg} kg on ${niceDate(wts[0].d)}. Add another to see a trend.</p>`;
  const lastW = wts[wts.length - 1],
    firstW = wts[0];
  const delta = lastW && firstW ? r1(lastW.kg - firstW.kg) : 0;
  // month calendar
  const now = pdate(tk),
    y0 = now.getFullYear(),
    m0 = now.getMonth();
  const first = new Date(y0, m0, 1, 12),
    dim = new Date(y0, m0 + 1, 0).getDate(),
    lead = (first.getDay() + 6) % 7;
  let cal = '';
  for (let i = 0; i < lead; i++) cal += '<i class="x"></i>';
  for (let dd = 1; dd <= dim; dd++) {
    const k = y0 + '-' + pad(m0 + 1) + '-' + pad(dd),
      h = P.hist[k];
    cal += `<i class="${h && h.n > 0 ? (h.zn ? 'zone' : 'on') : h && h.z ? 'z' : ''} ${k === tk ? 't' : ''}">${dd}</i>`;
  }
  return `
  <section class="card"><div class="between"><h2>Calories</h2><div class="seg" style="width:160px"><button data-act="range" data-n="7" aria-pressed="${n === 7}">7 days</button><button data-act="range" data-n="30" aria-pressed="${n === 30}">30 days</button></div></div><div class="muted small" style="margin-top:6px">Target ${fmt(P.t.k)} kcal</div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Calories per day" style="margin-top:10px"><line x1="0" x2="${W}" y1="${ty}" y2="${ty}" stroke="var(--ink)" stroke-dasharray="3 4" stroke-width="1" opacity=".5"/>${bars}</svg>
    <div class="row tiny muted" style="gap:12px;margin-top:8px;flex-wrap:wrap"><span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:var(--good)"></i>In zone</span><span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:var(--ember)"></i>Over</span><span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:var(--muted)"></i>Under</span></div></section>
  <div class="stat4"><div class="stat"><div class="num">${logged.length ? fmt(avg('k')) : '0'}</div><span>Average kcal on logged days</span></div><div class="stat"><div class="num">${logged.length} of ${n}</div><span>Days logged</span></div><div class="stat"><div class="num">${zoneDays}</div><span>Days in your zone</span></div><div class="stat"><div class="num">${r0(avg('p'))} g</div><span>Average protein</span></div></div>
  <section class="card"><h2>Where your calories come from</h2>
    <div class="split" style="margin:12px 0 10px"><i style="width:${(pk / sum) * 100}%;background:var(--m-p)"></i><i style="width:${(ck / sum) * 100}%;background:var(--m-c)"></i><i style="width:${(fk / sum) * 100}%;background:var(--m-f)"></i></div>
    <div class="grid3 small"><div><b style="color:var(--m-p)">${r0((pk / sum) * 100)}%</b> protein</div><div><b style="color:var(--m-c)">${r0((ck / sum) * 100)}%</b> carbs</div><div><b style="color:var(--m-f)">${r0((fk / sum) * 100)}%</b> fat</div></div></section>
  <section class="card"><div class="between"><h2>${MONTHS[m0]}</h2><span class="muted small">${ic('flame', 'fill')} ${streak().count}-day streak</span></div>
    <div class="cal" style="margin-top:12px">${cal}</div>
    <div class="row tiny muted" style="gap:12px;margin-top:10px;flex-wrap:wrap"><span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:var(--ember)"></i>Logged</span><span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:var(--good)"></i>Closed in zone</span><span class="row" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:var(--ice-soft);border:1px solid var(--ice)"></i>Streak freeze</span></div></section>`;
}

function viewQuests() {
  const lv = levelOf(P.xp),
    f0 = levelFloor(lv),
    f1 = levelFloor(lv + 1),
    st = streak();
  const tk = today();
  const d = S.days[tk] || newDay(tk),
    t = totals(d),
    ids = questsFor(tk);
  const daysLeft = 7 - ((pdate(tk).getDay() + 6) % 7);
  const lgNote =
    P.lg.xp >= PROMO
      ? P.lg.tier < LEAGUES.length - 1
        ? 'Promotion secured. You move up to ' + LEAGUES[P.lg.tier + 1] + ' on Monday.'
        : 'Top league held for another week.'
      : P.lg.xp >= STAY
        ? fmt(PROMO - P.lg.xp) + ' XP more this week to reach ' + (LEAGUES[P.lg.tier + 1] || 'the top') + '.'
        : P.lg.tier > 0
          ? 'Earn ' + fmt(STAY - P.lg.xp) + ' XP more to stay in ' + LEAGUES[P.lg.tier] + '.'
          : fmt(PROMO - P.lg.xp) + ' XP this week moves you up to ' + LEAGUES[1] + '.';
  return `
  ${squadCard()}
  <section class="card"><div class="lvl"><div class="badge">${lv}</div><div class="stack" style="gap:6px"><div class="between"><h2>Level ${lv}</h2><span class="muted small tn">${fmt(P.xp - f0)} / ${fmt(f1 - f0)} XP</span></div>${bar(P.xp - f0, f1 - f0, 'gold lg')}<span class="muted tiny">${fmt(P.xp)} XP earned in total</span></div></div></section>
  <section class="card"><div class="between"><div class="streak-big"><svg class="ic fill fl ${st.todayDone ? '' : 'off'}"><use href="#i-flame"/></svg><div><div class="num">${st.count}</div><span class="muted small">day streak · best ${Math.max(P.best, st.count)}</span></div></div></div>
    <p class="small ${st.atRisk ? '' : 'muted'}" style="margin:10px 0 12px">${st.todayDone ? 'Today is logged. Your streak is safe.' : st.atRisk ? 'Log one food today to keep your streak alive.' : 'Log one food today to light your streak.'}</p>
    <div class="between"><span class="row small"><span class="pill ice">${ic('snow')} ${P.fr} of 2</span>Streak freezes</span><button class="btn sm ghost" data-act="buyFreeze" ${P.fr >= 2 || P.gems < 50 ? 'disabled' : ''}>${ic('gem')} 50</button></div>
    <p class="tiny muted" style="margin-top:8px">A freeze covers one missed day automatically.</p></section>
  <section class="card"><div class="between"><h2>${LEAGUES[P.lg.tier]} league</h2><span class="muted small">${daysLeft} day${daysLeft === 1 ? '' : 's'} left</span></div>
    <div class="ladder">${LEAGUES.map((l, i) => `<i class="${i <= P.lg.tier ? 'on' : ''}" title="${l}"></i>`).join('')}</div>
    <div class="between small" style="margin-bottom:6px"><b>${fmt(P.lg.xp)} XP this week</b><span class="muted tn">${fmt(PROMO)} to move up</span></div>${bar(P.lg.xp, PROMO, 'ember lg')}
    <p class="small muted" style="margin-top:10px">${lgNote}</p></section>
  ${bossCard()}
  <section class="card"><div class="between"><h2>Daily quests</h2><span class="pill ${d.chest ? 'good' : 'gold'}">${ic('chest')} ${d.chest ? 'Chest opened' : ids.filter(id => d.q[id]).length + ' of 3'}</span></div><div style="margin-top:6px">${ids.map(id => questRow(id, d, t)).join('')}</div><p class="tiny muted" style="margin-top:8px">Each quest pays 20 XP and 5 gems. All three open the chest for 30 XP and 15 gems.</p></section>
  <section class="card"><div class="between"><h2>Achievements</h2><span class="muted small">${Object.keys(P.ach).length} of ${ACH.length}</span></div>
    <div class="ach" style="margin-top:14px">${ACH.map(a => {
      const on = !!P.ach[a.id];
      return `<div class="ac ${on ? 'on' : ''}"><div class="md">${ic(on ? 'trophy' : 'lock')}</div>${esc(a.t)}<span>${on ? 'Earned' : esc(a.d) + ' · ' + fmt(Math.min(a.v(), a.g)) + '/' + fmt(a.g)}</span></div>`;
    }).join('')}</div></section>`;
}

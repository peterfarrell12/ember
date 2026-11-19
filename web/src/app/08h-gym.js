/* ---------- Gym: a prototype with one sample gym. Timetable, bookings with waitlists, check-in, members, coaches, plans, insights.
   No money moves and nobody outside this account can book: it exists to settle the flows before a standalone build. ---------- */
let G = null;
const isGym = () => P && P.mode === 'gym' && Store.owner !== false;
const hs = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };
const G_NAMES = ['Aisling Dolan', 'Brian Coyle', 'Cathal Reidy', 'Deirdre Lally', 'Emer Quirke', 'Fergal Noone', 'Grainne Tighe', 'Hugh Mannion', 'Imelda Rush', 'Jarlath Greaney', 'Keelin Forde', 'Lorcan Duignan', 'Mairead Shiel', 'Niall Cusack', 'Oonagh Lavin', 'Padraic Glynn', 'Roisin Tully', 'Shane Looby', 'Treasa Henry', 'Ultan Burke', 'Una Geraghty', 'Vincent Hoban', 'Yvonne Leyden', 'Colm Scally', 'Sorcha Heneghan', 'Tadhg Flanagan'];
function gymSeed() {
  const C = (id, n, coach, room, wd, tm, min, cap) => ({ id, n, coach, room, wd, tm, min, cap });
  return { v: 1, name: 'Riverside Strength and Fitness', sample: true, cut: 2,
    rooms: ['Studio 1', 'Gym floor', 'Spin room'],
    coaches: [{ id: 'k1', n: 'Orla Keane', role: 'Spin and conditioning', ver: true, pt: true }, { id: 'k2', n: 'Declan Moran', role: 'Strength coach', ver: true, pt: true }, { id: 'k3', n: 'Maeve Tierney', role: 'Yoga, Pilates and mobility', ver: true, pt: false }, { id: 'k4', n: 'Rory Hanlon', role: 'HIIT and circuits', ver: false, pt: true }],
    spaces: [{ id: 's1', n: 'Studio 2', min: 60, open: 7, close: 21 }, { id: 's2', n: 'Court 1', min: 90, open: 8, close: 22 }],
    plans: [{ id: 'p1', n: 'Unlimited', kind: 'unl', price: 59, per: 'a month' }, { id: 'p2', n: '10-class pass', kind: 'pass', price: 90, per: 'for 10 classes', size: 10 }, { id: 'p3', n: 'Pay as you go', kind: 'payg', price: 12, per: 'a class' }],
    classes: [C('c1', 'Strength', 'k2', 1, 0, '06:30', 60, 14), C('c2', 'Spin', 'k1', 2, 0, '18:00', 45, 20), C('c3', 'Yoga', 'k3', 0, 0, '19:00', 60, 16), C('c4', 'HIIT', 'k4', 0, 1, '07:00', 45, 18), C('c5', 'Pilates', 'k3', 0, 1, '18:30', 55, 14), C('c6', 'Strength', 'k2', 1, 2, '06:30', 60, 14), C('c7', 'Spin', 'k1', 2, 2, '18:00', 45, 20), C('c8', 'Mobility', 'k3', 0, 2, '19:15', 45, 16), C('c9', 'HIIT', 'k4', 0, 3, '07:00', 45, 18), C('c10', 'Strength', 'k2', 1, 3, '18:30', 60, 14), C('c11', 'Spin', 'k1', 2, 4, '06:30', 45, 20), C('c12', 'HIIT', 'k4', 0, 4, '17:30', 45, 18), C('c13', 'Strength', 'k2', 1, 5, '09:00', 60, 14), C('c14', 'Yoga', 'k3', 0, 5, '10:15', 60, 16), C('c15', 'Mobility', 'k3', 0, 6, '10:00', 45, 16)],
    members: [{ id: 'me', n: 'You', plan: 'p2', left: 10, since: today() }].concat(Array.from({ length: 78 }, (_, i) => { const f = G_NAMES[i % 26].split(' ')[0], l = G_NAMES[(i + Math.floor(i / 26) * 7) % 26].split(' ')[1];
      return { id: 'm' + i, n: f + ' ' + l, plan: i % 5 === 0 ? 'p2' : i % 7 === 0 ? 'p3' : 'p1', left: i % 5 === 0 ? 2 + (i % 7) : 0, since: addDays(today(), -30 - (i * 13) % 700), w: i % 8 === 5 ? .04 : 1.2 + hs('w' + i) * 3.2, sample: true }; })),
    book: {}, appts: [], feed: [{ id: 'f1', d: addDays(today(), -2), t: 'New Saturday yoga at 10:15 with Maeve. Booking is open.' }, { id: 'f2', d: addDays(today(), -6), t: 'The gym floor closes at 8pm on Friday for maintenance.' }] };
}
async function loadGym() { if (G) return G; try { G = await Store.get('meta', 'gym'); } catch (e) { G = null; } if (!G || !G.v) { G = gymSeed(); } return G; }
const saveGym = () => { if (G) Store.put('meta', 'gym', G); };
const gCls = id => G.classes.find(c => c.id === id), gCoach = id => G.coaches.find(c => c.id === id) || { n: 'Coach', ver: false }, gMem = id => G.members.find(m => m.id === id), gPlan = id => G.plans.find(p => p.id === id) || G.plans[0];
const gKey = (d, c) => d + '|' + c.id, gStart = (d, tm) => { const [h, m] = tm.split(':').map(Number); return pdate(d).setHours(h, m, 0, 0); };
const classesOn = d => G.classes.filter(c => c.wd === wdOf(d)).sort((a, b) => a.tm < b.tm ? -1 : 1);
/* A session's bookings: what was stored once anyone touched it, otherwise a repeatable made-up fill from the sample members. */
function gSess(d, c) {
  const key = gKey(d, c); if (G.book[key]) return G.book[key];
  const pop = .75 + hs('pop' + c.id) * .4 + (c.tm >= '17:00' ? .2 : 0);
  const all = G.members.filter(m => m.sample && hs(key + m.id) < (m.w || 2) / 15 * pop).map(m => [m.id, hs(key + 'o' + m.id)]).sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, c.cap + 4), r = { in: all.slice(0, c.cap), wait: all.slice(c.cap), att: {}, gen: 1 };
  if (gStart(d, c.tm) < Date.now()) r.in.forEach(id => { if (hs(key + id + 'ns') > .08) r.att[id] = 1; });
  return r;
}
function gMut(d, c) { const key = gKey(d, c); if (!G.book[key]) { const r = gSess(d, c); G.book[key] = { in: r.in.slice(), wait: r.wait.slice(), att: { ...r.att } }; } return G.book[key]; }
const gPast = (d, c) => gStart(d, c.tm) + c.min * 60000 < Date.now();
/* visits over the last 30 days and last visit, per member, worked out once per render */
let gStatAt = 0, gStatV = null;
function gStats() {
  if (gStatV && Date.now() - gStatAt < 1500) return gStatV; const tk = today(), by = {}, days = []; let cap = 0, inn = 0, ns = 0, att = 0;
  for (let i = 27; i >= 0; i--) { const d = addDays(tk, -i); let dayAtt = 0;
    classesOn(d).forEach(c => { if (!gPast(d, c)) return; const s = gSess(d, c); cap += c.cap; inn += s.in.length; s.in.forEach(id => { const b = by[id] = by[id] || { v: 0, last: '' }; if (s.att[id]) { b.v++; b.last = d; att++; dayAtt++; } else ns++; }); });
    days.push([d, dayAtt]); }
  gStatAt = Date.now(); return gStatV = { by, days, fill: cap ? inn / cap : 0, ns: inn ? ns / inn : 0, att };
}
const gRisk = m => { const b = gStats().by[m.id]; return m.id !== 'me' && (!b || !b.last || b.last < addDays(today(), -13)); };
/* ---- bookings ---- */
function gBook(d, c, mid) {
  const s = gMut(d, c), m = gMem(mid), pl = gPlan(m.plan); if (s.in.includes(mid) || s.wait.includes(mid)) return 'already';
  if (pl.kind === 'pass' && !(m.left > 0)) return 'nopass';
  if (s.in.length < c.cap) { s.in.push(mid); if (pl.kind === 'pass') m.left--; saveGym(); return 'in'; } s.wait.push(mid); saveGym(); return 'wait';
}
function gCancel(d, c, mid) {
  const s = gMut(d, c), m = gMem(mid), pl = gPlan(m.plan), late = gStart(d, c.tm) - Date.now() < G.cut * 3600e3; let res = 'none';
  if (s.wait.includes(mid)) { s.wait = s.wait.filter(x => x !== mid); res = 'wait'; }
  else if (s.in.includes(mid)) { s.in = s.in.filter(x => x !== mid); delete s.att[mid]; if (pl.kind === 'pass' && !late) m.left++; res = late ? 'late' : 'ok';
    if (s.wait.length) { const up = s.wait.shift(), um = gMem(up); s.in.push(up); if (um && gPlan(um.plan).kind === 'pass') um.left = Math.max(0, (um.left || 0) - 1); if (up === 'me') toast('A place opened up: you are in ' + c.n + ' on ' + shortDate(d)); } }
  saveGym(); return res;
}
async function gAttend(d, c, mid, on) {
  const s = gMut(d, c); if (on) s.att[mid] = 1; else delete s.att[mid]; saveGym();
  if (mid !== 'me' || d > today()) return; const day = await loadDay(d), gid = gKey(d, c), had = day.x.some(x => x.gid === gid);
  if (on && !had) { const x = { id: newId(), n: c.n + ' class', k: xk(c.n === 'Yoga' || c.n === 'Mobility' || c.n === 'Pilates' ? 3 : c.n === 'Strength' ? 5 : 8, 1, c.min), min: c.min, src: 'm', gid }; day.x.push(x); xlogAdd(d, x); commitDay(day); }
  else if (!on && had) { day.x = day.x.filter(x => x.gid !== gid); commitDay(day); }
}
/* what the member has booked on a date, for the calendar and Today */
function gymMine(k) {
  if (!G) return []; const out = [];
  classesOn(k).forEach(c => { const s = G.book[gKey(k, c)]; if (!s) return; const w = s.wait.includes('me'); if (s.in.includes('me') || w) out.push({ type: 'ev', id: 'g:' + c.id, k: 'class', t: c.n + ' class', tm: c.tm, sub: (w ? 'On the waitlist, ' : '') + c.min + ' min with ' + gCoach(c.coach).n.split(' ')[0], done: !!s.att.me }); });
  G.appts.filter(a => a.d === k && a.m === 'me').forEach(a => out.push({ type: 'ev', id: 'g:' + a.id, k: a.type === 'pt' ? 'appt' : 'match', t: a.type === 'pt' ? 'One-to-one with ' + gCoach(a.ref).n.split(' ')[0] : (G.spaces.find(s => s.id === a.ref) || {}).n + ' booked', tm: a.tm, sub: a.min + ' min at ' + G.name, done: false }));
  return out;
}
/* ---- slots for one-to-ones and space hire ---- */
function gSlots(type, ref, d) {
  const sp = type === 'space' ? G.spaces.find(s => s.id === ref) : null, step = sp ? sp.min : 60, open = sp ? sp.open : 7, close = sp ? sp.close : 20, out = [];
  for (let t = open * 60; t + step <= close * 60; t += step) { const tm = pad(Math.floor(t / 60)) + ':' + pad(t % 60), mine = G.appts.find(a => a.type === type && a.ref === ref && a.d === d && a.tm === tm);
    const busy = type === 'pt' && classesOn(d).some(c => { if (c.coach !== ref) return false; const [h, m] = c.tm.split(':').map(Number), cs = h * 60 + m; return cs < t + step && cs + c.min > t; });
    out.push({ tm, min: step, mine, taken: !mine && (busy || hs(type + ref + d + tm) < (type === 'pt' ? .3 : .38)), past: gStart(d, tm) < Date.now() }); }
  return out;
}

/* =================== member side: My gym =================== */
let GM = null;
A.gym = async ({ tab } = {}) => { await loadGym(); GM = { tab: tab || 'cls', d: today(), ref: '' }; openSheet(`<div class="sheet-h"><div class="grow" style="min-width:0"><h3 class="ell">${esc(G.name)}</h3><div class="tiny muted">Sample gym. Bookings here are a prototype: no payment is taken and no one is notified.</div></div><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="sheet-b" id="gmBody"></div>`, true); sheets[sheets.length - 1]._onClose = () => { GM = null; render(); }; SEG.gmTab = v => { GM.tab = v; GM.ref = ''; renderGM(); }; renderGM(); };
const dayStrip = (act, sel) => `<div class="wds">${Array.from({ length: 7 }, (_, i) => addDays(today(), i)).map(k => `<button data-act="${act}" data-date="${k}" aria-pressed="${k === sel}" aria-label="${longDate(k)}"><small>${WD[wdOf(k)]}</small>${pdate(k).getDate()}</button>`).join('')}</div>`;
function renderGM() {
  const b = $('#gmBody'); if (!b || !GM) return; const me = gMem('me'), pl = gPlan(me.plan), d = GM.d, keep = b.scrollTop; let body = '';
  if (GM.tab === 'cls') {
    body = dayStrip('gmDay', d) + (classesOn(d).map(c => { const s = gSess(d, c), inn = s.in.includes('me'), w = s.wait.includes('me'), left = c.cap - s.in.length, past = gStart(d, c.tm) < Date.now(), k = gCoach(c.coach), soon = d === today() && gStart(d, c.tm) - Date.now() < 45 * 60000 && !gPast(d, c);
      const btn = s.att.me ? `<span class="pill good">${ic('check')} Checked in</span>` : inn && soon ? `<button class="btn sm ember" data-act="gmHere" data-id="${c.id}">Check in</button>` : inn ? `<button class="btn sm ghost" data-act="gmCancel" data-id="${c.id}">Booked ${ic('check')}</button>` : w ? `<button class="btn sm ghost" data-act="gmCancel" data-id="${c.id}">Waitlist ${s.wait.indexOf('me') + 1}</button>` : past ? '' : left > 0 ? `<button class="btn sm" data-act="gmBook" data-id="${c.id}">Book</button>` : `<button class="btn sm ghost" data-act="gmBook" data-id="${c.id}">Join waitlist</button>`;
      return `<div class="ag ${past && !inn ? 'done' : ''}"><span class="tm tn">${c.tm}</span><span class="grow" style="min-width:0"><b>${esc(c.n)}</b><small>${c.min} min with ${esc(k.n)}${k.ver ? ' · gym verified' : ''}</small><small class="${left <= 0 ? 'bad' : ''}">${past ? s.in.length + ' booked' : left > 0 ? left + ' of ' + c.cap + ' places left' : 'Full, ' + s.wait.length + ' waiting'}</small></span>${btn}</div>`; }).join('') || `<p class="empty">No classes on ${longDate(d)}.</p>`);
    body = `<section class="card">${body}</section><p class="tiny muted">Cancel up to ${G.cut} hours before a class to keep your place on a pass.</p>`;
  } else if (GM.tab === 'pt' || GM.tab === 'sp') {
    const type = GM.tab === 'pt' ? 'pt' : 'space', list = type === 'pt' ? G.coaches.filter(k => k.pt) : G.spaces; if (!GM.ref || !list.some(x => x.id === GM.ref)) GM.ref = list[0] ? list[0].id : '';
    body = `<div class="opts">${list.map(x => `<button data-act="gmRef" data-id="${x.id}" aria-pressed="${GM.ref === x.id}">${esc(x.n)}</button>`).join('')}</div>${dayStrip('gmDay', d)}
      <section class="card"><h2>${type === 'pt' ? 'One-to-one with ' + esc(gCoach(GM.ref).n) : esc((G.spaces.find(s => s.id === GM.ref) || {}).n || '')}</h2><p class="small muted" style="margin:2px 0 10px">${type === 'pt' ? esc(gCoach(GM.ref).role || '') + '. 60 minutes.' : 'Hire by the slot.'}</p>
      <div class="slots">${gSlots(type, GM.ref, d).map(s => `<button data-act="gmSlot" data-tm="${s.tm}" ${s.taken || s.past ? 'disabled' : ''} aria-pressed="${!!s.mine}">${s.tm}</button>`).join('')}</div><p class="tiny muted" style="margin-top:10px">Tap a free time to book it. Tap your booking again to cancel.</p></section>`;
  } else {
    const up = []; for (let i = 0; i < 14; i++) { const k = addDays(today(), i); gymMine(k).forEach(it => up.push([k, it])); }
    const month = today().slice(0, 7), board = G.members.map(m => [m, m.id === 'me' ? Object.entries(G.book).filter(([k, s]) => k.slice(0, 7) === month && s.att.me).length : (gStats().by[m.id] || { v: 0 }).v]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    body = `<section class="card stack"><div class="between"><h2>Your membership</h2><span class="pill gold">${esc(pl.n)}</span></div><p class="small muted">${pl.kind === 'pass' ? me.left + ' of ' + pl.size + ' classes left on your pass.' : pl.kind === 'unl' ? 'Unlimited classes.' : 'You pay per class.'} €${pl.price} ${pl.per}.</p><div class="opts">${G.plans.map(p => `<button data-act="gmPlan" data-id="${p.id}" aria-pressed="${p.id === me.plan}">${esc(p.n)}</button>`).join('')}</div></section>
      <section class="card"><h2>Your bookings</h2>${up.map(([k, it]) => `<div class="ag"><span class="tm tn">${it.tm}</span><span class="grow"><b>${esc(it.t)}</b><small>${k === today() ? 'Today' : shortDate(k)}, ${esc(it.sub)}</small></span></div>`).join('') || `<p class="empty">Nothing booked in the next two weeks.</p>`}</section>
      <section class="card"><h2>From the gym</h2>${G.feed.slice(0, 5).map(f => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc(f.t)}</span><span class="k"></span><span class="s">${niceDate(f.d)}</span></div>`).join('') || `<p class="empty">No announcements.</p>`}</section>
      <section class="card"><div class="between"><h2>Most classes, last four weeks</h2><span class="pill">Sample</span></div>${board.map(([m, v], i) => `<div class="crow" style="padding:9px 0"><span class="av sm">${i + 1}</span><span class="grow"><b>${esc(m.n)}</b></span><span class="tn muted">${v} classes</span></div>`).join('')}</section>`;
  }
  b.innerHTML = segHtml('gmTab', [['cls', 'Classes'], ['pt', 'One-to-one'], ['sp', 'Spaces'], ['mine', 'Mine']], GM.tab) + body; b.scrollTop = keep;
}
A.gmDay = ({ date }) => { GM.d = date; renderGM(); };
A.gmRef = ({ id }) => { GM.ref = id; renderGM(); };
A.gmBook = ({ id }) => { const c = gCls(id), r = gBook(GM.d, c, 'me'); renderGM(); render(); toast(r === 'in' ? 'Booked: ' + c.n + ', ' + (GM.d === today() ? 'today' : shortDate(GM.d)) + ' at ' + c.tm : r === 'wait' ? 'You are on the waitlist. You move up when someone cancels.' : r === 'nopass' ? 'Your pass has no classes left. Change your membership under Mine.' : 'Already booked'); };
A.gmCancel = ({ id }) => { const c = gCls(id), r = gCancel(GM.d, c, 'me'); renderGM(); render(); toast(r === 'late' ? 'Cancelled. It was inside ' + G.cut + ' hours, so the class still comes off your pass.' : r === 'wait' ? 'You are off the waitlist' : 'Booking cancelled'); };
A.gmHere = async ({ id }) => { const c = gCls(id); await gAttend(GM.d, c, 'me', true); renderGM(); toast('Checked in. ' + c.n + ' is logged as exercise.'); };
A.gmSlot = ({ tm }) => { const type = GM.tab === 'pt' ? 'pt' : 'space', i = G.appts.findIndex(a => a.type === type && a.ref === GM.ref && a.d === GM.d && a.tm === tm);
  if (i >= 0) { G.appts.splice(i, 1); toast('Booking cancelled'); } else { const sp = G.spaces.find(s => s.id === GM.ref); G.appts.push({ id: newId(), type, ref: GM.ref, d: GM.d, tm, min: sp ? sp.min : 60, m: 'me' }); toast('Booked for ' + tm + (GM.d === today() ? ' today' : ' on ' + shortDate(GM.d))); }
  saveGym(); renderGM(); render(); };
A.gmPlan = ({ id }) => { const me = gMem('me'), p = gPlan(id); me.plan = id; me.left = p.kind === 'pass' ? p.size : 0; saveGym(); renderGM(); toast('Membership changed to ' + p.n + '. Nothing was charged.'); };
function gymStrip() {
  if (!G) { loadGym().then(() => { if (!sheets.length && !isCoach() && !isGym()) render(); }); return ''; }
  let nx = null; for (let i = 0; i < 14 && !nx; i++) { const k = addDays(today(), i), it = gymMine(k).filter(x => !x.done)[0]; if (it) nx = [k, it]; }
  return `<button class="act" data-act="gym">${ic('home')}<span>My gym<small>${nx ? 'Next: ' + esc(nx[1].t) + ', ' + (nx[0] === today() ? 'today' : shortDate(nx[0])) + ' at ' + nx[1].tm : 'Classes, one-to-ones and space hire at ' + esc(G.name)}</small></span></button>`;
}

/* =================== gym view =================== */
A.modeMenu = (_, el) => openMenu(el, [{ act: 'modeGo', icon: 'users', label: 'Coach view', data: { m: 'coach' } }, { act: 'modeGo', icon: 'home', label: 'Gym view', data: { m: 'gym' } }]);
A.modeGo = async ({ m }) => { if (m === 'coach') return A.modeToggle(); await loadGym(); P.mode = 'gym'; saveProfile(); closeAll(); S.tab = 'gday'; S.gd = today(); render(); $('#main').scrollTop = 0; toast('Gym view'); };
A.modeBack = () => { if (isCoach()) return A.modeToggle(); P.mode = 'me'; saveProfile(); closeAll(); S.tab = 'today'; render(); $('#main').scrollTop = 0; toast('Your view'); };
function viewGym() { if (!G) { loadGym().then(render); return `<div class="busy"><div class="spinner"></div>Opening the gym</div>`; } return S.tab === 'gtime' ? gTime() : S.tab === 'gpeople' ? gPeople() : gDay(); }
const sessRow = (d, c) => { const s = gSess(d, c), k = gCoach(c.coach), past = gPast(d, c), att = Object.keys(s.att).length; return `<button class="pr" data-act="gSess" data-date="${d}" data-id="${c.id}"><span class="pd"><b>${c.tm}</b></span><span class="grow" style="min-width:0"><b>${esc(c.n)}</b><small>${esc(k.n)}, ${esc(G.rooms[c.room] || '')}</small><span class="row" style="gap:8px;margin-top:5px"><span class="grow">${bar(s.in.length, c.cap, s.in.length >= c.cap ? 'ember' : 'good')}</span><small class="tn" style="white-space:nowrap">${past ? att + ' of ' + s.in.length + ' came' : s.in.length + ' / ' + c.cap}${s.wait.length ? ', ' + s.wait.length + ' waiting' : ''}</small></span></span>${ic('chev-r')}</button>`; };
function gDay() {
  const tk = today(), st = gStats(), risk = G.members.filter(gRisk), cls = classesOn(tk), booked = cls.reduce((s, c) => s + gSess(tk, c).in.length, 0), cap = cls.reduce((s, c) => s + c.cap, 0), ap = G.appts.filter(a => a.d === tk), mx = Math.max(1, ...st.days.map(x => x[1]));
  const fills = G.classes.map(c => { let n = 0, f = 0; for (let i = 1; i <= 28; i++) { const d = addDays(tk, -i); if (wdOf(d) === c.wd) { n++; f += gSess(d, c).in.length / c.cap; } } return [c, n ? f / n : 0]; }).sort((a, b) => b[1] - a[1]);
  const fr = ([c, f]) => `<div class="row small" style="padding:6px 0"><span style="width:118px" class="ell"><b>${esc(c.n)}</b> ${WD[c.wd]} ${c.tm}</span><span class="grow">${bar(f * 100, 100, f > .92 ? 'ember' : 'good')}</span><span class="tn muted" style="width:38px;text-align:right">${r0(f * 100)}%</span></div>`;
  return `<section class="thero"><div><div class="th-k">${niceDate(tk)}${G.sample ? ', sample data' : ''}</div><div class="th-t" style="font-size:26px">${esc(G.name)}</div><div class="th-f">${cls.length} classes today, ${booked} of ${cap} places booked${ap.length ? ', ' + ap.length + ' other bookings' : ''}.</div></div>
      <div class="th-meta"><span>${r0(st.fill * 100)}% of places filled</span><span>${r0(st.ns * 100)}% no-shows</span><span>${G.members.length - risk.length} active members</span></div><div class="th-links"><button data-act="gName">Rename the gym</button></div></section>
    <section class="card" style="padding:4px 14px"><div class="between" style="padding:10px 0 4px"><h2>Today's classes</h2><span class="muted small">Tap for the register</span></div>${cls.map(c => sessRow(tk, c)).join('') || `<p class="empty" style="padding-bottom:10px">No classes today.</p>`}</section>
    ${ap.length ? `<section class="card"><h2>One-to-ones and hires today</h2>${ap.sort((a, b) => a.tm < b.tm ? -1 : 1).map(a => `<div class="ag"><span class="tm tn">${a.tm}</span><span class="grow"><b>${a.type === 'pt' ? 'One-to-one, ' + esc(gCoach(a.ref).n) : esc((G.spaces.find(s => s.id === a.ref) || {}).n || 'Space')}</b><small>${esc((gMem(a.m) || {}).n || 'Member')}, ${a.min} min</small></span></div>`).join('')}</section>` : ''}
    ${risk.length ? `<button class="pstrip hot" data-act="gRisk">${ic('alert')}<span class="grow"><b>${risk.length} members have not been in for two weeks</b><small>${esc(risk.slice(0, 3).map(m => m.n.split(' ')[0]).join(', '))}${risk.length > 3 ? ' and ' + (risk.length - 3) + ' more' : ''}. A message now is cheaper than a cancellation.</small></span>${ic('chev-r')}</button>` : ''}
    <section class="card"><div class="between"><h2>Check-ins, last four weeks</h2><span class="muted small tn">${fmt(st.att)} in total</span></div><div class="gbars">${st.days.map(([d, n]) => `<i style="height:${Math.max(3, n / mx * 100)}%" title="${niceDate(d)}: ${n}"></i>`).join('')}</div></section>
    <section class="card"><h2>Fullest and quietest classes</h2><p class="small muted" style="margin:2px 0 6px">Average share of places booked over four weeks.</p>${fills.slice(0, 3).map(fr).join('')}<div style="border-top:1px solid var(--line);margin:6px 0"></div>${fills.slice(-3).map(fr).join('')}</section>
    <section class="card stack"><div class="between"><h2>Announcements</h2><button class="link" data-act="gPost">New</button></div>${G.feed.slice(0, 4).map(f => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc(f.t)}</span><span class="k"></span><span class="s">${niceDate(f.d)} · <button class="link" data-act="gPostDel" data-id="${f.id}" style="font-size:12px">remove</button></span></div>`).join('') || `<p class="empty">Nothing posted. Members see these in My gym.</p>`}</section>
    <p class="tiny muted">${ic('lock')} Prototype: one sample gym, made-up members, no payments and no reminders. You are the member called You.</p>`;
}
function gTime() {
  const d = S.gd || today(), ws = weekStart(d), ap = G.appts.filter(a => a.d === d);
  return `<div class="between"><h2 class="sec-h" style="font-size:20px">Timetable</h2><div class="row" style="gap:6px"><button class="icon-btn solid" data-act="gWeek" data-n="-1" aria-label="Earlier week">${ic('chev-l')}</button><button class="icon-btn solid" data-act="gWeek" data-n="1" aria-label="Later week">${ic('chev-r')}</button></div></div>
    <div class="wds">${Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map(k => `<button data-act="gDate" data-date="${k}" aria-pressed="${k === d}" aria-label="${longDate(k)}"><small>${WD[wdOf(k)]}</small>${pdate(k).getDate()}</button>`).join('')}</div>
    <section class="card" style="padding:4px 14px"><div class="between" style="padding:10px 0 4px"><h2>${d === today() ? 'Today' : longDate(d)}</h2><button class="btn sm" data-act="gClass">${ic('plus')} Class</button></div>${classesOn(d).map(c => sessRow(d, c)).join('') || `<p class="empty" style="padding-bottom:10px">No classes on this day.</p>`}</section>
    <section class="card"><h2>One-to-ones and space hire</h2>${ap.sort((a, b) => a.tm < b.tm ? -1 : 1).map(a => `<div class="ag"><span class="tm tn">${a.tm}</span><span class="grow"><b>${a.type === 'pt' ? 'One-to-one, ' + esc(gCoach(a.ref).n) : esc((G.spaces.find(s => s.id === a.ref) || {}).n || 'Space')}</b><small>${esc((gMem(a.m) || {}).n || 'Member')}, ${a.min} min</small></span></div>`).join('') || `<p class="empty">None booked. Members book these from My gym.</p>`}
      <p class="small muted" style="margin-top:8px">Spaces for hire: ${esc(G.spaces.map(s => s.n + ' (' + s.min + ' min slots)').join(', '))}.</p></section>`;
}
A.gDate = ({ date }) => { S.gd = date; render(); }; A.gWeek = ({ n }) => { S.gd = addDays(S.gd || today(), 7 * n); render(); };
let GP = 'mem', GF = 'all';
function gPeople() {
  const st = gStats(); let body;
  if (GP === 'mem') { const list = G.members.filter(m => GF === 'risk' ? gRisk(m) : true).sort((a, b) => a.id === 'me' ? -1 : b.id === 'me' ? 1 : a.n < b.n ? -1 : 1);
    body = `<div class="between"><div class="opts" style="margin:0"><button data-act="gFilter" data-v="all" aria-pressed="${GF === 'all'}">All ${G.members.length}</button><button data-act="gFilter" data-v="risk" aria-pressed="${GF === 'risk'}">At risk ${G.members.filter(gRisk).length}</button></div><button class="btn sm" data-act="gMember">${ic('plus')} Member</button></div>
      <section class="card" style="padding:2px 14px">${list.map(m => { const b = st.by[m.id] || { v: 0, last: '' }, p = gPlan(m.plan); return `<button class="crow" data-act="gMem" data-id="${m.id}"><span class="av">${esc(initials(m.n))}</span><span class="grow" style="min-width:0"><span class="row" style="gap:6px"><b class="ell">${esc(m.n)}</b>${m.id === 'me' ? '<span class="pill gold">You</span>' : m.sample ? '<span class="pill">Sample</span>' : ''}${gRisk(m) ? '<span class="pill bad">At risk</span>' : ''}</span><span class="small muted ell" style="display:block">${esc(p.n)}${p.kind === 'pass' ? ', ' + (m.left || 0) + ' left' : ''} · ${m.id === 'me' ? 'your own bookings' : b.last ? b.v + ' visits in 4 weeks, last ' + (b.last === today() ? 'today' : niceDate(b.last)) : 'no visits in 4 weeks'}</span></span>${ic('chev-r')}</button>`; }).join('') || `<p class="empty">Nobody here.</p>`}</section>`; }
  else if (GP === 'coach') body = `<div class="between"><p class="small muted" style="max-width:70%">A verified badge shows on a coach's public profile and on every class they take.</p><button class="btn sm" data-act="gCoachNew">${ic('plus')} Coach</button></div><section class="card" style="padding:2px 14px">${G.coaches.map(k => { const n = G.classes.filter(c => c.coach === k.id).length, rt = (4.4 + hs('rt' + k.id) * .55).toFixed(1); return `<button class="crow" data-act="gCoach" data-id="${k.id}"><span class="av">${esc(initials(k.n))}</span><span class="grow" style="min-width:0"><span class="row" style="gap:6px"><b class="ell">${esc(k.n)}</b>${k.ver ? `<span class="pill good">${ic('shield')} Verified</span>` : '<span class="pill">Not verified</span>'}</span><span class="small muted ell" style="display:block">${esc(k.role || '')} · ${n} classes a week${k.pt ? ' · one-to-ones' : ''} · rated ${rt} by members who attended (sample)</span></span>${ic('chev-r')}</button>`; }).join('')}</section>`;
  else body = `${G.plans.map(p => `<section class="card stack"><div class="between"><h2>${esc(p.n)}</h2><b class="tn">€${p.price} <span class="muted small">${p.per}</span></b></div><p class="small muted">${G.members.filter(m => m.plan === p.id).length} members. ${p.kind === 'pass' ? 'A class comes off the pass at booking and goes back on a cancellation made in time.' : p.kind === 'unl' ? 'Book as many classes as they like.' : 'Charged per class attended.'}</p></section>`).join('')}<p class="tiny muted">${ic('lock')} Prices are labels only here. Taking payment needs the standalone app with a card processor.</p>`;
  return segHtml('gPeople', [['mem', 'Members'], ['coach', 'Coaches'], ['plan', 'Memberships']], GP) + body;
}
SEG.gPeople = v => { GP = v; render(); }; A.gFilter = ({ v }) => { GF = v; render(); }; A.gRisk = () => { GP = 'mem'; GF = 'risk'; A.tab({ tab: 'gpeople' }); };
/* register for one session */
let GS = null;
A.gSess = ({ date, id }) => { GS = { d: date, id }; openSheet(`${sh(gCls(id).n + ', ' + gCls(id).tm)}<div class="sheet-b" id="gsBody"></div>`, true); sheets[sheets.length - 1]._onClose = () => { GS = null; render(); }; renderGS(); };
function renderGS() {
  const b = $('#gsBody'); if (!b || !GS) return; const c = gCls(GS.id), d = GS.d, s = gSess(d, c), k = gCoach(c.coach), started = gStart(d, c.tm) - Date.now() < 30 * 60000, free = G.members.filter(m => !s.in.includes(m.id) && !s.wait.includes(m.id));
  b.innerHTML = `<div class="row" style="flex-wrap:wrap;gap:6px"><span class="pill gold">${d === today() ? 'Today' : longDate(d)}</span><span class="pill">${esc(k.n)}</span><span class="pill">${esc(G.rooms[c.room] || '')}</span><span class="pill">${c.min} min</span></div>
    <div class="stat4 row4"><div class="stat"><div class="num">${s.in.length}</div><span>Booked</span></div><div class="stat"><div class="num">${c.cap}</div><span>Places</span></div><div class="stat"><div class="num">${s.wait.length}</div><span>Waiting</span></div><div class="stat"><div class="num">${Object.keys(s.att).length}</div><span>Here</span></div></div>
    <section class="card" style="padding:2px 14px"><div class="between" style="padding:10px 0 2px"><h2>Register</h2><span class="muted small">${started ? 'Tick people as they arrive' : 'Opens 30 minutes before'}</span></div>${s.in.map(id => { const m = gMem(id) || { n: 'Member' }; return `<div class="crow" style="padding:9px 0"><span class="av sm">${esc(initials(m.n))}</span><span class="grow"><b>${esc(m.n)}</b>${gPast(d, c) && !s.att[id] ? '<small class="bad" style="display:block">No-show</small>' : ''}</span><button class="icon-btn" data-act="gsDrop" data-id="${id}" aria-label="Remove ${esc(m.n)} from this class">${ic('x')}</button><button class="tick sm" data-act="gsTick" data-id="${id}" aria-pressed="${!!s.att[id]}" aria-label="Checked in">${ic('check')}</button></div>`; }).join('') || `<p class="empty" style="padding-bottom:10px">Nobody booked yet.</p>`}</section>
    ${s.wait.length ? `<section class="card"><h2>Waitlist</h2>${s.wait.map((id, i) => `<div class="crow" style="padding:9px 0"><span class="av sm">${i + 1}</span><span class="grow"><b>${esc((gMem(id) || {}).n || 'Member')}</b></span></div>`).join('')}<p class="tiny muted" style="margin-top:6px">The first person moves in automatically when a place opens.</p></section>` : ''}
    <label class="f">Book a member in<select class="inp" id="gsAdd" data-on="gsAdd"><option value="">Choose a member</option>${free.map(m => `<option value="${m.id}">${esc(m.n)}</option>`).join('')}</select></label>
    <button class="link" data-act="gClassEdit" data-id="${c.id}" style="align-self:flex-start">Edit this class</button>`;
}
A.gsTick = async ({ id }) => { const c = gCls(GS.id), s = gSess(GS.d, c); await gAttend(GS.d, c, id, !s.att[id]); renderGS(); };
A.gsDrop = ({ id }) => { const c = gCls(GS.id), before = gSess(GS.d, c).wait[0]; gCancel(GS.d, c, id); renderGS(); toast(before ? (gMem(before) || {}).n + ' moved in from the waitlist' : 'Removed from the class'); };
I.gsAdd = el => { if (!el.value) return; const c = gCls(GS.id), r = gBook(GS.d, c, el.value); renderGS(); toast(r === 'in' ? 'Booked in' : r === 'wait' ? 'Class is full: added to the waitlist' : r === 'nopass' ? 'Their pass has no classes left' : 'Already booked'); };
/* small forms */
A.gAdd = (_, el) => openMenu(el, [{ act: 'gClass', icon: 'cal', label: 'New class' }, { act: 'gMember', icon: 'user', label: 'New member' }, { act: 'gPost', icon: 'chat', label: 'Announcement' }]);
A.gName = () => { openSheet(`${sh('Gym name')}<div class="sheet-b"><input class="inp" id="gNm" value="${esc(G.name)}"></div><div class="sheet-f"><button class="btn" data-act="gNameSave">Save</button></div>`); };
A.gNameSave = () => { const v = $('#gNm').value.trim().slice(0, 50); if (v) { G.name = v; saveGym(); } closeSheet(); render(); };
A.gPost = () => openSheet(`${sh('Announcement')}<div class="sheet-b"><textarea class="inp" id="gPt" style="min-height:90px" placeholder="Members see this in My gym"></textarea></div><div class="sheet-f"><button class="btn" data-act="gPostSave">Post</button></div>`);
A.gPostSave = () => { const t = $('#gPt').value.trim().slice(0, 300); if (!t) return; G.feed.unshift({ id: newId(), d: today(), t }); saveGym(); closeSheet(); render(); };
A.gPostDel = ({ id }) => { G.feed = G.feed.filter(f => f.id !== id); saveGym(); render(); };
A.gMember = () => openSheet(`${sh('New member')}<div class="sheet-b"><label class="f">Name<input class="inp" id="gmN" autocomplete="off"></label><label class="f">Membership<select class="inp" id="gmP">${G.plans.map(p => `<option value="${p.id}">${esc(p.n)}, €${p.price} ${p.per}</option>`).join('')}</select></label></div><div class="sheet-f"><button class="btn" data-act="gMemberSave">Add member</button></div>`);
A.gMemberSave = () => { const n = $('#gmN').value.trim().slice(0, 50); if (!n) return toast('Give them a name.'); const p = gPlan($('#gmP').value); G.members.push({ id: newId(), n, plan: p.id, left: p.kind === 'pass' ? p.size : 0, since: today() }); saveGym(); closeSheet(); GP = 'mem'; GF = 'all'; render(); toast(n + ' added'); };
A.gMem = ({ id }) => { const m = gMem(id), b = gStats().by[id] || { v: 0, last: '' }, up = []; for (let i = 0; i < 14; i++) { const k = addDays(today(), i); classesOn(k).forEach(c => { const s = gSess(k, c); if (s.in.includes(id)) up.push(shortDate(k) + ', ' + c.tm + ' ' + c.n); else if (s.wait.includes(id)) up.push(shortDate(k) + ', ' + c.tm + ' ' + c.n + ' (waitlist)'); }); }
  openSheet(`${sh(m.n)}<div class="sheet-b"><div class="row" style="flex-wrap:wrap;gap:6px">${m.sample ? '<span class="pill">Sample member</span>' : ''}${gRisk(m) ? '<span class="pill bad">At risk</span>' : ''}<span class="pill">Member since ${niceDate(m.since)}</span></div>
    <div class="stat4"><div class="stat"><div class="num">${b.v}</div><span>Visits in 4 weeks</span></div><div class="stat"><div class="num" style="font-size:18px">${b.last ? niceDate(b.last) : 'None'}</div><span>Last visit</span></div></div>
    <div class="f">Membership<div class="opts">${G.plans.map(p => `<button data-act="gMemPlan" data-id="${id}" data-p="${p.id}" aria-pressed="${p.id === m.plan}">${esc(p.n)}</button>`).join('')}</div></div>
    <section class="card"><h2>Booked, next two weeks</h2>${up.slice(0, 8).map(t => `<div class="small" style="padding:6px 0;border-top:1px solid var(--line)">${esc(t)}</div>`).join('') || `<p class="empty">Nothing booked.</p>`}</section>
    ${id === 'me' ? '' : `<button class="link" data-act="gMemDel" data-id="${id}" style="color:var(--bad);align-self:center">Remove this member</button>`}</div>`, true); };
A.gMemPlan = ({ id, p }) => { const m = gMem(id), pl = gPlan(p); m.plan = p; m.left = pl.kind === 'pass' ? pl.size : 0; saveGym(); closeSheet(); A.gMem({ id }); render(); };
A.gMemDel = ({ id }) => { G.members = G.members.filter(m => m.id !== id); Object.values(G.book).forEach(s => { s.in = s.in.filter(x => x !== id); s.wait = s.wait.filter(x => x !== id); }); saveGym(); closeSheet(); render(); toast('Member removed'); };
A.gCoach = ({ id }) => { const k = gCoach(id); openSheet(`${sh(k.n)}<div class="sheet-b"><p class="muted">${esc(k.role || '')}</p><button class="chk" data-act="gCoachFlag" data-id="${id}" data-f="ver" aria-pressed="${!!k.ver}"><span class="tb">${k.ver ? ic('check') : ''}</span><span>Verified by the gym: qualifications and insurance checked</span></button><button class="chk" data-act="gCoachFlag" data-id="${id}" data-f="pt" aria-pressed="${!!k.pt}"><span class="tb">${k.pt ? ic('check') : ''}</span><span>Takes one-to-one bookings</span></button>
    <section class="card"><h2>Classes</h2>${G.classes.filter(c => c.coach === id).map(c => `<div class="small" style="padding:6px 0;border-top:1px solid var(--line)">${WDL[c.wd]} ${c.tm}, ${esc(c.n)}</div>`).join('') || `<p class="empty">No classes yet.</p>`}</section></div>`, true); };
A.gCoachFlag = ({ id, f }) => { const k = gCoach(id); k[f] = !k[f]; saveGym(); closeSheet(); A.gCoach({ id }); render(); };
A.gCoachNew = () => openSheet(`${sh('New coach')}<div class="sheet-b"><label class="f">Name<input class="inp" id="gkN" autocomplete="off"></label><label class="f">What they coach<input class="inp" id="gkR" placeholder="Strength and conditioning"></label></div><div class="sheet-f"><button class="btn" data-act="gCoachSave">Add coach</button></div>`);
A.gCoachSave = () => { const n = $('#gkN').value.trim().slice(0, 50); if (!n) return toast('Give them a name.'); G.coaches.push({ id: newId(), n, role: $('#gkR').value.trim().slice(0, 60), ver: false, pt: false }); saveGym(); closeSheet(); render(); };
let GC = null;
const classForm = c => `<label class="f">Class name<input class="inp" id="gcN" value="${esc(c.n || '')}" placeholder="Kettlebells"></label><div class="grid2"><label class="f">Day<select class="inp" id="gcW">${WDL.map((w, i) => `<option value="${i}" ${i === c.wd ? 'selected' : ''}>${w}</option>`).join('')}</select></label><label class="f">Time<input class="inp" type="time" id="gcT" value="${c.tm || '18:00'}"></label><label class="f">Minutes<input class="inp" id="gcM" inputmode="numeric" value="${c.min || 45}"></label><label class="f">Places<input class="inp" id="gcC" inputmode="numeric" value="${c.cap || 16}"></label></div>
  <label class="f">Coach<select class="inp" id="gcK">${G.coaches.map(k => `<option value="${k.id}" ${k.id === c.coach ? 'selected' : ''}>${esc(k.n)}</option>`).join('')}</select></label><label class="f">Room<select class="inp" id="gcR">${G.rooms.map((r, i) => `<option value="${i}" ${i === c.room ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>`;
A.gClass = () => { GC = { id: '' }; openSheet(`${sh('New weekly class')}<div class="sheet-b">${classForm({ wd: wdOf(S.gd || today()) })}</div><div class="sheet-f"><button class="btn" data-act="gClassSave">Add to the timetable</button></div>`, true); };
A.gClassEdit = ({ id }) => { GC = { id }; openSheet(`${sh('Edit class')}<div class="sheet-b">${classForm(gCls(id))}</div><div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="gClassDel" aria-label="Delete this class">${ic('trash')}</button><button class="btn" data-act="gClassSave">Save</button></div>`, true); };
A.gClassSave = () => { const n = $('#gcN').value.trim().slice(0, 40); if (!n) return toast('Give the class a name.'); const v = { n, wd: +$('#gcW').value, tm: /^\d\d:\d\d$/.test($('#gcT').value) ? $('#gcT').value : '18:00', min: clamp(r0(num($('#gcM').value, 45)), 10, 240), cap: clamp(r0(num($('#gcC').value, 16)), 1, 200), coach: $('#gcK').value, room: +$('#gcR').value };
  if (GC.id) Object.assign(gCls(GC.id), v); else G.classes.push({ id: newId(), ...v }); saveGym(); closeAll(); render(); toast(GC.id ? 'Class updated' : n + ' added, every ' + WDL[v.wd] + ' at ' + v.tm); };
A.gClassDel = () => { G.classes = G.classes.filter(c => c.id !== GC.id); saveGym(); closeAll(); render(); toast('Class removed from the timetable'); };

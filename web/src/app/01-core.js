// @ts-check
'use strict';
/* ---------- storage: cloud (db capability) with a device-only fallback ---------- */
const MEM = {};
const LS = {
  get(k) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return MEM[k] ?? null;
    }
  },
  set(k, v) {
    MEM[k] = v;
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
  del(k) {
    delete MEM[k];
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  },
  keys(prefix) {
    const out = new Set(Object.keys(MEM).filter(k => k.startsWith(prefix)));
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.add(k);
      }
    } catch (e) {}
    return [...out];
  },
};
/* Where documents are kept. Each backend offers the same four operations; Store picks one at start-up.
   - local: this device only (localStorage)
   - claude: the document store of the Claude page the prototype ran in. Still used by the browser tests
     and by the coach and gym code, which reads shared documents through Store.db
   - supabase: the signed-in person's rows in user_docs (backend-supabase.js). Store.account is their email */
const localBackend = {
  /** @param {StoreKind} kind @param {string} [id] */
  key: (kind, id) => 'ember:' + kind + (id ? ':' + id : ''),
  async get(kind, id) {
    return LS.get(this.key(kind, id));
  },
  async list(kind) {
    return LS.keys(this.key(kind) + ':')
      .map(k => LS.get(k))
      .filter(Boolean);
  },
  set(kind, id, data) {
    LS.set(this.key(kind, id), data);
  },
  remove(kind, id) {
    LS.del(this.key(kind, id));
  },
};
const claudeBackend = base => ({
  ref: (kind, id) => (kind === 'profile' ? base : base.collection(kind).doc(id)),
  async get(kind, id) {
    const s = await withTimeout(this.ref(kind, id).get());
    return s.exists ? clone(s.data()) : null;
  },
  async list(kind) {
    const qs = await withTimeout(base.collection(kind).limit(500).get());
    return qs.docs.map(d => ({ ...clone(d.data()), id: d.id }));
  },
  set(kind, id, data) {
    return this.ref(kind, id).set(data);
  },
  remove(kind, id) {
    return this.ref(kind, id).delete();
  },
});
const Store = {
  mode: 'boot',
  db: null,
  backend: null,
  q: {},
  busy: 0,
  failed: false,
  /** Works out where data lives: the signed-in account ('cloud') or this device only ('local'). */
  async init() {
    let db = null,
      id = null;
    try {
      if (window.claude && window.claude.use) {
        const [d, u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (d && u) {
          id = await u.id();
          if (id) db = d;
          try {
            this.owner = !!(await u.isOwner());
          } catch (e) {
            this.owner = true;
          }
        }
      }
    } catch (e) {}
    if (db) {
      this.mode = 'cloud';
      this.db = db;
      this.uid = id;
      this.backend = claudeBackend(db.doc('data/users/' + id + '/profile'));
    } else {
      this.mode = 'local';
      this.owner = true;
      this.backend = localBackend;
      try {
        const user = await signedInUser();
        if (user) {
          this.mode = 'cloud';
          this.uid = user.id;
          this.account = user.email || '';
          this.backend = supabaseBackend(await supabaseClient(), user.id);
        }
      } catch (e) {
        console.warn('sign-in check failed', e);
      }
    }
    setSync();
  },
  /**
   * The localStorage key for a document in local mode.
   * @param {StoreKind} kind
   * @param {string} [id]
   */
  key(kind, id) {
    return localBackend.key(kind, id);
  },
  /**
   * Read one document, or null when there is none.
   * @param {StoreKind} kind
   * @param {string} [id]
   * @returns {Promise<any>}
   */
  async get(kind, id) {
    return this.backend.get(kind, id);
  },
  /**
   * Read every document of a kind (at most 500).
   * @param {StoreKind} kind
   * @returns {Promise<any[]>}
   */
  async list(kind) {
    return this.backend.list(kind);
  },
  /**
   * Save a document. Returns at once; the write is queued, and for one document the last write wins.
   * Does nothing while the sample preview is showing.
   * @param {StoreKind} kind
   * @param {string | undefined} id
   * @param {object} data
   */
  put(kind, id, data) {
    if (DEMO) return;
    this.enqueue(kind, id, { data: clone(data) });
  },
  /**
   * Delete a document. Queued like put().
   * @param {StoreKind} kind
   * @param {string} [id]
   */
  del(kind, id) {
    if (DEMO) return;
    this.enqueue(kind, id, { del: true });
  },
  /**
   * @param {StoreKind} kind
   * @param {string | undefined} id
   * @param {{ data?: object, del?: boolean, retried?: boolean }} job
   */
  enqueue(kind, id, job) {
    if (this.mode !== 'cloud') {
      job.del ? localBackend.remove(kind, id) : localBackend.set(kind, id, job.data);
      return;
    }
    const k = kind + '/' + (id || '');
    const q = this.q[k] || (this.q[k] = { run: false, next: null });
    q.next = job;
    if (!q.run) this.pump(q, kind, id);
  },
  async pump(q, kind, id) {
    q.run = true;
    this.busy++;
    setSync();
    while (q.next) {
      const job = q.next;
      q.next = null;
      try {
        await (job.del ? this.backend.remove(kind, id) : this.backend.set(kind, id, job.data));
        this.failed = false;
      } catch (e) {
        if (e && e.code === 'unavailable' && !job.retried) {
          job.retried = true;
          await sleep(700 + Math.random() * 900);
          if (!q.next) q.next = job;
        } else {
          this.failed = true;
          console.warn('save failed', kind, id, e);
          toast(
            e && e.code === 'quota_exceeded'
              ? 'Storage is full. Delete old data to keep saving.'
              : 'Could not save. Check your connection.',
          );
        }
      }
    }
    q.run = false;
    this.busy--;
    setSync();
  },
};
function setSync() {
  const el = $('#sync');
  if (!el) return;
  el.className = 'sync ' + (Store.mode !== 'cloud' ? 'local' : Store.failed ? 'err' : Store.busy ? 'saving' : '');
  el.title =
    Store.mode !== 'cloud'
      ? 'Saved on this device only'
      : Store.failed
        ? 'Last save failed'
        : Store.busy
          ? 'Saving'
          : 'Saved to your account';
}

/* ---------- state ---------- */
const S = { tab: 'today', date: today(), ready: false, days: {}, recipes: {}, foods: {}, range: 7 };
let P = null; // profile
const defaultProfile = () => ({
  v: 1,
  onboarded: false,
  sex: 'm',
  age: 30,
  cm: 178,
  kg: 80,
  act: 1.375,
  goal: 'lose',
  rate: 0.5,
  t: { k: 2000, p: 140, c: 215, f: 65, w: 2500 },
  exAdd: true,
  xp: 0,
  gems: 0,
  fr: 1,
  best: 0,
  ach: {},
  lg: { tier: 0, wk: weekStart(today()), xp: 0 },
  st: {
    logs: 0,
    say: 0,
    photo: 0,
    scan: 0,
    zone: 0,
    prot: 0,
    water: 0,
    closed: 0,
    weigh: 0,
    quests: 0,
    work: 0,
    boss: 0,
    sess: 0,
    prs: 0,
    rehab: 0,
    mob: 0,
    ready: 0,
  },
  hist: {},
  wts: [],
  rec: [],
  created: today(),
  goalKg: 0,
  startKg: 0,
  startD: '',
  ms: {},
  boss: null,
  coach: null,
  xlog: [],
  ad: null,
  prog: null,
  tasks: [
    { id: 'ready', auto: 'ready' },
    { id: 'move', auto: 'move' },
    { id: 'mob', auto: 'mob' },
    { id: 'protein', auto: 'protein' },
  ],
  mode: 'me',
  asgV: 0,
  coachName: '',
  bed: '23:00',
});
/**
 * An empty day.
 * @param {string} date YYYY-MM-DD
 * @returns {Day}
 */
const newDay = date => ({ date, e: [], w: 0, x: [], q: {}, chest: 0, done: 0, zone: 0, xp: 0, lx: 0, wx: 0, cf: [] });
const xmin = d => d.x.reduce((s, x) => s + (x.min || 0), 0);
function fixProfile(p) {
  const d = defaultProfile();
  for (const k in d) if (p[k] === undefined) p[k] = d[k];
  p.t = { ...d.t, ...p.t };
  p.st = { ...d.st, ...p.st };
  p.lg = { ...d.lg, ...p.lg };
  return p;
}
async function loadDay(date) {
  if (S.days[date]) return S.days[date];
  let d = null;
  try {
    d = await Store.get('days', date);
  } catch (e) {
    toast('Could not load that day. Check your connection.');
    throw e;
  }
  d = d ? { ...newDay(date), ...d } : newDay(date);
  S.days[date] = d;
  return d;
}
const day = () => S.days[S.date] || newDay(S.date);
function totals(d) {
  const t = { k: 0, p: 0, c: 0, f: 0, fi: 0, su: 0, sf: 0, na: 0, n: d.e.length, ex: 0 };
  for (const e of d.e) {
    t.k += e.k || 0;
    t.p += e.p || 0;
    t.c += e.c || 0;
    t.f += e.f || 0;
    t.fi += e.fi || 0;
    t.su += e.su || 0;
    t.sf += e.sf || 0;
    t.na += e.na || 0;
  }
  for (const x of d.x) t.ex += x.k || 0;
  return t;
}
const budget = d => P.t.k + (P.exAdd ? totals(d).ex : 0);
function zone(d) {
  const b = budget(d);
  const [lo, hi] = P.goal === 'gain' ? [0.95, 1.1] : P.goal === 'keep' ? [0.92, 1.08] : [0.9, 1.05];
  return { lo: r0(b * lo), hi: r0(b * hi), b };
}
const inZone = d => {
  const z = zone(d),
    k = totals(d).k;
  return k >= z.lo && k <= z.hi;
};

/* ---------- targets ---------- */
function calcTargets(p) {
  const bmr = 10 * p.kg + 6.25 * p.cm - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  const tdee = bmr * p.act;
  const adj = p.goal === 'lose' ? -p.rate * 1100 : p.goal === 'gain' ? p.rate * 1100 : 0; // 7700 kcal per kg, spread over 7 days
  const floor = p.sex === 'f' ? 1200 : 1500;
  const k = Math.max(floor, Math.round((tdee + adj) / 10) * 10);
  const prot = Math.round((p.kg * (p.goal === 'lose' ? 1.8 : 1.6)) / 5) * 5;
  const fat = Math.round((k * 0.27) / 9 / 5) * 5;
  const carb = Math.max(50, Math.round((k - prot * 4 - fat * 9) / 4 / 5) * 5);
  const w = clamp(Math.round((p.kg * 35) / 250) * 250, 2000, 3500);
  return { k, p: prot, c: carb, f: fat, w, tdee: r0(tdee), floored: tdee + adj < floor };
}

/* ---------- game rules ---------- */
const LEAGUES = ['Spark', 'Kindle', 'Flame', 'Blaze', 'Forge', 'Furnace', 'Solar'];
const PROMO = 700,
  STAY = 250;
const levelOf = xp => {
  let l = 1;
  while (50 * l * (l + 1) <= xp) l++;
  return l;
};
const levelFloor = l => 50 * l * (l - 1);
const hasDay = k => {
  const h = P.hist[k];
  return !!h && (h.n > 0 || !!h.z);
};
function streak() {
  const t = today();
  let d = t,
    count = 0;
  const todayDone = !!(P.hist[t] && P.hist[t].n > 0);
  if (!hasDay(t)) d = addDays(t, -1);
  while (hasDay(d)) {
    count++;
    d = addDays(d, -1);
  }
  return { count, todayDone, atRisk: !todayDone && count > 0 };
}
function applyFreezes() {
  const t = today();
  const gap = [];
  let d = addDays(t, -1);
  while (!hasDay(d) && gap.length <= P.fr && d >= P.created) {
    gap.push(d);
    d = addDays(d, -1);
  }
  if (!gap.length || gap.length > P.fr || !hasDay(d)) return 0;
  for (const g of gap) P.hist[g] = { ...(P.hist[g] || { k: 0, p: 0, c: 0, f: 0, n: 0 }), z: 1 };
  P.fr -= gap.length;
  return gap.length;
}
function rollLeague() {
  const ws = weekStart(today());
  if (P.lg.wk === ws) return null;
  // @ts-expect-error one Date minus another is the milliseconds between them
  const weeks = Math.max(1, Math.round((pdate(ws) - pdate(P.lg.wk)) / (7 * 864e5)));
  let tier = P.lg.tier;
  const from = tier,
    xp = P.lg.xp;
  for (let i = 0; i < Math.min(weeks, 8); i++) {
    const x = i === 0 ? xp : 0;
    if (x >= PROMO) tier = Math.min(tier + 1, LEAGUES.length - 1);
    else if (x < STAY) tier = Math.max(tier - 1, 0);
  }
  P.lg = { tier, wk: ws, xp: 0 };
  return { from, to: tier, xp };
}
const mealsLogged = d => new Set(d.e.map(e => e.m)).size;
const QUESTS = {
  meals3: { t: 'Log three different meals', i: 'fork', prog: d => [Math.min(mealsLogged(d), 3), 3] },
  items5: { t: 'Log five foods', i: 'fork', prog: d => [Math.min(d.e.length, 5), 5] },
  early: {
    t: 'Log breakfast before 10:00',
    i: 'fork',
    prog: d => [
      d.e.some(e => e.m === 'b' && e.t && dkey(new Date(e.t)) === d.date && new Date(e.t).getHours() < 10) ? 1 : 0,
      1,
    ],
  },
  protein: {
    t: 'Reach your protein target',
    i: 'dumbbell',
    u: ' g',
    prog: (d, t) => [Math.min(r0(t.p), P.t.p), P.t.p],
  },
  fibre: { t: 'Eat 25 g of fibre', i: 'fork', u: ' g', prog: (d, t) => [Math.min(r0(t.fi), 25), 25] },
  water: { t: 'Hit your water target', i: 'drop', u: ' ml', prog: d => [Math.min(d.w, P.t.w), P.t.w] },
  close: { t: 'Close the day inside your calorie zone', i: 'target', prog: d => [d.done && d.zone ? 1 : 0, 1] },
  say: { t: 'Log a meal by describing it', i: 'mic', prog: d => [d.e.some(e => e.via === 'say') ? 1 : 0, 1] },
  weigh: { t: 'Log a weigh-in', i: 'scale', prog: d => [P.wts.some(w => w.d === d.date) ? 1 : 0, 1] },
  move: { t: 'Move for 30 minutes', i: 'dumbbell', u: ' min', prog: d => [Math.min(r0(xmin(d)), 30), 30] },
  train: { t: 'Finish a training session', i: 'dumbbell', prog: d => [d.x.some(x => x.tr === 'train') ? 1 : 0, 1] },
  mob: { t: 'Do a recovery routine', i: 'pulse', prog: d => [d.x.some(x => x.tr === 'mob') ? 1 : 0, 1] },
  recipe: { t: 'Log one of your saved recipes', i: 'book', prog: d => [d.e.some(e => e.src === 'R') ? 1 : 0, 1] },
};
function questsFor(date) {
  let h = 7;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const A = ['meals3', 'items5', 'early'],
    B = ['protein', 'fibre', 'water'];
  const C = ['close', 'train', 'move', 'mob', 'say', 'weigh', 'train'].concat(
    Object.keys(S.recipes).length ? ['recipe'] : [],
  );
  return [A[h % A.length], B[(h >>> 3) % B.length], C[(h >>> 7) % C.length]];
}
const ACH = [
  { id: 'first', t: 'First bite', d: 'Log your first food', g: 1, v: () => P.st.logs },
  { id: 's3', t: 'Kindling', d: '3-day streak', g: 3, v: () => P.best },
  { id: 's7', t: 'One full week', d: '7-day streak', g: 7, v: () => P.best },
  { id: 's14', t: 'Fortnight', d: '14-day streak', g: 14, v: () => P.best },
  { id: 's30', t: 'Thirty days', d: '30-day streak', g: 30, v: () => P.best },
  { id: 's100', t: 'Century', d: '100-day streak', g: 100, v: () => P.best },
  { id: 's365', t: 'Full circle', d: '365-day streak', g: 365, v: () => P.best },
  { id: 'l50', t: 'Regular', d: 'Log 50 foods', g: 50, v: () => P.st.logs },
  { id: 'l250', t: 'Devoted', d: 'Log 250 foods', g: 250, v: () => P.st.logs },
  { id: 'l1000', t: 'Archivist', d: 'Log 1,000 foods', g: 1000, v: () => P.st.logs },
  { id: 'z5', t: 'In the zone', d: 'Close 5 days in your calorie zone', g: 5, v: () => P.st.zone },
  { id: 'z25', t: 'Dialled in', d: 'Close 25 days in your zone', g: 25, v: () => P.st.zone },
  { id: 'z100', t: 'Clockwork', d: 'Close 100 days in your zone', g: 100, v: () => P.st.zone },
  { id: 'p7', t: 'Protein week', d: 'Hit protein on 7 days', g: 7, v: () => P.st.prot },
  { id: 'p30', t: 'Built', d: 'Hit protein on 30 days', g: 30, v: () => P.st.prot },
  { id: 'w7', t: 'Well watered', d: 'Hit water on 7 days', g: 7, v: () => P.st.water },
  { id: 'r1', t: 'Home cook', d: 'Save your first recipe', g: 1, v: () => Object.keys(S.recipes).length },
  { id: 'r5', t: 'Recipe book', d: 'Save 5 recipes', g: 5, v: () => Object.keys(S.recipes).length },
  { id: 'v10', t: 'Say it', d: 'Describe 10 meals', g: 10, v: () => P.st.say },
  { id: 'wt5', t: 'On the scale', d: 'Log 5 weigh-ins', g: 5, v: () => P.st.weigh },
  { id: 'q30', t: 'Quest hunter', d: 'Finish 30 quests', g: 30, v: () => P.st.quests },
  { id: 'ex10', t: 'In motion', d: 'Log 10 workouts', g: 10, v: () => P.st.work },
  { id: 'ex50', t: 'Relentless', d: 'Log 50 workouts', g: 50, v: () => P.st.work },
  { id: 'ts10', t: 'Under the bar', d: 'Finish 10 training sessions', g: 10, v: () => P.st.sess },
  { id: 'ts50', t: 'Iron habit', d: 'Finish 50 training sessions', g: 50, v: () => P.st.sess },
  { id: 'pr5', t: 'Personal best', d: 'Set 5 personal records', g: 5, v: () => P.st.prs },
  { id: 'rh14', t: 'On the mend', d: 'Complete 14 rehab sessions', g: 14, v: () => P.st.rehab },
  { id: 'rd7', t: 'Tuned in', d: 'Check in on recovery 7 times', g: 7, v: () => P.st.ready },
  { id: 'boss1', t: 'Boss slayer', d: 'Defeat a boss', g: 1, v: () => P.st.boss },
  { id: 'boss5', t: 'Giant killer', d: 'Defeat 5 bosses', g: 5, v: () => P.st.boss },
  { id: 'ms1', t: 'Milestone', d: 'Reach a weight milestone', g: 1, v: () => Object.keys(P.ms).length },
  { id: 'lv5', t: 'Level 5', d: 'Reach level 5', g: 5, v: () => levelOf(P.xp) },
  { id: 'lv10', t: 'Level 10', d: 'Reach level 10', g: 10, v: () => levelOf(P.xp) },
  { id: 'lg3', t: 'Blaze league', d: 'Reach the Blaze league', g: 3, v: () => P.lg.tier },
];

const celeQ = [];
function grant(xp, gems, d, label) {
  const before = levelOf(P.xp);
  P.xp += xp;
  P.gems += gems || 0;
  P.lg.xp += xp;
  if (d) d.xp = (d.xp || 0) + xp;
  if (xp && label !== false) toast('+' + xp + ' XP' + (label ? ' · ' + label : ''), 'xp');
  const after = levelOf(P.xp);
  if (after > before) {
    P.gems += 10 * (after - before);
    celeQ.push({
      icon: 'star',
      tone: '',
      title: 'Level ' + after,
      sub: 'You have earned ' + fmt(P.xp) + ' XP so far.',
      rewards: ['+' + 10 * (after - before) + ' gems'],
    });
  }
}
function checkQuests(d) {
  if (d.date !== today()) return;
  const t = totals(d);
  const ids = questsFor(d.date);
  for (const id of ids) {
    if (d.q[id]) continue;
    const [a, b] = QUESTS[id].prog(d, t);
    if (a >= b) {
      d.q[id] = 1;
      P.st.quests++;
      grant(20, 5, d, 'Quest complete');
    }
  }
  if (!d.chest && ids.every(id => d.q[id])) {
    d.chest = 1;
    grant(30, 15, d, false);
    celeQ.push({
      icon: 'chest',
      tone: '',
      title: 'Daily chest opened',
      sub: 'All three quests done today.',
      rewards: ['+30 XP', '+15 gems'],
      confetti: true,
    });
  }
}
function checkAch() {
  const s = streak();
  if (s.count > P.best) P.best = s.count;
  for (const a of ACH) {
    if (P.ach[a.id]) continue;
    if (a.v() >= a.g) {
      P.ach[a.id] = today();
      P.gems += 20;
      celeQ.push({ icon: 'trophy', tone: '', title: a.t, sub: a.d + '.', rewards: ['+20 gems'], confetti: true });
    }
  }
}
/* Recompute the day's summary line, run game checks, persist, redraw. */
function setHist(d) {
  const t = totals(d),
    prev = P.hist[d.date] || {};
  P.hist[d.date] = {
    k: r0(t.k),
    p: r0(t.p),
    c: r0(t.c),
    f: r0(t.f),
    n: t.n,
    w: d.w,
    ex: r0(t.ex),
    xm: r0(xmin(d)),
    ts: d.x.filter(x => x.tr === 'train').length,
    cf: (d.cf || []).reduce((s, c) => s + c.mg, 0),
    m3: ['b', 'l', 'd'].every(m => d.e.some(e => e.m === m)) ? 1 : 0,
    ...(prev.z ? { z: 1 } : {}),
    ...(prev.st != null ? { st: prev.st } : {}),
    ...(prev.ab != null ? { ab: prev.ab } : {}),
    ...(prev.bk != null ? { bk: prev.bk } : {}),
    ...(prev.rd != null ? { rd: prev.rd } : {}),
    ...(prev.sl != null ? { sl: prev.sl } : {}),
    ...(prev.hv != null ? { hv: prev.hv } : {}),
    ...(prev.rh != null ? { rh: prev.rh } : {}),
    ...(prev.sn != null ? { sn: prev.sn } : {}),
    ...(d.done ? { d: 1, zn: d.zone ? 1 : 0 } : {}),
  };
}
function commitDay(d, opts = {}) {
  setHist(d);
  if (opts.onHist) opts.onHist();
  checkTasks(d);
  checkQuests(d);
  checkBoss();
  checkAch();
  S.days[d.date] = d;
  Store.put('days', d.date, d);
  saveProfile();
  publishStatus();
  publishSquad();
  if (!opts.quiet) render();
  flushCele();
}
function saveProfile() {
  Store.put('profile', null, P);
}

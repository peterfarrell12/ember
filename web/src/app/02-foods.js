/* ---------- food database ---------- */
const DB = {
  gen: null,
  br: null,
  more: null,
  L: {},
  st: { gen: 'idle', br: 'idle', more: 'idle' },
  codes: null,
  codesMore: null,
};
const FILES = { gen: 'foods-generic.json', br: 'foods-brands.json', more: 'foods-brands-more.json' };
const norm = s =>
  ' ' +
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
const DBwait = {};
function loadDB(which) {
  if (DBwait[which]) return DBwait[which];
  DB.st[which] = 'loading';
  return (DBwait[which] = fetch(FILES[which])
    .then(r => {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    })
    .then(rows => {
      DB[which] = rows;
      DB.L[which] = which === 'gen' ? rows.map(r => norm(r[0])) : rows.map(r => norm(r[0] + ' ' + r[1]));
      DB.st[which] = 'ready';
      document.dispatchEvent(new CustomEvent('dbready', { detail: which }));
    })
    .catch(e => {
      DB.st[which] = 'error';
      delete DBwait[which];
      console.warn('food data failed', which, e);
    }));
}
const SRC = {
  F: ['USDA', 'v', 'USDA food survey database'],
  N: ['USDA lab', 'v', 'USDA Foundation Foods, lab analysed'],
  S: ['USDA', 'v', 'USDA Standard Reference'],
  B: ['Label', 'l', 'Product label via Open Food Facts'],
  C: ['Yours', 'm', 'A food you saved'],
  R: ['Recipe', 'm', 'One of your recipes'],
  AI: ['Estimate', 'e', 'Estimated by Claude, not from a database'],
  AK: ['Recalled', 'e', "The maker's figures as Claude remembers them. Not in the product database, so check the pack"],
  LB: ['Label', 'l', 'Read from the packaging or ticket in your photo'],
  DR: ['Standard', 'l', 'Worked out from standard values for milk and sugar'],
  Q: ['Quick add', '', 'Entered by hand'],
};
const srcBadge = s => {
  const x = SRC[s] || SRC.Q;
  return `<span class="src ${x[1]}">${x[0]}</span>`;
};
function genFood(i) {
  const r = DB.gen[i];
  return {
    id: 'g' + i,
    n: r[0],
    b: '',
    k: r[1],
    p: r[2],
    c: r[3],
    f: r[4],
    fi: r[5],
    su: r[6],
    sf: r[7],
    na: r[8],
    ports: r[9],
    src: r[10],
  };
}
function brFood(set, i) {
  const r = DB[set][i];
  const ports = [];
  if (r[10]) ports.push(['1 serving', r[10]]);
  if (r[11] && r[11] !== r[10] && r[11] <= 1000) ports.push(['1 pack', r[11]]);
  return {
    id: (set === 'br' ? 'b' : 'm') + i,
    n: r[0],
    b: r[1],
    k: r[2],
    p: r[3],
    c: r[4],
    f: r[5],
    fi: r[6],
    su: r[7] < 0 ? null : r[7],
    sf: r[8] < 0 ? null : r[8],
    na: r[9] < 0 ? null : r0(r[9] * 400),
    ports,
    src: 'B',
    code: r[12],
  };
}
function customFood(c) {
  return {
    id: 'c' + c.id,
    n: c.n,
    b: c.b || '',
    k: c.k,
    p: c.p,
    c: c.c,
    f: c.f,
    fi: c.fi || 0,
    su: c.su ?? null,
    sf: c.sf ?? null,
    na: c.na ?? null,
    ports: c.ports || [],
    src: 'C',
    code: c.code || '',
    nog: !!c.nog,
    ...(c.liq != null ? { liq: !!c.liq } : {}),
  };
}
function recipeTotals(r) {
  const t = { g: 0, k: 0, p: 0, c: 0, f: 0, fi: 0, su: 0, sf: 0, na: 0 };
  for (const it of r.items) for (const k in t) t[k] += it[k] || 0;
  return t;
}
function recipeFood(r) {
  const t = recipeTotals(r);
  const g = t.g || 100 * (r.sv || 1);
  const m = 100 / g;
  return {
    id: 'r' + r.id,
    n: r.n,
    b: '',
    k: r0(t.k * m),
    p: r1(t.p * m),
    c: r1(t.c * m),
    f: r1(t.f * m),
    fi: r1(t.fi * m),
    su: r1(t.su * m),
    sf: r1(t.sf * m),
    na: r0(t.na * m),
    ports: [['1 serving', r1(g / (r.sv || 1))]],
    src: 'R',
    per: { k: t.k / (r.sv || 1) },
  };
}
/* Irish and UK words mapped to the terms the USDA data uses, so either finds the food. */
const SYN = {
  courgette: ['zucchini'],
  aubergine: ['eggplant'],
  crisps: ['potato chips', 'chips'],
  porridge: ['oatmeal', 'oats'],
  rocket: ['arugula'],
  coriander: ['cilantro'],
  mince: ['ground', 'minced'],
  minced: ['ground', 'mince'],
  rasher: ['bacon'],
  prawn: ['shrimp'],
  beetroot: ['beets', 'beet'],
  swede: ['rutabaga'],
  yoghurt: ['yogurt'],
  yogurt: ['yoghurt'],
  wholemeal: ['whole wheat', 'whole grain', 'wholegrain'],
  skimmed: ['skim', 'nonfat', 'fat free'],
  biscuit: ['cookie'],
  sweets: ['candy'],
  chips: ['french fries', 'fries'],
  scallion: ['spring onion', 'green onion'],
  sultana: ['raisin'],
  cornflour: ['cornstarch'],
  fizzy: ['soda', 'soft drink'],
  mangetout: ['snow pea'],
  chickpea: ['garbanzo'],
  spud: ['potato'],
  tinned: ['canned'],
  tin: ['canned'],
  gammon: ['ham'],
  chilli: ['chili'],
  pitta: ['pita'],
  soya: ['soy'],
  mash: ['mashed'],
  banger: ['sausage'],
  takeaway: ['restaurant'],
  lolly: ['popsicle', 'ice pop'],
  jam: ['jam', 'preserves'],
  squash: ['squash', 'cordial'],
  pudding: ['pudding', 'dessert'],
  flapjack: ['granola bar', 'oat bar'],
  wrap: ['tortilla', 'wrap'],
  mayo: ['mayonnaise'],
  veg: ['vegetable'],
  spag: ['spaghetti'],
  bolognese: ['meat sauce', 'bolognese'],
  toast: ['toasted', 'toast'],
};
const STOP = new Set(['of', 'a', 'an', 'the', 'with', 'and', 'in', 'some', 'my']);
function tokens(q) {
  return norm(q)
    .trim()
    .split(' ')
    .filter(t => t && !STOP.has(t))
    .map(t => {
      let base = t;
      if (t.length > 3 && /[^s]s$/.test(t))
        base = t.endsWith('oes')
          ? t.slice(0, -2)
          : t.endsWith('ies') && t.length >= 7 && !t.endsWith('kies')
            ? t.slice(0, -3)
            : t.slice(0, -1);
      const alts = new Set([base]);
      (SYN[t] || SYN[base] || []).forEach(a => alts.add(a));
      return [...alts].map(a => ' ' + a);
    });
}
function scoreName(hay, toks, raw) {
  let s = 100 - hay.length * 0.45;
  for (let i = 0; i < toks.length; i++) {
    let hit = -1,
      exact = false;
    for (const a of toks[i]) {
      const at = hay.indexOf(a);
      if (at >= 0) {
        hit = hit < 0 ? at : Math.min(hit, at);
        const end = hay[at + a.length];
        if (end === undefined || end === ' ' || end === 's') exact = true;
      }
    }
    if (hit < 0) return -1;
    if (hit === 0) s += i === 0 ? 34 : 14;
    if (exact) s += 12;
    s -= hit * 0.15;
  }
  if (hay.trim() === raw) s += 50;
  return s;
}
const GOOD = [
  [' cooked', 9],
  [' nfs', 9],
  [' raw', 6],
  [' plain', 5],
  [' whole', 3],
  [' boiled', 3],
  [' grilled', 3],
];
const POOR = [
  [' baby', 45],
  [' dried', 8],
  [' canned', 7],
  [' dehydrated', 10],
  [' candied', 10],
  [' powder', 8],
  [' frozen', 5],
  [' alaska native', 30],
  [' glutinous', 12],
  [' egg white', 10],
  [' restaurant', 6],
  [' fast food', 6],
];
function searchSet(which, toks, raw, limit) {
  const L = DB.L[which];
  if (!L) return [];
  const out = [];
  const rows = DB[which];
  const first = toks[0];
  for (let i = 0; i < L.length; i++) {
    const hay = L[i];
    let ok = false;
    for (const a of first)
      if (hay.indexOf(a) >= 0) {
        ok = true;
        break;
      }
    if (!ok) continue;
    let s = scoreName(hay, toks, raw);
    if (s < 0) continue;
    if (which === 'gen') {
      const src = rows[i][10];
      s += src === 'F' ? 30 : src === 'N' ? 26 : 4;
      const nm = rows[i][0].toLowerCase(),
        c1 = nm.indexOf(',');
      if (c1 > 0) {
        const head = ' ' + nm.slice(0, c1),
          second =
            ' ' +
            nm
              .slice(c1 + 1)
              .trim()
              .split(/[ ,]/)[0];
        for (const a of first) {
          if (head === a || head === a + 's') {
            s += 24;
            break;
          }
          if (second === a || second === a + 's') {
            s += 18;
            break;
          }
        }
      }
      for (const [w, v] of GOOD) if (hay.indexOf(w) >= 0) s += v;
      for (const [w, v] of POOR) if (hay.indexOf(w) >= 0 && raw.indexOf(w.trim()) < 0) s -= v;
    } else s += Math.min(34, Math.log2(1 + rows[i][13]) * 5) + (which === 'br' ? 6 : 0) - (rows[i][1] ? 0 : 6);
    out.push([s, i]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, limit).map(([s, i]) => ({ s, food: which === 'gen' ? genFood(i) : brFood(which, i) }));
}
/* Everyday words mapped to the entry most people mean, shown first in results. */
const STAPLE = {
  'rasher fried': 'bacon cooked',
  'rashers fried': 'bacon cooked',
  'rasher grilled': 'bacon cooked',
  'rashers grilled': 'bacon cooked',
  'back bacon grilled': 'bacon cooked',
  'back bacon fried': 'bacon cooked',
  'back bacon': 'bacon cooked',
  'streaky bacon': 'bacon cooked',
  'bacon rashers grilled': 'bacon cooked',
  'bacon rashers fried': 'bacon cooked',
  sausage: 'pork sausage',
  'sausage, fried': 'pork sausage',
  'sausage fried': 'pork sausage',
  'sausage, grilled': 'pork sausage',
  'sausage grilled': 'pork sausage',
  'sausage, cooked': 'pork sausage',
  'sausage cooked': 'pork sausage',
  sausages: 'pork sausage',
  'sausages, fried': 'pork sausage',
  'sausages fried': 'pork sausage',
  'sausages, grilled': 'pork sausage',
  'sausages grilled': 'pork sausage',
  'sausages, cooked': 'pork sausage',
  'sausages cooked': 'pork sausage',
  'pork sausage': 'pork sausage',
  'pork sausage, fried': 'pork sausage',
  'pork sausage fried': 'pork sausage',
  'pork sausage, grilled': 'pork sausage',
  'pork sausage grilled': 'pork sausage',
  'pork sausage, cooked': 'pork sausage',
  'pork sausage cooked': 'pork sausage',
  'pork sausages': 'pork sausage',
  'pork sausages, fried': 'pork sausage',
  'pork sausages fried': 'pork sausage',
  'pork sausages, grilled': 'pork sausage',
  'pork sausages grilled': 'pork sausage',
  'pork sausages, cooked': 'pork sausage',
  'pork sausages cooked': 'pork sausage',
  'fried sausage': 'pork sausage',
  'fried sausage, fried': 'pork sausage',
  'fried sausage fried': 'pork sausage',
  'fried sausage, grilled': 'pork sausage',
  'fried sausage grilled': 'pork sausage',
  'fried sausage, cooked': 'pork sausage',
  'fried sausage cooked': 'pork sausage',
  'fried sausages': 'pork sausage',
  'fried sausages, fried': 'pork sausage',
  'fried sausages fried': 'pork sausage',
  'fried sausages, grilled': 'pork sausage',
  'fried sausages grilled': 'pork sausage',
  'fried sausages, cooked': 'pork sausage',
  'fried sausages cooked': 'pork sausage',
  'grilled sausage': 'pork sausage',
  'grilled sausage, fried': 'pork sausage',
  'grilled sausage fried': 'pork sausage',
  'grilled sausage, grilled': 'pork sausage',
  'grilled sausage grilled': 'pork sausage',
  'grilled sausage, cooked': 'pork sausage',
  'grilled sausage cooked': 'pork sausage',
  'grilled sausages': 'pork sausage',
  'grilled sausages, fried': 'pork sausage',
  'grilled sausages fried': 'pork sausage',
  'grilled sausages, grilled': 'pork sausage',
  'grilled sausages grilled': 'pork sausage',
  'grilled sausages, cooked': 'pork sausage',
  'grilled sausages cooked': 'pork sausage',
  'black pudding': 'blood sausage',
  'black pudding, fried': 'blood sausage',
  'black pudding fried': 'blood sausage',
  'black pudding, grilled': 'blood sausage',
  'black pudding grilled': 'blood sausage',
  rasher: 'bacon cooked',
  rashers: 'bacon cooked',
  'bacon rasher': 'bacon cooked',
  'bacon rashers': 'bacon cooked',
  'rasher, fried': 'bacon cooked',
  'rashers, fried': 'bacon cooked',
  'rasher, grilled': 'bacon cooked',
  'rashers, grilled': 'bacon cooked',
  'back bacon, grilled': 'bacon cooked',
  'back bacon, fried': 'bacon cooked',
  'bacon, fried': 'bacon cooked',
  'bacon, grilled': 'bacon cooked',
  'bacon fried': 'bacon cooked',
  'bacon grilled': 'bacon cooked',
  'scrambled eggs': 'egg omelet scrambled egg',
  'scrambled egg': 'egg omelet scrambled egg',
  'fried egg': 'egg whole fried',
  'fried eggs': 'egg whole fried',
  'boiled egg': 'egg whole boiled',
  'boiled eggs': 'egg whole boiled',
  'poached egg': 'egg whole boiled poached',
  'poached eggs': 'egg whole boiled poached',
  'chicken breast': 'chicken breast grilled without sauce skin not eaten',
  'chicken thigh': 'chicken thigh grilled skin not eaten',
  tomato: 'tomatoes raw',
  tomatoes: 'tomatoes raw',
  rice: 'rice white cooked',
  pasta: 'pasta cooked',
  spaghetti: 'spaghetti cooked',
  noodles: 'noodles cooked',
  egg: 'egg whole boiled',
  eggs: 'egg whole boiled',
  chicken: 'chicken breast grilled',
  steak: 'beef steak',
  chips: 'french fries',
  fries: 'french fries',
  crisps: 'potato chips plain',
  mince: 'ground beef cooked',
  rasher: 'bacon',
  rashers: 'bacon',
  porridge: 'oatmeal regular',
  coffee: 'coffee brewed',
  tea: 'tea hot leaf black',
  salmon: 'fish salmon',
  tuna: 'fish tuna',
  cod: 'fish cod',
  bread: 'bread white',
  toast: 'bread white toasted',
  spuds: 'potato boiled',
  potatoes: 'potato boiled',
  potato: 'potato boiled',
  yoghurt: 'yogurt plain',
  yogurt: 'yogurt plain',
  cheese: 'cheese cheddar',
  ham: 'ham sliced',
  turkey: 'turkey breast',
  sausage: 'pork sausage',
  sausages: 'pork sausage',
  beans: 'baked beans',
  milk: 'milk whole',
  oats: 'oats raw',
  beef: 'beef roast',
  pork: 'pork chop',
  lamb: 'lamb chop',
  wine: 'wine table red',
  beer: 'beer',
  pint: 'beer',
  cereal: 'cereal corn flakes',
  sugar: 'sugar white granulated',
  oil: 'olive oil',
  juice: 'orange juice 100%',
  water: 'water tap',
};
const PHRASE = [
  [/semi[- ]skimmed/g, 'reduced fat'],
  [/full[- ]fat milk/g, 'whole milk'],
  [/spring onions?/g, 'green onion'],
  [/minced? beef/g, 'ground beef'],
  [/(streaky|back) bacon/g, 'bacon'],
  [/(natural|plain) yog(h)?urt/g, 'yogurt plain'],
  [/greek yog(h)?urt/g, 'yogurt greek'],
  [/(brown|wholemeal) bread/g, 'bread whole wheat'],
  [/white bread/g, 'bread white'],
  [/sweetcorn/g, 'corn sweet'],
  [/(mash|mashed) potato(es)?/g, 'potato mashed'],
  [/roast(ed)? potato(es)?/g, 'potato roasted'],
  [/chicken fillets?/g, 'chicken breast'],
  [/porridge oats/g, 'oats'],
  [/fizzy drink/g, 'soft drink'],
  [/flat white/g, 'coffee latte'],
  [/cappuccino/g, 'coffee cappuccino'],
  [/americano/g, 'coffee brewed'],
];
function searchMine(toks, raw) {
  const out = [];
  for (const c of Object.values(S.foods)) {
    const s = scoreName(norm(c.n + ' ' + (c.b || '')), toks, raw);
    if (s >= 0) out.push({ s: s + 80, food: customFood(c) });
  }
  for (const r of Object.values(S.recipes)) {
    const s = scoreName(norm(r.n), toks, raw);
    if (s >= 0) out.push({ s: s + 80, food: recipeFood(r) });
  }
  return out.sort((a, b) => b.s - a.s);
}
function searchAll(q, n = 14) {
  const toks = tokens(q);
  if (!toks.length) return { mine: [], gen: [], br: [] };
  const raw = norm(q).trim();
  const br = searchSet('br', toks, raw, n)
    .concat(searchSet('more', toks, raw, n))
    .sort((a, b) => b.s - a.s)
    .slice(0, n);
  let gq = raw;
  for (const [re, to] of PHRASE) gq = gq.replace(re, to);
  if (/\btoast\b/.test(gq) && !/french|melba/.test(gq)) gq = gq.replace(/\btoast\b/, 'bread toasted');
  let gen = searchSet('gen', gq === raw ? toks : tokens(gq), gq, n);
  if (STAPLE[raw]) {
    const top = searchSet('gen', tokens(STAPLE[raw]), STAPLE[raw], 3).map(x => ({ ...x, s: x.s + 200 }));
    const seen = new Set(top.map(x => x.food.id));
    gen = top.concat(gen.filter(x => !seen.has(x.food.id))).slice(0, n);
  }
  return { mine: searchMine(toks, raw).slice(0, 6), gen, br };
}
const stripCode = c =>
  String(c || '')
    .replace(/\D/g, '')
    .replace(/^0+/, '');
async function findBarcode(code) {
  const key = stripCode(code);
  if (!key) return null;
  for (const c of Object.values(S.foods)) if (c.code && stripCode(c.code) === key) return customFood(c);
  await loadDB('br');
  if (DB.br && !DB.codes) {
    DB.codes = new Map();
    DB.br.forEach((r, i) => DB.codes.set(stripCode(r[12]), i));
  }
  if (DB.codes && DB.codes.has(key)) return brFood('br', DB.codes.get(key));
  await loadDB('more');
  if (DB.more && !DB.codesMore) {
    DB.codesMore = new Map();
    DB.more.forEach((r, i) => DB.codesMore.set(stripCode(r[12]), i));
  }
  if (DB.codesMore && DB.codesMore.has(key)) return brFood('more', DB.codesMore.get(key));
  return null;
}

/* ---------- amounts ---------- */
/* Scale a per-100 g food to an amount; the result is what the diary stores. */
function portion(food, grams) {
  const m = grams / 100;
  return {
    n: food.n,
    b: food.b || '',
    g: r1(grams),
    k: r0(food.k * m),
    p: r1(food.p * m),
    c: r1(food.c * m),
    f: r1(food.f * m),
    fi: r1((food.fi || 0) * m),
    su: r1((food.su || 0) * m),
    sf: r1((food.sf || 0) * m),
    na: r0((food.na || 0) * m),
    src: food.src,
    ...(food.id && /^[cr]/.test(food.id) ? { fid: food.id } : {}),
    ...(food.ports && food.ports.length ? { ports: food.ports.slice(0, 6) } : {}),
    ...(food.nog ? { nog: true } : {}),
    ...(food.liq != null ? { liq: !!food.liq } : {}),
  };
}
function remember(food, qty, unit, meal, sv) {
  const key = (food.n + '|' + (food.b || '')).toLowerCase();
  const old = P.rec.find(r => (r.n + '|' + (r.b || '')).toLowerCase() === key),
    ms = { ...((old && old.ms) || {}) };
  if (meal) ms[meal] = (ms[meal] || 0) + 1;
  const snap = {
    n: food.n,
    b: food.b || '',
    k: food.k,
    p: food.p,
    c: food.c,
    f: food.f,
    fi: food.fi || 0,
    su: food.su ?? null,
    sf: food.sf ?? null,
    na: food.na ?? null,
    ports: (food.ports || []).slice(0, 6),
    src: food.src,
    lq: qty,
    lu: unit,
    ls: sv || 1,
    ct: ((old && old.ct) || 0) + (meal ? 1 : 0),
    ms,
    ...(food.code ? { code: food.code } : {}),
    ...(food.id && /^[cr]/.test(food.id) ? { id: food.id } : {}),
    ...(food.nog ? { nog: true } : {}),
  };
  P.rec = [snap].concat(P.rec.filter(r => (r.n + '|' + (r.b || '')).toLowerCase() !== key)).slice(0, 60);
}
function lastUse(food) {
  const key = (food.n + '|' + (food.b || '')).toLowerCase();
  return P.rec.find(r => (r.n + '|' + (r.b || '')).toLowerCase() === key);
}

/* ---------- Claude (sample) + dictation ---------- */
const AI = { sample: null, images: false, dict: null, ready: false };
async function initAI() {
  try {
    if (!(window.claude && window.claude.use)) return;
    const [s, d, m] = await Promise.all([
      window.claude.use('sample'),
      window.claude.use('dictation'),
      window.claude.use('mcp'),
    ]);
    AI.sample = s || null;
    AI.dict = d || null;
    AI.mcp = m || null;
    if (s) {
      const lim = await s.limits().catch(() => null);
      AI.images = !!(lim && lim.images);
    }
  } catch (e) {
  } finally {
    AI.ready = true;
    document.dispatchEvent(new CustomEvent('aiready'));
  }
}
const AI_MSG = {
  rate_limited: 'Claude is busy or you have hit a usage limit. Try again in a bit.',
  session_expired: 'Sign in to Claude again, then retry.',
  refused: 'Claude could not work with that. Try rewording it.',
  image_rejected: 'That image could not be read. Try another photo.',
  invalid_json: 'The answer came back garbled. Try again.',
  upstream_error: 'Connection hiccup. Try again.',
};
function aiError(e) {
  const code = e && e.code;
  if (
    ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)
  ) {
    AI.sample = null;
    return 'Claude is not available in this view, so smart logging is off.';
  }
  if (code === 'images_unavailable') {
    AI.images = false;
    return 'Photos cannot be sent to Claude in this view.';
  }
  return AI_MSG[code] || 'Something went wrong. Try again.';
}
const ITEM_FORMAT = `Reply with only a JSON array, no other text. One object per distinct food or drink:
{"name": short plain food name usable as a database search phrase, including cooking state where it matters (e.g. "white rice, cooked", "chicken breast, grilled"),
 "brand": brand name exactly as printed on the pack, or "" for unbranded food,
 "packaged": true if this is a branded or packaged product, else false,
 "known": true only if kcal100, p100, c100 and f100 are the maker's published figures for this exact product and you are sure of them, false if they are your estimate,
 "grams": your best estimate of the total grams (or ml) eaten of this item, as a number,
 "amount": the amount as the person would say it (e.g. "2 eggs", "1 bowl"),
 "kcal100": kcal per 100 g, "p100": protein g per 100 g, "c100": carbohydrate g per 100 g, "f100": fat g per 100 g,
 "meal": "b", "l", "d" or "s" if the text says breakfast, lunch, dinner or snack, else ""}
For a branded or packaged product, "name" is the product name with every variant word printed on it (flavour, zero, 0.0, light, protein, the cut or the range) and without the brand, the pack size or slogans, e.g. brand "Guinness", name "Draught 0.0 alcohol free stout"; "grams" is the amount eaten, using the printed net quantity (ml counts as grams) when a whole pack, can or bottle was had.
Use typical Irish and UK portion sizes unless amounts are given. Split a dish into parts only when the parts are named. Count cooking fats and sauces that are mentioned.`;
/* Phone photos are far bigger than Claude needs and the big ones get refused, so every image is resized first. */
async function prepImages(files) {
  return Promise.all(
    files.map(async f => {
      try {
        const r = await shrink(f, 1600, 0.85);
        return new File([r.blob], 'photo.jpg', { type: 'image/jpeg' });
      } catch (e) {
        return f;
      }
    }),
  );
}
const asItems = raw =>
  Array.isArray(raw)
    ? raw
    : raw && Array.isArray(raw.items)
      ? raw.items
      : raw && typeof raw === 'object' && raw.name
        ? [raw]
        : [];
async function aiParseText(text) {
  return AI.sample.json(
    `You turn a spoken or typed food diary note into structured items for a calorie tracker.\n${ITEM_FORMAT}\n\nNote: """${text.slice(0, 2000)}"""`,
    { modelTier: 'default', cache: false },
  );
}
async function aiParsePhoto(files, note) {
  const imgs = await prepImages(files);
  return asItems(
    await AI.sample.json(
      `${files.length > 1 ? 'These photos show one meal or product from different angles' : 'This photo shows a meal or a food product'} someone is logging in a calorie tracker. Identify each distinct food and how much of it was eaten, judging scale from plates, cutlery, hands and packaging.
Read every word on any packaging before anything else: the brand and the exact product and variant matter more than how the food looks, because the tracker looks the product up in a database of 115,000 labelled products.
If a photo shows packaging, a shelf ticket, a menu board or a nutrition panel instead of, or as well as, the food itself, trust the print over your own estimate: use the product name and brand exactly as printed, set "label": true on that item, and give "kcal", "protein", "carbs", "fat" for the whole portion eaten as printed, per pack, per sandwich or per item (null for a figure that is not printed). Still give "grams": the printed weight if shown, otherwise your estimate. A ticket that shows only calories is enough.${note ? ' The person adds: "' + note.slice(0, 400) + '". Treat that as fact about amounts and ingredients.' : ''}
${ITEM_FORMAT}`,
      { images: imgs, modelTier: 'default', cache: false },
    ),
  );
}
async function aiReadLabel(file) {
  const [img] = await prepImages([file]);
  return AI.sample.json(
    `This photo shows a nutrition label, a shelf ticket or packaging with nutrition figures, usually in EU format. Read it exactly; do not estimate values that are not printed. Reply with only JSON:
{"name": product name if visible else "", "brand": brand if visible else "", "basis": "100" if the figures you give are per 100 g or 100 ml, "serving" if they are per serving, pack, sandwich or item, "kcal": number, "p": protein g, "c": carbohydrate g, "f": fat g, "sf": saturates g or null, "su": sugars g or null, "fi": fibre g or null, "salt": salt g or null, "serving_g": the serving or pack size in g or ml if printed else null, "readable": true or false}
Prefer per 100 when the label prints both. If it prints figures only per serving, pack or item, which is common on sandwiches and menu tickets, give those with basis "serving". A figure that is not printed is null; a label that shows only calories is still readable. If energy is only in kJ, divide by 4.184.`,
    { images: [img], modelTier: 'default', cache: false },
  );
}
async function aiReadBarcode(file) {
  const r = await AI.sample(
    'Read the number printed under the barcode in this photo. Reply with only the digits, no spaces. If no barcode number is readable reply NONE.',
    { images: await prepImages([file]), modelTier: 'quick', cache: false },
  );
  const m = (r.text || '').replace(/\s/g, '').match(/\d{8,14}/);
  return m ? m[0] : null;
}
/* ---------- branded products: find the exact product by brand first, then by the words on the pack ---------- */
const B_GENERIC = new Set([
  'the',
  'and',
  'co',
  'company',
  'foods',
  'food',
  'farm',
  'farms',
  'ltd',
  'brand',
  'ireland',
  'irish',
]);
const P_DROP = new Set([
  'can',
  'bottle',
  'pint',
  'glass',
  'pack',
  'packet',
  'box',
  'tub',
  'carton',
  'pouch',
  'of',
  'a',
  'an',
  'the',
  'with',
  'and',
  'in',
  'flavour',
  'flavor',
  'flavoured',
  'flavored',
  'new',
  'product',
  'size',
  'serving',
  'less',
  'than',
  'alc',
  'vol',
  'abv',
]);
const VARIANT = new Set([
  'zero',
  'light',
  'lite',
  'diet',
  'max',
  'protein',
  'decaf',
  'skimmed',
  'skim',
  'low',
  'reduced',
  'free',
  'mini',
  'double',
  'extra',
  'thin',
  'thick',
  'wholemeal',
  'white',
  'dark',
  'milk',
  'salted',
  'unsalted',
  'smoked',
  'unsmoked',
]);
function canon(str) {
  let t = norm(str) + ' ';
  t = t
    .replace(/ \d+ ?(?:ml|cl|l|g|kg|oz|pk|pack|x)(?= )/g, '')
    .replace(/ (?:0 0|0)%?(?= )/g, ' zero')
    .replace(
      / (?:alcohol free|non alcoholic|no alcohol|zero alcohol|alkoholfrei|sans alcool|zero sugar|no sugar|sugar free|sugarfree)(?= )/g,
      ' zero',
    );
  const out = [];
  for (let w of t.trim().split(' ')) {
    if (!w || P_DROP.has(w) || /^\d+%?$/.test(w)) continue;
    if (w.length > 3 && /[^s]s$/.test(w)) w = w.slice(0, -1);
    if (!out.includes(w)) out.push(w);
  }
  return out;
}
const CRIT = new Set(['zero', 'light', 'lite', 'diet', 'decaf', 'skimmed', 'skim', 'low', 'reduced', 'free', 'max']);
const sameWord = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
function brandFind(brand, name, est) {
  const bw = norm(brand)
    .trim()
    .split(' ')
    .filter(w => w.length >= 3 && !B_GENERIC.has(w));
  if (!bw.length) return null;
  const bset = canon(brand),
    q = canon(name).filter(w => !bset.some(b => sameWord(b, w)));
  const cands = [];
  for (const set of ['br', 'more']) {
    const L = DB.L[set],
      rows = DB[set];
    if (!L) continue;
    for (let i = 0; i < L.length; i++) {
      const hay = L[i] + ' ';
      if (hay.indexOf(' ' + bw[0]) < 0) continue;
      const r = rows[i];
      if (!(r[2] >= 0)) continue;
      cands.push({
        set,
        i,
        r,
        words: canon(r[0] + ' ' + r[1]).filter(w => !bset.some(b => sameWord(b, w))),
        own: norm(r[1]).indexOf(' ' + bw[0]) >= 0,
      });
    }
  }
  if (!cands.length) return null;
  const N = cands.length,
    wt = q.map(t => {
      const df = cands.reduce((n, c) => n + (c.words.some(w => sameWord(w, t)) ? 1 : 0), 0);
      return df ? clamp(0.5 + Math.log(1 + N / df), 0.6, 3) * (VARIANT.has(t) ? 1.5 : 1) : 0.35;
    });
  const total = wt.reduce((a, b) => a + b, 0),
    lost = q.reduce((a, t, k) => a + (wt[k] === 0.35 ? 0.35 : 0), 0);
  for (const c of cands) {
    let got = 0;
    const used = new Set();
    q.forEach((t, k) => {
      const at = c.words.findIndex(w => sameWord(w, t));
      if (at >= 0) {
        got += wt[k];
        used.add(at);
      }
    });
    c.cov = total ? got / total : 1;
    let vx = 0,
      ox = 0,
      crit = 0;
    c.words.forEach((w, k) => {
      if (used.has(k)) return;
      if (CRIT.has(w)) crit++;
      else VARIANT.has(w) ? vx++ : ox++;
    });
    c.off = est && est.k > 0 ? Math.min(1, Math.abs(c.r[2] - est.k) / Math.max(est.k, 40)) : 0;
    c.ex = vx + ox + crit;
    c.crit = crit;
    c.s =
      c.cov -
      0.7 * crit -
      0.3 * vx -
      Math.min(0.3, 0.06 * ox) +
      Math.min(0.12, Math.log2(1 + (c.r[13] || 0)) * 0.02) +
      (c.own ? 0.1 : 0) -
      0.3 * c.off;
  }
  cands.sort((a, b) => b.s - a.s);
  const top = cands[0],
    nx = cands[1],
    same = nx && Math.abs(nx.r[2] - top.r[2]) <= Math.max(3, 0.08 * top.r[2]);
  const exact = c => c && c.cov >= 0.99 && !c.ex;
  /* sure only when the words on the pack are all accounted for and nothing else in the brand is as good a fit */
  const conf =
    top.cov >= 0.8 &&
    top.s >= 0.6 &&
    !top.crit &&
    top.off <= 0.6 &&
    (exact(top) ? !exact(nx) || same : (!lost || !top.ex) && top.ex <= 2 && (!nx || top.s - nx.s >= 0.06 || same));
  return {
    food: brFood(top.set, top.i),
    cov: top.cov,
    conf,
    alts: cands
      .filter(c => c.s >= top.s - 0.5)
      .slice(0, 6)
      .map(c => brFood(c.set, c.i)),
  };
}
/* Turn a parsed item into a diary-ready candidate: the person's own foods, then the exact branded product, then a database food whose energy density agrees with the estimate. */
function matchItem(it) {
  const grams = clamp(num(it.grams, 100), 1, 5000);
  const est = { k: num(it.kcal100), p: num(it.p100), c: num(it.c100), f: num(it.f100) };
  const q = ((it.brand ? it.brand + ' ' : '') + (it.name || '')).trim();
  let pick = null,
    alts = null,
    unsure = false,
    generic = null;
  if (it.label && num(it.kcal) > 0) {
    const m = 100 / grams,
      v = (x, e) => (x == null || x === '' ? e : num(x) * m);
    pick = {
      id: '',
      n: String(it.name || 'Food').slice(0, 80),
      b: String(it.brand || '').slice(0, 40),
      k: r1(num(it.kcal) * m),
      p: r1(v(it.protein, est.p)),
      c: r1(v(it.carbs, est.c)),
      f: r1(v(it.fat, est.f)),
      fi: 0,
      su: null,
      sf: null,
      na: null,
      ports: [['1 pack', grams]],
      src: 'LB',
    };
  }
  if (!pick && q) {
    const r = searchAll(q, 24);
    if (it.brand && r.mine.length) pick = r.mine[0].food;
    const bf = !pick && it.brand ? brandFind(it.brand, it.name || '', est) : null;
    const strict = cands => {
      if (!cands.length) return null;
      const top = Math.max(...cands.map(c => c.s)),
        near = cands.filter(c => c.s >= top - 28);
      if (!(est.k > 0)) return near.sort((a, b) => b.s - a.s)[0].food;
      const off = c => (/^[cr]/.test(c.food.id) ? 0 : Math.min(1, Math.abs(c.food.k - est.k) / Math.max(est.k, 40)));
      near.sort((a, b) => b.s - 80 * off(b) - (a.s - 80 * off(a)));
      return off(near[0]) <= 0.35 ? near[0].food : null;
    };
    if (bf) {
      /* the brand is in the product list: take the sure match, otherwise keep the closest and let Claude choose between the nearest few */
      if (bf.conf) pick = bf.food;
      else {
        alts = bf.alts;
        unsure = true;
        if (bf.cov >= 0.6) pick = bf.food;
      }
      if (!pick && !it.known) {
        const g = searchAll(it.name || '', 12);
        generic = strict(g.mine.concat(g.gen));
      }
    } else if (!pick) {
      let cands = r.mine.concat(it.brand ? r.br.concat(r.gen) : r.gen.concat(r.br.map(x => ({ ...x, s: x.s - 25 }))));
      if (!cands.length && it.brand) {
        const r2 = searchAll(it.name, 8);
        cands = r2.mine.concat(r2.gen, r2.br);
      }
      pick = strict(cands);
    }
  }
  const fallback = generic || {
    id: '',
    n: it.name || 'Food',
    b: it.brand || '',
    k: est.k,
    p: est.p,
    c: est.c,
    f: est.f,
    fi: 0,
    su: null,
    sf: null,
    na: null,
    ports: it.packaged ? [['1 pack', grams]] : [],
    src: it.known && it.brand && est.k >= 0 ? 'AK' : 'AI',
  };
  if (!pick) pick = fallback;
  return {
    food: pick,
    g: grams,
    amount: it.amount || '',
    meal: MEALS[it.meal] ? it.meal : '',
    said:
      it.brand && /^[bm]/.test(pick.id)
        ? ((pick.b || it.brand) + ' ' + pick.n).trim()
        : it.brand
          ? it.brand
          : it.name || '',
    alts,
    unsure,
    fallback,
    seen: q,
  };
}
/* Match a whole parsed list. Branded items search the full product list, and where the page cannot be sure which entry is the product, Claude picks from the shortlist in one quick call. */
async function matchAll(raw) {
  const list = asItems(raw);
  if (!list.length) return [];
  if (list.some(it => it && it.brand)) await loadDB('more');
  const items = list.map(matchItem).filter(x => x && x.g > 0);
  const open = items.filter(x => x.unsure && x.alts && x.alts.length);
  if (open.length && AI.sample) {
    try {
      const ans = await AI.sample.json(
        `A calorie tracker is matching products to its database of labelled products. For each product below, choose the database entry that is the same product: same brand and same variant (zero or regular, light, flavour, cut). Pack size does not matter. Answer -1 when no entry is the same product; a different flavour or variant is not the same product.
${open.map((x, n) => `Product ${n + 1}: "${x.seen}"${x.fallback.k > 0 ? ', roughly ' + r0(x.fallback.k) + ' kcal per 100' : ''}\n${x.alts.map((f, k) => `  ${k}: ${f.n}${f.b ? ' (' + f.b + ')' : ''}, ${r0(f.k)} kcal per 100`).join('\n')}`).join('\n')}
Reply with only a JSON array of ${open.length} number${open.length === 1 ? '' : 's'}, one per product, in order.`,
        { modelTier: 'quick', cache: false },
      );
      const arr = Array.isArray(ans) ? ans : ans && Array.isArray(ans.picks) ? ans.picks : [];
      open.forEach((x, n) => {
        const k = Number(arr[n]);
        if (Number.isInteger(k) && x.alts[k]) {
          x.food = x.alts[k];
          x.said = ((x.food.b || '') + ' ' + x.food.n).trim();
        } else if (k === -1) x.food = x.fallback;
        x.unsure = false;
      });
    } catch (e) {
      /* keep the closest match the page found */
    }
  }
  return items;
}
/* Keyword fallback used when Claude is not available. */
const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, couple: 2 };
function localParse(text) {
  const parts = text
    .toLowerCase()
    .split(/,|;|\band\b|\+|\bwith\b|\n/)
    .map(s => s.trim())
    .filter(Boolean);
  const out = [];
  for (const part of parts) {
    const m = part.match(
      /^(\d+(?:[.,]\d+)?|a|an|one|two|three|four|five|six|half|couple)?\s*(kg|g|grams?|ml|l|cups?|tbsp|tablespoons?|tsp|teaspoons?|slices?|pieces?|bowls?|glass(?:es)?|handful)?\s*(?:of\s+)?(.+)$/,
    );
    if (!m) continue;
    const qty = m[1] ? (WORDNUM[m[1]] ?? num(m[1], 1)) : 1;
    const unit = (m[2] || '').replace(/s$/, '');
    const name = m[3].trim();
    const r = searchAll(name, 5);
    const hit = r.mine[0] || r.gen[0] || r.br[0];
    if (!hit) continue;
    const food = hit.food;
    let g;
    if (/^(g|gram|ml)$/.test(unit)) g = qty;
    else if (unit === 'kg' || unit === 'l') g = qty * 1000;
    else {
      const pt = (unit && food.ports.find(p => p[0].toLowerCase().includes(unit))) || food.ports[0];
      g = pt ? qty * pt[1] : qty * 100;
    }
    out.push({ food, g: r1(g), amount: part, meal: '', said: name });
  }
  return out;
}
/* A photo drawn onto a canvas, no larger than `max` on its long side. For reading barcodes on the device.
   (The photo code has its own `shrink`, which returns a JPEG; the two used to share a name, and this one lost.) */
async function shrinkToCanvas(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = r0(bmp.width * sc);
  cv.height = r0(bmp.height * sc);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return cv;
}
async function decodeBarcode(file) {
  let cv = null;
  try {
    cv = await shrinkToCanvas(file);
  } catch (e) {}
  if (cv && 'BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const r = await det.detect(cv);
      if (r[0]) return r[0].rawValue;
    } catch (e) {}
  }
  if (cv) {
    try {
      if (!window.ZXing) window.ZXing = await import('@zxing/library');
      const Z = window.ZXing;
      const hints = new Map();
      hints.set(Z.DecodeHintType.TRY_HARDER, true);
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
        Z.BarcodeFormat.EAN_13,
        Z.BarcodeFormat.EAN_8,
        Z.BarcodeFormat.UPC_A,
        Z.BarcodeFormat.UPC_E,
      ]);
      const img = new Image();
      img.src = cv.toDataURL('image/png');
      await img.decode();
      const res = await new Z.BrowserMultiFormatReader(hints).decodeFromImageElement(img);
      if (res) return res.getText();
    } catch (e) {}
  }
  if (AI.sample && AI.images) {
    try {
      return await aiReadBarcode(file);
    } catch (e) {}
  }
  return null;
}

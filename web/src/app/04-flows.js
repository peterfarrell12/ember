// @ts-check
/* ---------- actions ---------- */
const A = {},
  I = {};
document.addEventListener('click', e => {
  const el = /** @type {HTMLButtonElement} */ (/** @type {HTMLElement} */ (e.target).closest('[data-act]'));
  if (!el || el.disabled) return;
  const fn = A[el.dataset.act];
  if (fn) {
    const r = fn(el.dataset, el, e);
    if (r && r.catch) r.catch(err => console.warn('action failed', el.dataset.act, err));
  }
});
const onInput = e => {
  if (e.type === 'change' && e.target.tagName !== 'SELECT') return;
  const k = e.target.dataset && e.target.dataset.on;
  if (k && I[k]) I[k](e.target);
};
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (celeOpen) A.celeNext();
    else if (sheets.length && !(P && !P.onboarded)) closeSheet();
  }
  if (e.key === 'Enter' && /** @type {HTMLElement} */ (e.target).id === 'bcNum') A.bcFind();
});
const segHtml = (name, opts, val) =>
  `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-act="seg" data-name="${name}" data-val="${v}" aria-pressed="${String(v) === String(val)}">${l}</button>`).join('')}</div>`;
const SEG = {};
A.seg = ({ name, val }, el) => {
  $$('button', el.parentNode).forEach(b => b.setAttribute('aria-pressed', b === el));
  if (SEG[name]) SEG[name](val);
};
A.close = () => closeSheet();
A.celeNext = () => {
  celeOpen = false;
  $('#cele').innerHTML = '';
  flushCele();
  obIdle();
};
A.tab = ({ tab }) => {
  S.tab = tab;
  try {
    history.replaceState(null, '', '#' + tab);
  } catch (e) {
    location.hash = tab;
  }
  render();
  $('#main').scrollTop = 0;
};
async function goDate(k) {
  await loadDay(k);
  S.date = k;
  if (S.tab !== 'today') S.tab = 'today';
  closeAll();
  render();
}
A.goDate = ({ date }) => goDate(date);
A.shiftDate = ({ n }) => goDate(addDays(S.date, +n));
A.range = ({ n }) => {
  S.range = +n;
  render();
};

/* ---------- logging ---------- */
const STREAK_MILESTONES = [1, 3, 7, 14, 30, 50, 100, 200, 365];
async function logEntries(entries, via, opts = {}) {
  const d = await loadDay(S.date);
  const tk = today();
  const earn = d.date <= tk && d.date >= addDays(tk, -1);
  const first = d.date === tk && d.e.length === 0;
  let xp = 0;
  const ids = [];
  for (const e of entries) {
    if (earn && !d.e.some(x => x.m === e.m)) xp += 10;
    if (earn && d.lx < 60) {
      xp += 5;
      d.lx += 5;
    }
    const id = newId();
    ids.push(id);
    d.e.push({ ...e, id, t: Date.now(), ...(via ? { via } : {}) });
  }
  const askCaf = opts.noCaf ? null : cafFromFoods(d, d.e.slice(-entries.length));
  P.st.logs += entries.length;
  if (via === 'say') P.st.say++;
  if (via === 'photo') P.st.photo++;
  // the first log of the day carries the streak in the same line as the XP; the full-screen moment is kept for milestones
  const streakNow = first ? streak().count + 1 : 0,
    milestone = STREAK_MILESTONES.includes(streakNow);
  if (xp)
    grant(
      xp,
      0,
      d,
      first && !milestone && streakNow > 1
        ? streakNow + '-day streak'
        : entries.length > 1
          ? entries.length + ' foods logged'
          : 'Logged',
    );
  else if (!opts.quiet) toast(entries.length > 1 ? entries.length + ' foods logged' : 'Logged');
  if (!opts.keep) closeAll();
  commitDay(d, {
    onHist: () => {
      if (first && milestone) {
        const c = streak().count,
          day1 = c === 1 && OB.day1; // the very first food of a new account
        OB.day1 = false;
        celeQ.unshift({
          icon: 'flame',
          fill: true,
          tone: 'ember',
          title: day1 ? 'Day 1' : c + '-day streak',
          sub: day1
            ? 'Your first food is in and your streak is lit. Log again tomorrow to make it two.'
            : c === 1
              ? 'Your streak starts today. Log again tomorrow to make it two.'
              : 'Logged again. Keep the fire going.',
          rewards: day1 ? ['1 streak freeze to begin with'] : [],
          confetti: [3, 7, 14, 30, 50, 100, 200, 365].includes(c),
        });
      }
    },
  });
  if (askCaf) cafAsk(d.date, askCaf);
  else if (P.fast && P.fast.start && d.date === tk && entries.some(e => e.k > 20))
    toast('You are on a fast. Has it ended?', '', { act: 'fastEnd', label: 'End fast' });
  return ids;
}
A.water = async ({ n }) => {
  const d = await loadDay(S.date);
  d.w = Math.max(0, d.w + +n);
  commitDay(d);
};
A.addExercise = () => {
  openSheet(`${sh('Add exercise')}<div class="sheet-b"><label class="f">Activity<input class="inp" id="exName" placeholder="Padel, 60 minutes" autocomplete="off"></label><label class="f">Calories burned<input class="inp" id="exK" inputmode="numeric" placeholder="400"></label>
  <p class="small muted">${P.exAdd ? 'Exercise calories are added to your budget for the day. You can turn that off in Targets.' : 'Exercise is recorded but does not change your budget.'}</p></div><div class="sheet-f"><button class="btn" data-act="saveExercise">Save</button></div>`);
  $('#exName').focus();
};
A.saveExercise = async () => {
  const k = r0(num($('#exK').value));
  if (k <= 0) return toast('Enter the calories burned.');
  const d = await loadDay(S.date);
  d.x.push({ id: newId(), n: $('#exName').value.trim() || 'Exercise', k });
  closeSheet();
  commitDay(d);
};
A.delExercise = async ({ id }) => {
  const d = await loadDay(S.date);
  d.x = d.x.filter(x => x.id !== id);
  commitDay(d);
  toast('Exercise removed');
};
A.closeDay = async () => {
  const d = await loadDay(S.date);
  if (d.done || !d.e.length) return;
  const t = totals(d),
    z = zone(d);
  const inz = t.k >= z.lo && t.k <= z.hi,
    prot = t.p >= P.t.p * 0.95,
    meals = ['b', 'l', 'd'].every(m => d.e.some(e => e.m === m)),
    water = d.w >= P.t.w;
  const xp = 10 + (inz ? 40 : 0) + (prot ? 25 : 0) + (meals ? 15 : 0) + (water ? 10 : 0);
  d.done = 1;
  d.zone = inz ? 1 : 0;
  P.st.closed++;
  if (inz) P.st.zone++;
  if (prot) P.st.prot++;
  if (water) P.st.water++;
  grant(xp, inz ? 5 : 0, d, false);
  celeQ.unshift({
    icon: inz ? 'target' : 'check',
    tone: inz ? 'good' : '',
    title: inz ? 'Right in your zone' : 'Day closed',
    sub: fmt(t.k) + ' kcal eaten against a budget of ' + fmt(z.b) + '.',
    confetti: inz,
    list: [
      ['Day closed', '+10 XP', 1],
      ['Inside your calorie zone', inz ? '+40 XP' : 'Not today', inz],
      ['Protein target', prot ? '+25 XP' : 'Not today', prot],
      ['Breakfast, lunch and dinner', meals ? '+15 XP' : 'Not today', meals],
      ['Water target', water ? '+10 XP' : 'Not today', water],
    ],
    rewards: ['+' + xp + ' XP'].concat(inz ? ['+5 gems'] : []),
  });
  commitDay(d);
};
A.mealMenu = ({ meal }, el, e) => {
  e.stopPropagation();
  openMenu(el, [
    { act: 'copyYesterday', icon: 'copy', label: 'Copy from the day before', data: { meal } },
    { act: 'saveMeal', icon: 'book', label: 'Save as a recipe', data: { meal } },
    { act: 'clearMeal', icon: 'trash', label: 'Clear ' + MEALS[meal].toLowerCase(), data: { meal } },
  ]);
};
A.copyYesterday = async ({ meal }) => {
  const prev = await loadDay(addDays(S.date, -1));
  const es = prev.e.filter(e => e.m === meal);
  if (!es.length) return toast('Nothing logged for ' + MEALS[meal].toLowerCase() + ' the day before.');
  logEntries(
    es.map(e => {
      const c = clone(e);
      delete c.id;
      delete c.t;
      delete c.via;
      delete c.cf;
      return c;
    }),
  );
};
/* what a day held just before something was removed from it, so the toast can offer to put it back */
let removed = null;
const keepForUndo = d => (removed = { date: d.date, e: d.e.slice(), cf: cafOf(d).slice() });
A.undoRemove = async () => {
  if (!removed) return;
  const was = removed;
  removed = null;
  const d = await loadDay(was.date);
  d.e = was.e;
  d.cf = was.cf;
  commitDay(d);
  toast('Put back');
};
A.clearMeal = async ({ meal }) => {
  const d = await loadDay(S.date);
  if (!d.e.some(e => e.m === meal)) return;
  keepForUndo(d);
  dropEntries(
    d,
    d.e.filter(e => e.m === meal).map(e => e.id),
  );
  commitDay(d);
  toast(MEALS[meal] + ' cleared', '', { act: 'undoRemove', label: 'Undo' });
};
A.saveMeal = async ({ meal }) => {
  const d = await loadDay(S.date);
  const es = d.e.filter(e => e.m === meal && e.g > 0);
  if (!es.length) return toast('Log some foods in this meal first.');
  openRecipe({
    id: '',
    n: '',
    sv: 1,
    items: es.map(e => ({
      n: e.n,
      b: e.b,
      g: e.g,
      k: e.k,
      p: e.p,
      c: e.c,
      f: e.f,
      fi: e.fi,
      su: e.su,
      sf: e.sf,
      na: e.na,
      src: e.src,
    })),
  });
};

/* ---------- entry editor ---------- */
let EE = null;
/* A logged entry as a food again, with its measures, so its amount can be changed in any unit. */
function entryFood(e) {
  const m = 100 / e.g,
    r = lastUse(e),
    ports = (e.ports && e.ports.length ? e.ports : r && r.ports ? r.ports : []).slice();
  const lab = String(e.u || '').match(/^(?:([\d.]+) × )?(.+?)(?: · [\d.,]+ (?:g|ml))?$/),
    q = e.q || (lab && lab[1] ? +lab[1] : 1),
    us = e.us || (lab && !/^[\d.,]+ (g|ml)$/.test(e.u) && !/ · /.test(lab[2]) ? lab[2] : '');
  if (
    us &&
    us !== 'g' &&
    q > 0 &&
    !/^(kg|oz|lb|l|pint|cup|fl oz|g dry|g raw)$/.test(us) &&
    !ports.some(x => x[0] === us)
  )
    ports.unshift([us, r1(e.g / q)]);
  return {
    id: e.fid || '',
    n: e.n,
    b: e.b || '',
    k: e.k * m,
    p: e.p * m,
    c: e.c * m,
    f: e.f * m,
    fi: (e.fi || 0) * m,
    su: e.su == null ? null : e.su * m,
    sf: e.sf == null ? null : e.sf * m,
    na: e.na == null ? null : e.na * m,
    ports,
    src: e.src,
    ...(e.liq != null ? { liq: e.liq } : {}),
    lq: us ? q : e.g,
    lu: us || 'g',
    ...(e.sv != null ? { ls: e.sv } : {}),
  };
}
A.editEntry = async ({ id }) => {
  const d = await loadDay(S.date);
  const e = d.e.find(x => x.id === id);
  if (!e) return;
  EE = { id, m: e.m };
  if (e.g > 0 && !e.nog) return openFood(entryFood(e), { edit: e, meal: e.m });
  openSheet(`${sh(e.n)}<div class="sheet-b"><div class="row small muted">${srcBadge(e.src)}<span>${esc([e.b, (SRC[e.src] || SRC.Q)[2]].filter(Boolean).join(' · '))}</span></div>
    ${e.g > 0 ? `<label class="f">Servings<input class="inp" id="eeG" inputmode="decimal" value="${e.q || 1}" data-on="ee"></label>` : `<div class="grid4"><label class="f">kcal<input class="inp" id="eeK" inputmode="numeric" value="${e.k}"></label><label class="f">Protein<input class="inp" id="eeP" inputmode="decimal" value="${e.p}"></label><label class="f">Carbs<input class="inp" id="eeC" inputmode="decimal" value="${e.c}"></label><label class="f">Fat<input class="inp" id="eeF" inputmode="decimal" value="${e.f}"></label></div>`}
    ${segHtml('eeMeal', Object.entries(MEALS), e.m)}
    <div class="card" id="eeNut">${nutTable(e)}</div></div>
    <div class="sheet-f"><button class="btn ghost" style="width:auto" data-act="delEntry" aria-label="Delete">${ic('trash')}</button><button class="btn" data-act="saveEntry">Save</button></div>`);
  SEG.eeMeal = v => (EE.m = v);
};
/**
 * An entry rescaled to a new weight, nutrition in proportion.
 * @param {Entry} e
 * @param {number} g grams or ml
 * @returns {Entry}
 */
function scaled(e, g) {
  const m = g / e.g;
  return {
    ...e,
    g: r1(g),
    k: r0(e.k * m),
    p: r1(e.p * m),
    c: r1(e.c * m),
    f: r1(e.f * m),
    fi: r1((e.fi || 0) * m),
    su: r1((e.su || 0) * m),
    sf: r1((e.sf || 0) * m),
    na: r0((e.na || 0) * m),
    ...(e.mi ? { mi: scaleMicros(e.mi, m) } : {}),
    u: r1(g) + ' g',
  };
}
const eeG = (e, v) => (e.g * v) / (e.q || 1);
I.ee = el => {
  const e = day().e.find(x => x.id === EE.id);
  const v = num(String(el.value).replace(',', '.'));
  if (e && v > 0) $('#eeNut').innerHTML = nutTable(scaled(e, eeG(e, v)));
};
A.saveEntry = async () => {
  const d = await loadDay(S.date);
  const i = d.e.findIndex(x => x.id === EE.id);
  if (i < 0) return closeSheet();
  let e = d.e[i];
  if (e.g > 0) {
    const v = num(String($('#eeG').value).replace(',', '.'));
    if (v <= 0) return toast('Enter an amount above zero.');
    if (v !== (e.q || 1)) {
      const us = e.us || '1 serving';
      e = { ...scaled(e, eeG(e, v)), q: v, us, u: (v === 1 ? '' : v + ' × ') + us };
    }
  } else
    e = {
      ...e,
      k: r0(num($('#eeK').value)),
      p: r1(num($('#eeP').value)),
      c: r1(num($('#eeC').value)),
      f: r1(num($('#eeF').value)),
    };
  e.m = EE.m;
  d.e[i] = e;
  closeSheet();
  commitDay(d);
};
A.delEntry = async () => {
  const d = await loadDay(S.date),
    had = cafOf(d).length;
  keepForUndo(d);
  dropEntries(d, [EE.id]);
  closeSheet();
  commitDay(d);
  toast(cafOf(d).length < had ? 'Removed, with its caffeine' : 'Removed', '', { act: 'undoRemove', label: 'Undo' });
};
function nutTable(x) {
  const salt = x.na != null ? r1(((x.na * 2.5) / 1000) * 10) / 10 : null;
  const row = (l, v, u, sub) =>
    `<span class="${sub ? 'sub' : ''}">${l}</span><b>${v == null ? 'not listed' : v + ' ' + u}</b>`;
  return `<div class="row" style="align-items:baseline;gap:8px;margin-bottom:12px"><span class="num bigk">${fmt(x.k)}</span><span class="muted">kcal</span></div>
  <div class="nut">${row('Protein', r1(x.p), 'g')}${row('Carbohydrate', r1(x.c), 'g')}${row('of which sugars', x.su == null ? null : r1(x.su), 'g', 1)}${row('Fat', r1(x.f), 'g')}${row('of which saturates', x.sf == null ? null : r1(x.sf), 'g', 1)}${row('Fibre', x.fi == null ? null : r1(x.fi), 'g')}${row('Salt', salt == null ? null : Math.round((x.na * 2.5) / 10) / 100, 'g')}</div>`;
}

/* ---------- food detail ---------- */
let FD = null;
/* ---------- amounts and units ---------- */
const LIQ =
  /\b(milk|juice|water|cola|coke|pepsi|fanta|sprite|7up|lemonade|beer|lager|stout|ale|cider|wine|prosecco|champagne|drink|smoothie|coffee|americano|latte|cappuccino|espresso|tea|squash|cordial|shake|milkshake|kombucha|soda|tonic|whiskey|whisky|vodka|gin|rum|broth|stock|soup|kefir|lucozade|guinness|heineken)\b/;
const NOT_LIQ =
  /\b(powder|powdered|bar|cheese|biscuit|cake|bread|loaf|dried|dry|bags?|beans|ground|ice cream|cracker|crisps|instant|granules|leaves|butter|sweets|capsules?|pods?|pie|sausages?|steak|chicken|beef|pork|tuna|sardines?|mackerel|battered|sauce|marinade|rub|mix|casserole|toffee|pudding|noodles?|cube|cubes|concentrate|cereal|oats|porridge|yog(h)?urt|toast)\b/;
/* What a food is, for telling a drink from a solid and for offering spoonfuls. The UK tables name the food first
   and how it was made after ("Rice, white, boiled in unsalted water", "Apples, stewed with sugar"), so only the
   first part says what it is. */
const kindOf = food => (food.src === 'M' ? String(food.n).split(',')[0] : food.n);
function isLiquid(food) {
  if (food.liq != null) return !!food.liq;
  if (food.src === 'DR') return true;
  const n = norm(kindOf(food) + ' ' + (food.b || '')) + ' ';
  if (/chocolate/.test(n) && !/\b(drink|shake|milkshake|hot chocolate|chocolate milk)\b/.test(n)) return false;
  // nothing you drink by the glass has over 200 kcal in 100 ml, bar spirits and cream liqueurs: "Dairy Milk" is a bar
  if (
    food.k > 200 &&
    !/\b(whisk(e)?y|vodka|gin|rum|brandy|cognac|tequila|liqueur|baileys|spirit|poitin|schnapps)\b/.test(n)
  )
    return false;
  if ((food.ports || []).some(([l]) => /\bml\b|\bcan\b|\bbottle\b/i.test(l) && !/fl oz/i.test(l)) && !NOT_LIQ.test(n))
    return true;
  return LIQ.test(n) && !NOT_LIQ.test(n);
}
/** Drink sizes offered for a liquid, by what its name matches. @type {[RegExp, Portion[]][]} */
const DRINK_SIZES = [
  [
    /\b(beer|lager|stout|ale|cider|guinness|heineken)\b/,
    [
      ['1 pint', 568],
      ['1 bottle, 330 ml', 330],
      ['1 can, 440 ml', 440],
      ['1 can, 500 ml', 500],
      ['1 half pint', 284],
    ],
  ],
  [
    /\b(wine|prosecco|champagne)\b/,
    [
      ['1 medium glass, 175 ml', 175],
      ['1 small glass, 125 ml', 125],
      ['1 large glass, 250 ml', 250],
      ['1 bottle, 750 ml', 750],
    ],
  ],
  [
    /\b(whiskey|whisky|vodka|gin|rum)\b/,
    [
      ['1 measure, 35.5 ml', 35.5],
      ['1 double, 71 ml', 71],
    ],
  ],
  [
    /\b(tea|coffee|americano|latte|cappuccino|espresso)\b/,
    [
      ['1 mug, 260 ml', 260],
      ['1 cup, 190 ml', 190],
      ['1 large mug, 350 ml', 350],
    ],
  ],
  [
    /\bmilk\b/,
    [
      ['1 glass, 250 ml', 250],
      ['1 splash, 30 ml', 30],
      ['1 pint', 568],
    ],
  ],
  [
    /./,
    [
      ['1 glass, 250 ml', 250],
      ['1 can, 330 ml', 330],
      ['1 bottle, 500 ml', 500],
    ],
  ],
];
/* level spoonfuls in grams for foods that are measured by the spoon */
/** Grams in a teaspoon and a tablespoon, by what the food's name matches. @type {[RegExp, number, number][]} */
const SPOONS = [
  [/\boil\b/, 4.5, 13.5],
  [/\b(butter|spread|margarine)\b/, 5, 14],
  [/\b(honey|syrup|treacle)\b/, 7, 21],
  [/\bsugar\b/, 4, 12.5],
  [/\b(peanut butter|almond butter|nut butter|tahini|nutella|hazelnut spread)\b/, 5.5, 16],
  [/\b(jam|marmalade|chutney)\b/, 7, 20],
  [/\b(mayo|mayonnaise|ketchup|mustard|relish|pesto|hummus|houmous)\b/, 5, 15],
  [/\b(chia|flax|linseed|seeds)\b/, 4, 10],
  [/\b(flour|cocoa)\b/, 3, 8],
];
/* weight change in cooking, so a food weighed before cooking can be logged against its cooked entry */
/** Cooked weight per gram weighed before cooking, and the word for that state. @type {[RegExp, number, string][]} */
const RAW_YIELD = [
  [/\brice\b/, 3, 'dry'],
  [/\b(pasta|spaghetti|macaroni|penne|fusilli|tagliatelle)\b/, 2.2, 'dry'],
  [/\bnoodles?\b/, 2.3, 'dry'],
  [/\bcouscous\b/, 2.5, 'dry'],
  [/\bquinoa\b/, 3, 'dry'],
  [/\blentils?\b/, 2.5, 'dry'],
  [/\b(chicken|turkey)\b/, 0.75, 'raw'],
  [/\b(beef|steak|mince|pork|lamb)\b/, 0.75, 'raw'],
  [/\b(salmon|cod|fish|tuna steak)\b/, 0.8, 'raw'],
];
const JUNK_PORT = /guideline amount|school container|quantity not specified|\bfl oz\b|^1 oz\b/i;
/* American measures on USDA foods: cups, ounces, pounds and anything sized in inches. Not offered; grams always are. */
const US_PORT = /\bcups?\b|\boz\b|\blbs?\b|"|\binch(es)?\b/i;
/**
 * The list of units a food can be measured in: g or ml, its own portions, drink sizes, spoonfuls,
 * weighed-raw conversions and convert-from units.
 * @param {Food} food
 * @returns {Unit[]}
 */
function unitsFor(food) {
  const liq = !food.nog && isLiquid(food),
    bw = liq ? 'ml' : 'g',
    n = norm(kindOf(food)) + ' ';
  /** @type {Unit[]} */
  const u = food.nog ? [] : [{ l: bw, short: 'g', g: 1, base: true, bw }];
  const seen = new Set();
  const usda = /^[FNS]$/.test(food.src);
  for (const [l1, g] of food.ports || []) {
    // "1 medium (7" to 7-7/8" long)" is offered as "1 medium"; "1 fry, NS as to shape" as "1 fry"
    const l0 = usda
      ? String(l1)
          .replace(/\s*\([^)]*("|\binch)[^)]*\)/gi, '')
          .replace(/, (NFS|NS as to [^,]+)(?=,|$)/g, '')
      : l1;
    if (!(g > 0) || JUNK_PORT.test(l0) || (usda && US_PORT.test(l0)) || (l0 === '1 serving' && g === 100)) continue;
    const l = String(l0).replace(/\bRACC\b/g, 'serving');
    if (seen.has(l)) continue;
    seen.add(l);
    u.push({ l: food.nog ? l : l + ' (' + r1(g) + ' ' + bw + ')', short: l, g });
  }
  if (!food.nog) {
    const has = re => u.some(x => !x.base && re.test(x.short)),
      near = g => u.some(x => !x.base && Math.abs(x.g - g) <= Math.max(2, g * 0.03));
    if (liq) {
      for (const [l, g] of DRINK_SIZES.find(([re]) => re.test(n))[1]) if (!near(g)) u.push({ l, short: l, g });
    } else {
      const sp = SPOONS.find(([re]) => re.test(n));
      if (sp && !has(/tablespoon|tbsp|teaspoon|tsp/i)) {
        u.push({ l: '1 teaspoon (' + sp[1] + ' g)', short: '1 teaspoon', g: sp[1] });
        u.push({ l: '1 tablespoon (' + sp[2] + ' g)', short: '1 tablespoon', g: sp[2] });
      }
    }
    if (/^[FNS]$/.test(food.src) && /\b(cooked|boiled|grilled|roasted|baked|fried|steamed|stewed|broiled)\b/.test(n)) {
      const y = RAW_YIELD.find(([re]) => re.test(n));
      if (y)
        u.push({
          l: 'g weighed ' + y[2] + ', before cooking',
          short: 'g ' + y[2],
          g: y[1],
          alt: 'raw',
          bw: 'g',
          y: y[1],
        });
    }
    // @ts-expect-error true minus false is 1: packs sort after the other measures
    u.sort((x, y) => (x.base ? -1 : y.base ? 1 : 0) || (x.short === '1 pack') - (y.short === '1 pack'));
    for (const [l, short, g] of /** @type {[string, string, number][]} */ (
      liq
        ? [
            ['litres', 'l', 1000],
            ['pints', 'pint', 568],
          ]
        : [
            ['kg', 'kg', 1000],
            ['oz', 'oz', 28.35],
            ['lb', 'lb', 453.6],
          ]
    ))
      if (!(short === 'pint' && has(/^1 pint$/))) u.push({ l, short, g, alt: 'conv' });
  }
  if (!u.length) u.push({ l: '1 serving', short: '1 serving', g: 100 });
  return u;
}
/* The unit a food opens at: its first household measure; otherwise 100 g or 100 ml. */
/**
 * @param {Unit[]} units
 * @returns {{ ui: number, qty: number }} index into units, and how many of it
 */
function defUnit(units) {
  const liq = units[0] && units[0].bw === 'ml',
    ok = u => !u.base && !u.alt && !(u.short === '1 pack' && u.g > (liq ? 600 : 250));
  let ui = units.findIndex(u => ok(u) && /\b(medium|regular)\b/.test(u.short)),
    qty = 1;
  if (ui < 0) ui = units.findIndex(ok);
  if (ui < 0) {
    ui = units.findIndex(u => u.base);
    qty = 100;
  }
  if (ui < 0) {
    ui = 0;
    qty = 1;
  }
  return { ui, qty };
}
/* a tidy number for an amount: quarters where they are close, else two decimals */
const nice = (x, fine) => {
  if (!(x > 0)) return 0;
  const q = Math.round(x * 4) / 4;
  return !fine && q > 0 && Math.abs(q - x) / x <= 0.04
    ? q
    : x >= 10
      ? r1(x)
      : Math.round(x * (fine ? 1000 : 100)) / (fine ? 1000 : 100);
};
/* How an amount reads in the diary: servings, then the serving size, then the total. */
/**
 * @param {Unit} u
 * @param {number} qty serving size, in units of u
 * @param {number} sv number of servings
 * @param {number} g total grams or ml
 * @param {string} bw 'g' or 'ml'
 * @param {boolean} [nog] true when the weight is unknown
 * @returns {string}
 */
function amtLabel(u, qty, sv, g, bw, nog) {
  const size = u.base ? r1(qty) + ' ' + bw : u.alt ? qty + ' ' + u.short : (qty === 1 ? '' : qty + ' × ') + u.short;
  return (sv !== 1 ? sv + ' × ' : '') + size + (nog || (u.base && sv === 1) ? '' : ' · ' + g + ' ' + bw);
}
/* The serving size and number of servings a food starts at: what was used last time, else its default measure. */
/**
 * @param {Food} food
 * @param {Unit[]} units
 * @returns {{ ui: number, qty: number, sv: number, known: boolean }}
 */
function startAmount(food, units) {
  const last = food.lu !== undefined ? food : lastUse(food);
  let { ui, qty } = defUnit(units),
    sv = 1,
    known = false;
  if (last && last.lu !== undefined) {
    const j = units.findIndex(u => u.short === last.lu);
    if (j >= 0) {
      ui = j;
      known = true;
      const u = units[j];
      if (!u.base && !u.alt && last.ls == null) {
        qty = 1;
        sv = last.lq || 1;
      } else {
        qty = last.lq || qty;
        sv = last.ls || 1;
      }
    } else {
      // the measure used last time is no longer offered (an American cup): keep the same amount, in grams or ml
      const p = (food.ports || []).find(x => x[0] === last.lu),
        b = units.findIndex(u => u.base);
      if (p && b >= 0) {
        ui = b;
        qty = r0(p[1] * (last.lq || 1) * (last.ls || 1));
        sv = 1;
        known = true;
      }
    }
  }
  return { ui, qty, sv, known };
}
function openFood(food, opts = {}) {
  const units = unitsFor(food);
  let { ui, qty, sv, known } = startAmount(food, units);
  if (opts.edit && (!known || Math.abs(qty * units[ui].g * sv - opts.edit.g) > Math.max(1, opts.edit.g * 0.02))) {
    ui = Math.max(
      0,
      units.findIndex(u => u.base),
    );
    qty = opts.edit.g;
    sv = 1;
  }
  if (opts.grams) {
    /* open on the portion that amount is a whole or half number of, e.g. 330 ml as one bottle; otherwise on g or ml */
    const half = u => {
        const x = opts.grams / u.g,
          h = Math.round(x * 2) / 2;
        return h > 0 && Math.abs(h - x) / x <= 0.02 ? h : 0;
      },
      j = units.findIndex(u => !u.base && !u.alt && half(u));
    if (j >= 0) {
      ui = j;
      qty = 1;
      sv = half(units[j]);
    } else {
      ui = units.findIndex(u => u.base);
      if (ui < 0) ui = 0;
      qty = units[ui].base ? opts.grams : nice(opts.grams / units[ui].g);
      sv = 1;
    }
  }
  const pick = opts.pick || (ADD && sheets.length > ADD.depth ? ADD.pick : null);
  FD = {
    food,
    units,
    ui,
    qty,
    sv,
    bw: units[0].bw || 'g',
    meal: opts.meal || (ADD ? ADD.meal : mealNow()),
    pick: opts.edit ? null : pick,
    edit: opts.edit || null,
    depth: opts.depth ?? (ADD && sheets.length > ADD.depth ? ADD.depth : sheets.length),
    via: opts.via,
  };
  const opt = (u, i) => `<option value="${i}" ${i === ui ? 'selected' : ''}>${esc(u.l)}</option>`,
    grp = (label, kind) => {
      const o = units.map((u, i) => (u.alt === kind ? opt(u, i) : '')).join('');
      return o ? `<optgroup label="${label}">${o}</optgroup>` : '';
    };
  const isFav = !!(lastUse(food) || {}).fav;
  openSheet(`${sh(food.n, `<button class="icon-btn fav" id="fdFav" data-act="fdFav" aria-pressed="${isFav}" aria-label="Favourite">${ic('star', isFav ? 'fill' : '')}</button>`)}<div class="sheet-b">
    <div class="row small muted">${srcBadge(food.src)}<span>${esc([food.b, (SRC[food.src] || SRC.Q)[2]].filter(Boolean).join(' · '))}${webSource(food)}</span></div>
    <div class="amt"><label class="f">Serving size<input class="inp" id="fdQty" inputmode="decimal" value="${qty}" data-on="fd"></label>
      <label class="f">Unit<select class="inp" id="fdUnit" data-on="fdUnit">${units.map((u, i) => (u.alt ? '' : opt(u, i))).join('')}${grp('Weighed before cooking', 'raw')}${grp('Convert from', 'conv')}</select></label></div>
    <div class="amt"><div class="f"><label for="fdSv">Number of servings</label><div class="stp"><button data-act="fdStep" data-d="-1" aria-label="Fewer servings">${ic('minus')}</button><input class="inp" id="fdSv" inputmode="decimal" value="${sv}" data-on="fdSv"><button data-act="fdStep" data-d="1" aria-label="More servings">${ic('plus')}</button></div></div>
      <div class="tot"><span>Total</span><b class="tn" id="fdEq"></b></div></div>
    <div class="chips" id="fdChips"></div>
    ${FD.pick ? '' : segHtml('fdMeal', Object.entries(MEALS), FD.meal)}
    <div class="card" id="fdNut"></div>${food.nog ? '' : `<p class="tiny muted" style="text-align:center">Per 100 ${FD.bw}: ${fmt(food.k)} kcal, protein ${r1(food.p)} g, carbs ${r1(food.c)} g, fat ${r1(food.f)} g</p>`}${Store.durable && /^[bmog]/.test(food.id || '') ? `<button class="link small" data-act="fdWrong" style="align-self:center">These figures are wrong</button>` : ''}
    ${food.src === 'AI' ? `<div class="banner">${ic('spark')}<span>This is an estimate, not a database entry. Search for the food to use measured values.</span></div>` : ''}
  </div><div class="sheet-f">${FD.edit ? `<button class="btn ghost" style="width:auto" data-act="delEntry" aria-label="Delete">${ic('trash')}</button>` : ''}<button class="btn ${FD.edit ? '' : 'ember'}" id="fdGo" data-act="fdGo"></button></div>`);
  SEG.fdMeal = v => {
    FD.meal = v;
    fdUpdate();
  };
  fdUpdate();
}
const fdGrams = () => r1(FD.qty * FD.units[FD.ui].g * FD.sv);
/* The star on a food: favourites head the Add sheet and are never dropped from the remembered foods. */
A.fdFav = () => {
  let r = lastUse(FD.food);
  if (!r) {
    remember(FD.food, FD.qty, FD.units[FD.ui].short, null, FD.sv);
    r = lastUse(FD.food);
  }
  if (r.fav) delete r.fav;
  else r.fav = 1;
  saveProfile();
  const b = $('#fdFav');
  if (b) {
    b.setAttribute('aria-pressed', String(!!r.fav));
    b.innerHTML = ic('star', r.fav ? 'fill' : '');
  }
  toast(r.fav ? 'Added to favourites' : 'Removed from favourites');
  if (ADD && $('#addList')) renderAddList();
};
/* ---------- the day's full nutrition: what the three bars on Today leave out ---------- */
A.dayNut = () => {
  const d = day(),
    t = totals(d),
    miss = k => d.e.filter(e => e[k] == null).length,
    gaps = Math.max(miss('su'), miss('sf'), miss('na')),
    salt = (t.na * 2.5) / 1000,
    // reference intakes for an average adult, as printed on UK and Irish labels; fibre is the 30 g a day advised for adults
    row = (l, v, u, ref, sub, limit) =>
      `<span class="${sub ? 'sub' : ''}">${l}</span><b>${v} ${u}${ref ? `<small class="muted"> ${limit ? 'of at most' : 'of'} ${ref} ${u}</small>` : ''}</b>`;
  openSheet(
    `${sh(S.date === today() ? "Today's nutrition" : 'Nutrition, ' + niceDate(S.date))}<div class="sheet-b">
    <div class="card"><div class="row" style="align-items:baseline;gap:8px;margin-bottom:12px"><span class="num bigk">${fmt(t.k)}</span><span class="muted">kcal from ${t.n} ${t.n === 1 ? 'food' : 'foods'}</span></div>
    <div class="nut">${row('Protein', r0(t.p), 'g', P.t.p)}${row('Carbohydrate', r0(t.c), 'g', P.t.c)}${row('of which sugars', r0(t.su), 'g', 90, 1, 1)}${row('Fat', r0(t.f), 'g', P.t.f)}${row('of which saturates', r0(t.sf), 'g', 20, 1, 1)}${row('Fibre', r0(t.fi), 'g', 30)}${row('Salt', r1(salt), 'g', 6, 0, 1)}</div></div>
    ${microCard(d)}
    <p class="tiny muted">Protein, carbohydrate and fat are set against your own targets. Sugars, saturates and salt are set against the reference intakes for an average adult printed on food labels; fibre against the 30 g a day advised for adults. General guidance, not medical advice.${gaps ? ` ${gaps} of the ${t.n} foods ${gaps === 1 ? 'does' : 'do'} not list sugars, saturates or salt, so those totals may be higher.` : ''}</p></div>`,
  );
};
/* Vitamins and minerals for a day: added up from the foods that list them. Only the UK food tables do, so the
   card says how many of the day's foods it could count, and the totals are a floor, not the whole picture. */
function microCard(d) {
  const withMi = d.e.filter(e => e.mi);
  if (!withMi.length)
    return d.e.length
      ? `<p class="small muted">Vitamins and minerals are shown for foods from the UK food tables (marked UK). None of the foods logged here is one of those.</p>`
      : '';
  const tot = MICROS.map((_, i) => withMi.reduce((s, e) => s + (e.mi[i] || 0), 0)),
    nice = v => (v >= 100 ? fmt(v) : v >= 10 ? r0(v) : r1(v));
  return `<div class="card"><div class="between" style="margin-bottom:10px"><h2>Vitamins and minerals</h2><span class="muted small">% of daily reference</span></div>
    <div class="nut">${MICROS.map(([n, u, ref], i) => `<span>${n}</span><b>${nice(tot[i])} ${u}<small class="muted"> ${r0((tot[i] / +ref) * 100)}%</small></b>`).join('')}</div>
    <p class="tiny muted" style="margin-top:10px">Counted from ${withMi.length} of the ${d.e.length} ${d.e.length === 1 ? 'food' : 'foods'} logged: only foods from the UK food tables list these, so the real totals are at least this much. Reference values are those printed on food labels for an average adult.</p></div>`;
}
/* ---------- water: any amount, not only 250 ml ---------- */
A.waterSheet = () => {
  const d = day(),
    sizes = [
      ['Glass', 200],
      ['Mug', 260],
      ['Can', 330],
      ['Bottle', 500],
      ['Large bottle', 750],
      ['Litre', 1000],
    ];
  openSheet(
    `${sh('Water')}<div class="sheet-b"><p class="small muted">${fmt(d.w)} of ${fmt(P.t.w)} ml ${S.date === today() ? 'today' : 'that day'}.</p>
    <div class="opts">${sizes.map(([l, ml]) => `<button data-act="waterAdd" data-n="${ml}">${l}, ${fmt(ml)} ml</button>`).join('')}</div>
    <label class="f">Another amount, ml<input class="inp" id="wtMl" inputmode="numeric" placeholder="400" autocomplete="off"></label>
    <p class="tiny muted">To correct a mistake, take some off with the minus button on Today.</p></div>
    <div class="sheet-f"><button class="btn" data-act="waterAdd">Add</button></div>`,
  );
};
A.waterAdd = async ({ n }) => {
  const ml = n ? +n : r0(num($('#wtMl').value));
  if (!(ml > 0) || ml > 5000) return toast('Enter an amount between 1 and 5,000 ml.');
  closeSheet();
  await A.water({ n: ml });
  toast(fmt(ml) + ' ml of water added');
};
const svText = q => (q === 0.5 ? '½' : q === 1.5 ? '1½' : String(q));
function fdUpdate() {
  const g = fdGrams(),
    u = FD.units[FD.ui];
  $('#fdNut').innerHTML = nutTable(portion(FD.food, g));
  const eq = $('#fdEq');
  if (eq)
    eq.textContent = FD.food.nog
      ? svText(FD.sv * FD.qty) + ' serving' + (FD.sv * FD.qty === 1 ? '' : 's')
      : u.alt === 'raw'
        ? 'about ' + fmt(g) + ' g cooked'
        : fmt(g) + ' ' + FD.bw;
  const ch = $('#fdChips');
  if (ch)
    ch.innerHTML = [0.5, 1, 1.5, 2, 3]
      .map(
        q =>
          `<button class="chipb" data-act="fdSet" data-q="${q}" aria-pressed="${q === FD.sv}" aria-label="${q} servings">${svText(q)}</button>`,
      )
      .join('');
  $('#fdGo').innerHTML = FD.edit
    ? 'Save'
    : FD.pick
      ? 'Use this amount'
      : ic('plus') + ' Log to ' + MEALS[FD.meal].toLowerCase();
}
const decimal = v => Math.max(0, num(String(v).replace(',', '.')));
I.fd = el => {
  FD.qty = decimal(el.value);
  fdUpdate();
};
I.fdSv = el => {
  FD.sv = decimal(el.value);
  fdUpdate();
};
/* Changing the unit: measures (g, ml, kg, oz, litres) convert the serving size and keep the number of servings; a portion such as a slice or a can becomes the serving, and the servings carry over when the total is a whole or half number of them, otherwise it starts at one. */
I.fdUnit = el => {
  const was = fdGrams(),
    u = FD.units[+el.value],
    sv = FD.sv > 0 ? FD.sv : 1,
    x = was > 0 ? was / u.g : 0;
  FD.ui = +el.value;
  if (u.base) {
    FD.qty = was > 0 ? r0(was / sv) || r1(was / sv) : 100;
    FD.sv = sv;
  } else if (u.alt === 'raw') {
    FD.qty = r0(x / sv) || 75;
    FD.sv = sv;
  } else if (u.alt) {
    FD.qty = x > 0 ? nice(x / sv, u.short === 'kg' || u.short === 'l') : 1;
    FD.sv = sv;
  } else {
    const h = Math.round(x * 2) / 2;
    FD.qty = 1;
    FD.sv = h > 0 && Math.abs(h - x) / x <= 0.04 ? h : 1;
  }
  $('#fdQty').value = FD.qty;
  $('#fdSv').value = FD.sv;
  fdUpdate();
};
A.fdSet = ({ q }) => {
  FD.sv = +q;
  $('#fdSv').value = FD.sv;
  fdUpdate();
};
A.fdStep = ({ d }) => {
  const st = 0.5,
    q = +d > 0 ? Math.floor(FD.sv / st + 1e-9) * st + st : Math.ceil(FD.sv / st - 1e-9) * st - st;
  FD.sv = Math.max(st, Math.round(q * 100) / 100);
  $('#fdSv').value = FD.sv;
  fdUpdate();
};
A.fdGo = async () => {
  const g = fdGrams();
  if (!(g > 0)) return toast(FD.sv > 0 ? 'Enter a serving size above zero.' : 'Enter a number of servings above zero.');
  // an amount nobody eats in one go is almost always grams typed into a per-item unit: say so once before saving it
  const kcal = (FD.food.k * g) / 100;
  if ((g > 3000 || kcal > 6000) && FD.sure !== g) {
    FD.sure = g;
    return toast('That comes to ' + fmt(kcal) + ' kcal. Check the amount, or tap again to log it.');
  }
  const u = FD.units[FD.ui];
  const label = amtLabel(u, FD.qty, FD.sv, g, FD.bw, FD.food.nog),
    amt = { q: FD.qty, us: u.short, sv: FD.sv };
  if (FD.edit) {
    const d = await loadDay(S.date),
      i = d.e.findIndex(x => x.id === FD.edit.id);
    if (i < 0) return closeSheet();
    const e = { ...scaled(d.e[i], g), u: label, ...amt, m: FD.meal };
    if (FD.food.ports.length && !e.ports) e.ports = FD.food.ports.slice(0, 6);
    d.e[i] = e;
    const r = lastUse(e);
    if (r) {
      r.lq = FD.qty;
      r.lu = u.short;
      r.ls = FD.sv;
    }
    if (ADD) {
      const a = ADD.added.find(x => x.id === e.id);
      if (a) {
        a.k = e.k;
        a.meal = e.m;
      }
    }
    closeSheet();
    commitDay(d);
    saveProfile();
    if (ADD && $('#addFoot')) {
      addFoot();
      addLeft();
    }
    return toast('Amount updated');
  }
  remember(FD.food, FD.qty, u.short, FD.pick ? null : FD.meal, FD.sv);
  if (FD.pick) {
    const fn = FD.pick,
      food = FD.food;
    closeSheet(sheets.length - FD.depth);
    saveProfile();
    return fn(food, g, label);
  }
  logEntries([{ ...portion(FD.food, g), m: FD.meal, u: label, ...amt }], FD.via);
};

/* ---------- describe (voice or text) ---------- */
let SAY = null;
A.say = () => openSay();
function openSay(ctx = {}) {
  SAY = { onDone: ctx.onDone || null, seed: ctx.seed || (ADD && ADD.q ? ADD.q : ''), meal: ADD ? ADD.meal : mealNow() };
  openSheet(
    `${sh(ctx.title || 'Describe what you ate')}<div class="sheet-b" id="sayBody">
    <textarea class="inp" id="sayText" placeholder="Two scrambled eggs on buttered toast and a flat white" autocapitalize="sentences">${esc(SAY.seed)}</textarea>
    <div class="row" id="sayMicRow">${AI.dict ? `<button class="mic" id="micBtn" data-act="mic" aria-label="Start dictation">${ic('mic')}</button><span class="small muted grow" id="sayLive">Tap the microphone and talk. Tap again when you are done.</span>` : `<span class="small muted">${ic('mic')} Tap the microphone key on your keyboard to speak it, or type. Amounts help: "200 g", "two slices", "a small bowl".</span>`}</div>
    ${AI.ready && !AI.sample ? `<div class="banner">${ic('spark')}<span>Ember AI is not available in this view, so foods are matched by keyword. Separate foods with commas.</span></div>` : ''}
  </div><div class="sheet-f"><button class="btn ember" data-act="sayGo">${ic('spark')} Work it out</button></div>`,
    true,
  );
  const w = sheets[sheets.length - 1];
  w._onClose = () => {
    if (AI.dict && SAY && SAY.listening) AI.dict.stop().catch(() => {});
  };
  setTimeout(() => {
    const t = $('#sayText');
    if (t && !AI.dict) t.focus();
  }, 50);
}
A.mic = () => {
  if (!AI.dict) return;
  if (SAY.listening) {
    AI.dict.stop().catch(() => {});
    return;
  }
  AI.dict.start().catch(e => {
    if (e && e.code === 'not_granted') {
      AI.dict = null;
      const r = $('#sayMicRow');
      if (r)
        r.innerHTML =
          '<span class="small muted">Dictation is off for this page. Type instead, or use the microphone key on your keyboard.</span>';
    } else toast('Dictation did not start. Try again.');
  });
};
function wireDictation() {
  if (!AI.dict || AI.wired) return;
  AI.wired = true;
  AI.dict.onPartial(({ text }) => {
    asDict('partial', text);
    const l = $('#sayLive');
    if (l) l.textContent = text || 'Listening…';
  });
  AI.dict.onFinal(({ text }) => {
    asDict('final', text);
    const t = $('#sayText');
    if (t && text) t.value = (t.value ? t.value.replace(/\s+$/, '') + ' ' : '') + text;
    const l = $('#sayLive');
    if (l) l.textContent = 'Listening…';
  });
  AI.dict.onState(({ state }) => {
    asDict('state', state);
    if (SAY) SAY.listening = state === 'listening';
    const b = $('#micBtn');
    if (b) b.classList.toggle('on', state === 'listening');
    const l = $('#sayLive');
    if (l) l.textContent = state === 'listening' ? 'Listening…' : 'Tap the microphone to add more, or work it out.';
  });
}
document.addEventListener('aiready', wireDictation);
async function ensureDB() {
  await Promise.all([loadDB('gen'), loadDB('br')]);
}
A.sayGo = async () => {
  const text = ($('#sayText').value || '').trim();
  if (text.length < 2) return toast('Say or type what you ate first.');
  if (AI.dict && SAY.listening) await AI.dict.stop().catch(() => {});
  const body = $('#sayBody');
  const keep = body.innerHTML;
  const foot = topSheet().querySelector('.sheet-f');
  foot.classList.add('hide');
  body.innerHTML = `<div class="busy"><div class="spinner"></div>Working out what that was</div>`;
  try {
    await ensureDB();
    let items;
    if (AI.sample) items = await matchAll(await aiParseText(text));
    else items = localParse(text);
    if (!items.length) throw { code: 'none' };
    if (!$('#sayBody')) return;
    const onDone = SAY.onDone,
      meal = SAY.meal;
    closeSheet();
    openReview(items, { via: 'say', onDone, meal });
  } catch (e) {
    if (!topSheet() || !$('#sayBody')) return;
    body.innerHTML = keep;
    $('#sayText').value = text;
    foot.classList.remove('hide');
    toast(e && e.code === 'none' ? 'No foods recognised. Try naming them one by one.' : aiError(e));
  }
};

/* ---------- photo ---------- */
A.photo = () => {
  if (!(AI.sample && AI.images))
    return toast(
      AI.ready
        ? 'Photo logging needs Ember AI, which is not available in this view.'
        : 'Still connecting. Try again in a moment.',
    );
  $('#filePhoto').click();
};
async function onPhoto(file) {
  const meal = ADD ? ADD.meal : mealNow();
  openSheet(
    `${sh('Meal photo')}<div class="sheet-b"><div class="busy"><div class="spinner"></div>Looking at your plate</div></div>`,
  );
  const mine = sheets[sheets.length - 1];
  try {
    await ensureDB();
    const items = await matchAll(await aiParsePhoto([file]));
    if (!sheets.includes(mine)) return;
    closeSheet();
    if (!items.length) return toast('No food found in that photo.');
    openReview(items, {
      via: 'photo',
      meal,
      note: 'Portions from a photo are estimates. Adjust the grams if you weighed anything.',
    });
  } catch (e) {
    if (sheets.includes(mine)) closeSheet();
    toast(aiError(e));
  }
}

/* ---------- review parsed items ---------- */
let REV = null;
function openReview(items, opts = {}) {
  if (!opts.onDone) closeAll();
  items.forEach(it => {
    it.g0 = it.g;
  });
  REV = {
    items,
    via: opts.via,
    onDone: opts.onDone || null,
    note: opts.note || '',
    meal: items.find(i => i.meal)?.meal || opts.meal || mealNow(),
  };
  openSheet(
    `${sh(REV.onDone ? 'Check the ingredients' : 'Check and log')}<div class="sheet-b" id="revBody"></div><div class="sheet-f"><button class="btn ember" id="revGo" data-act="revGo"></button></div>`,
    true,
  );
  SEG.revMeal = v => (REV.meal = v);
  renderReview();
}
function renderReview() {
  const b = $('#revBody');
  if (!b) return;
  const anyEst = REV.items.some(i => i.food.src === 'AI');
  b.innerHTML = `${REV.onDone ? '' : segHtml('revMeal', Object.entries(MEALS), REV.meal)}
    <div class="card" style="padding:4px 14px">${
      REV.items
        .map(
          (
            it,
            i,
          ) => `<div class="rev"><div style="min-width:0"><div class="ell" style="font-weight:600">${esc(it.food.n)}</div>${it.food.b ? `<div class="small muted ell">${esc(it.food.b)}</div>` : ''}<div class="small muted row" style="gap:6px">${srcBadge(it.food.src)}<span class="tn" id="revK${i}">${fmt((it.food.k * it.g) / 100)} kcal</span>${it.amount ? `<span class="ell">${esc(it.amount)}</span>` : ''}</div><div class="row" style="gap:14px;margin-top:3px"><button class="link" style="font-size:13px" data-act="revAmt" data-i="${i}">Amount and unit</button><button class="link" style="font-size:13px" data-act="revSwap" data-i="${i}">Swap food</button></div></div>
      <label class="f" style="font-size:10px">${isLiquid(it.food) ? 'ml' : 'grams'}<input class="inp" inputmode="decimal" value="${it.g}" data-on="rev" data-i="${i}" aria-label="Amount of ${esc(it.food.n)}"></label><button class="icon-btn" data-act="revDel" data-i="${i}" aria-label="Remove">${ic('x')}</button></div>`,
        )
        .join('') || '<p class="empty" style="padding:12px 0">Nothing left to log.</p>'
    }</div>
    ${REV.note ? `<p class="small muted">${esc(REV.note)}</p>` : ''}
    ${anyEst ? `<div class="banner">${ic('spark')}<span>Items marked Estimate were not found in the database. Tap Swap food to pick a measured one instead.</span></div>` : ''}
    ${REV.items
      .filter(i => (i.food.src === 'AI' || i.food.src === 'AK') && i.food.b)
      .map(
        i =>
          `<div class="banner">${ic('search')}<span><b>${esc(i.food.b + ' ' + i.food.n)}</b> is not in the product list${i.food.src === 'AK' ? ", so these are the maker's figures as Ember AI remembers them" : ''}. <a href="https://www.google.com/search?q=${encodeURIComponent(i.food.b + ' ' + i.food.n + ' nutrition per 100g')}" target="_blank" rel="noopener">Check it online</a>, then say what to fix below or add it from its label.</span></div>`,
      )
      .join('')}
    ${AI.sample ? `<div class="row"><input class="inp" id="revFix" placeholder="Something wrong? Say what to fix" autocomplete="off"><button class="btn sm ghost" data-act="revFix">Fix</button></div>` : ''}`;
  revFoot();
}
function revFoot() {
  const k = REV.items.reduce((s, it) => s + (it.food.k * it.g) / 100, 0);
  const n = REV.items.length;
  const g = $('#revGo');
  g.disabled = !n;
  g.innerHTML = (REV.onDone ? 'Add ' : 'Log ') + n + (n === 1 ? ' item' : ' items') + ' · ' + fmt(k) + ' kcal';
}
I.rev = el => {
  const it = REV.items[+el.dataset.i];
  it.g = Math.max(0, num(el.value));
  $('#revK' + el.dataset.i).textContent = fmt((it.food.k * it.g) / 100) + ' kcal';
  revFoot();
};
A.revDel = ({ i }) => {
  REV.items.splice(+i, 1);
  renderReview();
};
A.revAmt = ({ i }) => {
  const it = REV.items[+i];
  openFood(it.food, {
    grams: it.g,
    depth: sheets.length,
    pick: (food, g, label) => {
      it.g = g;
      it.g0 = g;
      it.amount = String(label).replace(/ · [\d.,]+ (g|ml)$/, '');
      it.q = FD.qty;
      it.us = FD.units[FD.ui].short;
      it.sv = FD.sv;
      renderReview();
    },
  });
};
A.revSwap = ({ i }) => {
  const it = REV.items[+i];
  openAdd({
    title: 'Swap food',
    q: it.said || it.food.n,
    pick: (food, g) => {
      it.food = food;
      it.g = g;
      renderReview();
    },
  });
};
A.revGo = () => {
  const items = REV.items.filter(it => it.g > 0);
  if (!items.length) return;
  const es = items.map(it => ({
    ...portion(it.food, it.g),
    m: REV.meal,
    u:
      (it.amount && it.g === it.g0 && !/^[\d.,]+ (g|ml)$/.test(it.amount) ? it.amount + ' · ' : '') +
      it.g +
      (isLiquid(it.food) ? ' ml' : ' g'),
    ...(it.us && it.g === it.g0 ? { q: it.q, us: it.us, sv: it.sv || 1 } : {}),
  }));
  items.forEach(it => {
    if (it.food.src !== 'AI' && it.food.src !== 'AK')
      if (it.us && it.g === it.g0) remember(it.food, it.q, it.us, REV.onDone ? null : REV.meal, it.sv || 1);
      else remember(it.food, it.g, 'g', REV.onDone ? null : REV.meal);
  });
  if (REV.onDone) {
    const fn = REV.onDone;
    closeSheet();
    return fn(es);
  }
  logEntries(es, REV.via);
};

/* ---------- barcode ---------- */
/* The barcode sheet opens with the camera already scanning. The number field and the photo option stay
   underneath for when the camera is refused, missing, or the bars will not read. */
let bcStop = null;
A.barcode = () => {
  openSheet(`${sh('Find by barcode')}<div class="sheet-b"><div class="scan" id="bcScan"><video id="bcVideo" muted playsinline></video><span class="scan-line"></span></div><p class="small muted" id="bcHint">Point the camera at the barcode.</p>
    <label class="f">Number under the bars<input class="inp" id="bcNum" inputmode="numeric" placeholder="5099801003339" autocomplete="off"></label>
    <button class="btn" data-act="bcFind">${ic('search')} Find product</button><button class="btn ghost" data-act="bcPhoto">${ic('camera')} Read it from a photo</button><div id="bcOut"></div></div>`);
  sheets[sheets.length - 1]._onClose = bcScanStop;
  A.bcScan();
};
function bcScanStop() {
  if (bcStop) bcStop();
  bcStop = null;
}
A.bcScan = async () => {
  bcScanStop();
  const box = $('#bcScan'),
    hint = $('#bcHint');
  if (!box) return;
  box.classList.remove('hide');
  hint.textContent = 'Point the camera at the barcode.';
  if ($('#bcOut')) $('#bcOut').innerHTML = '';
  try {
    const stop = await startScanner(/** @type {HTMLVideoElement} */ ($('#bcVideo')), code => {
      bcStop = null;
      if (!$('#bcNum')) return;
      if (navigator.vibrate) navigator.vibrate(40);
      $('#bcScan').classList.add('hide');
      $('#bcHint').innerHTML = `Read ${esc(code)}. <button class="link" data-act="bcScan">Scan again</button>`;
      $('#bcNum').value = code;
      A.bcFind();
    });
    // the sheet may have been closed while the camera was opening
    if ($('#bcVideo')) bcStop = stop;
    else stop();
  } catch (e) {
    if (!$('#bcScan')) return;
    $('#bcScan').classList.add('hide');
    $('#bcHint').textContent =
      e && e.code === 'denied'
        ? 'The camera is switched off for Ember. Type the number under the bars, or read it from a photo.'
        : 'The camera could not be opened. Type the number under the bars, or read it from a photo.';
  }
};
document.addEventListener('visibilitychange', () => {
  // do not keep the camera running behind a locked phone or another app
  if (document.hidden && bcStop) {
    bcScanStop();
    if ($('#bcHint')) $('#bcHint').innerHTML = `Paused. <button class="link" data-act="bcScan">Scan again</button>`;
    if ($('#bcScan')) $('#bcScan').classList.add('hide');
  }
});
A.bcPhoto = () => $('#fileCode').click();
A.bcFind = async () => {
  const code = ($('#bcNum').value || '').replace(/\D/g, '');
  const out = $('#bcOut');
  if (code.length < 6) return toast('Enter the full barcode number.');
  out.innerHTML = `<div class="busy"><div class="spinner"></div>Checking 115,000 products</div>`;
  let food = await findBarcode(code);
  if (!$('#bcOut')) return;
  if (!food && Store.durable) {
    // not in the lists shipped with the app: look it up online
    out.innerHTML = `<div class="busy"><div class="spinner"></div>Looking it up online</div>`;
    food = await findBarcodeOnline(code);
    if (!$('#bcOut')) return;
    if (food === 'unreachable') {
      out.innerHTML = `<div class="card stack"><b>Could not look that barcode up just now</b><span class="small muted">Check your connection and try again, or add it from its label.</span><button class="btn sm" data-act="bcFind">Try again</button><button class="btn sm ghost" data-act="newFood" data-code="${code}">${ic('plus')} Add this product</button></div>`;
      return;
    }
  }
  if (food) {
    closeSheet();
    P.st.scan++;
    openFood(food, { via: 'scan' });
  } else
    out.innerHTML = `<div class="card stack"><b>That barcode is not in the database yet</b><span class="small muted">Add it once from its label and it will scan from then on.</span><button class="btn sm ghost" data-act="newFood" data-code="${code}">${ic('plus')} Add this product</button></div>`;
};
async function onCodePhoto(file) {
  const out = $('#bcOut');
  if (out) out.innerHTML = `<div class="busy"><div class="spinner"></div>Reading the barcode</div>`;
  const code = await decodeBarcode(file);
  if (!$('#bcNum')) return;
  if (!code) {
    out.innerHTML = '';
    return toast('No barcode found in that photo. Type the number under the bars.');
  }
  $('#bcNum').value = code;
  A.bcFind();
}

/* ---------- quick add ---------- */
A.quick = () => {
  const meal = ADD ? ADD.meal : mealNow();
  openSheet(`${sh('Quick add')}<div class="sheet-b"><label class="f">Calories<input class="inp" id="qaK" inputmode="numeric" placeholder="350"></label>
    <div class="grid3"><label class="f">Protein g<input class="inp" id="qaP" inputmode="decimal"></label><label class="f">Carbs g<input class="inp" id="qaC" inputmode="decimal"></label><label class="f">Fat g<input class="inp" id="qaF" inputmode="decimal"></label></div>
    <label class="f">Note<input class="inp" id="qaN" placeholder="Lunch out" autocomplete="off"></label>${segHtml('qaMeal', Object.entries(MEALS), meal)}</div><div class="sheet-f"><button class="btn ember" data-act="quickGo">${ic('plus')} Log</button></div>`);
  let m = meal;
  SEG.qaMeal = v => (m = v);
  A.quickGo = () => {
    const k = r0(num($('#qaK').value));
    if (k <= 0) return toast('Enter the calories.');
    logEntries([
      {
        n: $('#qaN').value.trim() || 'Quick add',
        b: '',
        g: 0,
        k,
        p: r1(num($('#qaP').value)),
        c: r1(num($('#qaC').value)),
        f: r1(num($('#qaF').value)),
        fi: 0,
        su: 0,
        sf: 0,
        na: 0,
        src: 'Q',
        m,
        u: '',
      },
    ]);
  };
  $('#qaK').focus();
};

/* ---------- recipes ---------- */
let RE = null;
A.newRecipe = () => {
  closeAll();
  openRecipe({ id: '', n: '', sv: 2, items: [] });
};
A.openRecipes = () => {
  const rs = Object.values(S.recipes);
  openSheet(
    `${sh('Recipes and saved meals')}<div class="sheet-b"><button class="btn" data-act="newRecipe">${ic('plus')} New recipe</button>${recipeLinkOn() ? `<button class="btn ghost" data-act="newRecipeLink">${ic('link')} Recipe from a link</button>` : ''}
    ${
      rs.length
        ? `<div class="list">${rs
            .map(r => {
              const f = recipeFood(r);
              return `<button class="res" data-act="editRecipe" data-id="${r.id}"><span class="n">${esc(r.n)}</span><span class="k">${fmt(f.per.k)}</span><span class="s">kcal per serving · makes ${r.sv} · ${r.items.length} ingredient${r.items.length === 1 ? '' : 's'}</span></button>`;
            })
            .join('')}</div>`
        : `<p class="empty">No recipes yet. Add the ingredients once and Ember works out each serving.</p>`
    }</div>`,
    true,
  );
};
A.editRecipe = ({ id }) => {
  closeAll();
  openRecipe(clone(S.recipes[id]));
};
function openRecipe(r) {
  RE = r;
  openSheet(
    `${sh(r.id ? 'Edit recipe' : 'New recipe')}<div class="sheet-b" id="reBody"></div><div class="sheet-f">${r.id ? `<button class="btn ghost" style="width:auto" data-act="delRecipe" aria-label="Delete recipe">${ic('trash')}</button>` : ''}<button class="btn" data-act="saveRecipe">Save recipe</button></div>`,
    true,
  );
  renderRecipe();
}
function renderRecipe() {
  const b = $('#reBody');
  if (!b) return;
  const t = recipeTotals(RE),
    sv = RE.sv || 1;
  b.innerHTML = `<label class="f">Name<input class="inp" id="reName" value="${esc(RE.n)}" placeholder="Chicken curry" autocomplete="off" data-on="reName"></label>
    <label class="f">Servings it makes<input class="inp" id="reSv" inputmode="decimal" value="${RE.sv}" data-on="reSv"></label>
    <div class="card"><div class="between"><h2>Ingredients</h2><span class="muted small tn">${fmt(t.g)} g in total</span></div>
      ${RE.items.map((it, i) => `<div class="entry" style="grid-template-columns:1fr auto auto;align-items:center"><span class="n">${esc(it.n)}</span><span class="k">${fmt(it.k)}</span><button class="icon-btn" data-act="reDel" data-i="${i}" aria-label="Remove ${esc(it.n)}">${ic('x')}</button><span class="s">${srcBadge(it.src)}${esc(it.g + ' g')}</span></div>`).join('') || '<p class="empty">No ingredients yet.</p>'}
      <button class="addline" data-act="reAdd">${ic('plus')} Add an ingredient</button><button class="addline" data-act="reSay" style="border-top:0;margin-top:0">${ic('mic')} Describe the ingredients</button>${recipeLinkOn() ? `<button class="addline" data-act="reLink" style="border-top:0;margin-top:0">${ic('link')} Import from a link</button>` : ''}${recipeFromLine(RE)}</div>
    <div class="card"><h2>Per serving</h2><div class="row" style="align-items:baseline;gap:8px;margin-top:8px"><span class="num bigk" id="rePerK">${fmt(t.k / sv)}</span><span class="muted">kcal</span></div><div class="grid3 small" style="margin-top:8px" id="rePer"><span><b>${r1(t.p / sv)} g</b> protein</span><span><b>${r1(t.c / sv)} g</b> carbs</span><span><b>${r1(t.f / sv)} g</b> fat</span></div></div>${RE.how ? `<div class="card"><h2>Method</h2><div class="cook">${esc(RE.how)}</div></div>` : ''}`;
}
I.reName = el => (RE.n = el.value);
I.reSv = el => {
  RE.sv = Math.max(0.25, num(el.value, 1));
  const t = recipeTotals(RE);
  $('#rePerK').textContent = fmt(t.k / RE.sv);
  $('#rePer').innerHTML =
    `<span><b>${r1(t.p / RE.sv)} g</b> protein</span><span><b>${r1(t.c / RE.sv)} g</b> carbs</span><span><b>${r1(t.f / RE.sv)} g</b> fat</span>`;
};
A.reDel = ({ i }) => {
  RE.items.splice(+i, 1);
  renderRecipe();
};
A.reAdd = () =>
  openAdd({
    title: 'Add an ingredient',
    pick: (food, g) => {
      RE.items.push(portion(food, g));
      renderRecipe();
    },
  });
A.reSay = () =>
  openSay({
    title: 'Describe the ingredients',
    onDone: es => {
      es.forEach(e => {
        delete e.m;
        delete e.u;
        RE.items.push(e);
      });
      renderRecipe();
    },
  });
A.saveRecipe = () => {
  if (!RE.n.trim()) return toast('Give the recipe a name.');
  if (!RE.items.length) return toast('Add at least one ingredient.');
  const isNew = !RE.id;
  if (isNew) RE.id = newId();
  RE.n = RE.n.trim();
  RE.sv = Math.max(0.25, num(RE.sv, 1));
  S.recipes[RE.id] = clone(RE);
  Store.put('recipes', RE.id, RE);
  closeAll();
  if (isNew) grant(15, 0, null, 'Recipe saved');
  else toast('Recipe saved');
  checkAch();
  saveProfile();
  render();
  flushCele();
};
A.delRecipe = () => {
  delete S.recipes[RE.id];
  Store.del('recipes', RE.id);
  P.rec = P.rec.filter(r => r.id !== 'r' + RE.id);
  saveProfile();
  closeAll();
  render();
  toast('Recipe deleted');
};

/* ---------- my foods ---------- */
let CF = null;
A.openFoods = () => {
  const fs = Object.values(S.foods);
  openSheet(
    `${sh('My foods')}<div class="sheet-b"><button class="btn" data-act="newFood">${ic('plus')} New food</button>
    ${fs.length ? `<div class="list">${fs.map(c => `<button class="res" data-act="editFood" data-id="${c.id}"><span class="n">${esc(c.n)}</span><span class="k">${fmt(c.k)}</span><span class="s">${esc([c.b, c.nog ? 'kcal per serving' : 'kcal per 100 g'].filter(Boolean).join(' · '))}</span></button>`).join('')}</div>` : `<p class="empty">Nothing saved yet. Add a product from its label and it becomes searchable and scannable.</p>`}</div>`,
    true,
  );
};
A.newFood = ({ code }) => openFoodForm({ id: '', n: ADD && ADD.q ? ADD.q : '', b: '', code: code || '', mode: '100' });
A.editFood = ({ id }) => {
  const c = S.foods[id],
    sv = (c.ports || []).find(x => x[0] !== '1 pack'),
    pk = (c.ports || []).find(x => x[0] === '1 pack');
  openFoodForm({
    ...clone(c),
    mode: c.nog ? 'sv' : '100',
    salt: c.na != null ? Math.round((c.na * 2.5) / 10) / 100 : '',
    svg: c.nog || !sv ? '' : sv[1],
    svn: sv && sv[0] !== '1 serving' ? sv[0] : '',
    pkg: pk ? pk[1] : '',
  });
};
function openFoodForm(c) {
  CF = c;
  const v = k => c[k] ?? '';
  openSheet(
    `${sh(c.id ? 'Edit food' : 'New food')}<div class="sheet-b">
    ${AI.sample && AI.images ? `<button class="btn ghost" data-act="labelPhoto">${ic('label')} Fill in from a photo of the label</button>` : ''}
    <label class="f">Name<input class="inp" id="cfN" value="${esc(v('n'))}" autocomplete="off"></label><label class="f">Brand, optional<input class="inp" id="cfB" value="${esc(v('b'))}" autocomplete="off"></label>
    <div><div class="tiny muted" style="font-weight:700;margin-bottom:5px">Values on the label are per</div>${segHtml(
      'cfMode',
      [
        ['100', '100 g or ml'],
        ['sv', 'Serving'],
      ],
      c.mode,
    )}</div>
    <div class="grid4"><label class="f">kcal<input class="inp" id="cfK" inputmode="decimal" value="${v('k')}"></label><label class="f">Protein<input class="inp" id="cfP" inputmode="decimal" value="${v('p')}"></label><label class="f">Carbs<input class="inp" id="cfC" inputmode="decimal" value="${v('c')}"></label><label class="f">Fat<input class="inp" id="cfF" inputmode="decimal" value="${v('f')}"></label></div>
    <div class="grid4"><label class="f">Sugars<input class="inp" id="cfSu" inputmode="decimal" value="${v('su')}"></label><label class="f">Saturates<input class="inp" id="cfSf" inputmode="decimal" value="${v('sf')}"></label><label class="f">Fibre<input class="inp" id="cfFi" inputmode="decimal" value="${v('fi')}"></label><label class="f">Salt g<input class="inp" id="cfSalt" inputmode="decimal" value="${v('salt')}"></label></div>
    <div><div class="tiny muted" style="font-weight:700;margin-bottom:5px">Quantities</div>${segHtml(
      'cfLiq',
      [
        ['g', 'Weighed in g'],
        ['ml', 'Poured in ml'],
      ],
      c.liq ? 'ml' : 'g',
    )}</div>
    <div class="grid2"><label class="f">One serving is called<input class="inp" id="cfSvN" value="${esc(v('svn'))}" placeholder="1 bar, 1 slice, 1 scoop" autocomplete="off"></label><label class="f">and weighs, g or ml<input class="inp" id="cfSv" inputmode="decimal" value="${v('svg')}"></label></div>
    <div class="grid2"><label class="f">Whole pack, g or ml, optional<input class="inp" id="cfPk" inputmode="decimal" value="${v('pkg')}"></label><label class="f">Barcode, optional<input class="inp" id="cfCode" inputmode="numeric" value="${esc(v('code'))}"></label></div>
    <p class="small muted">The serving and the pack become units you can pick when logging, next to g, kg and oz.</p>
  </div><div class="sheet-f">${c.id ? `<button class="btn ghost" style="width:auto" data-act="delFood" aria-label="Delete food">${ic('trash')}</button>` : ''}<button class="btn" data-act="saveFood">Save food</button></div>`,
    true,
  );
  SEG.cfMode = m => (CF.mode = m);
  SEG.cfLiq = m => (CF.liq = m === 'ml');
}
A.labelPhoto = () => $('#fileLabel').click();
async function onLabel(file) {
  toast('Reading the label…');
  try {
    const r = await aiReadLabel(file);
    if (!$('#cfN')) return;
    if (!r || r.readable === false || r.kcal == null)
      return toast('The label was not readable. Try a sharper, straight-on photo.');
    const set = (id, val) => {
      if (val != null && val !== '') $(id).value = val;
    };
    if (!$('#cfN').value) set('#cfN', r.name);
    if (!$('#cfB').value) set('#cfB', r.brand);
    set('#cfK', r0(r.kcal));
    set('#cfP', r.p);
    set('#cfC', r.c);
    set('#cfF', r.f);
    set('#cfSu', r.su);
    set('#cfSf', r.sf);
    set('#cfFi', r.fi);
    set('#cfSalt', r.salt);
    set('#cfSv', r.serving_g);
    CF.mode = r.basis === 'serving' ? 'sv' : '100';
    $$('[data-seg="cfMode"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.val === CF.mode));
    if (SEG.cfMode) SEG.cfMode(CF.mode);
    toast('Label read. Check the numbers against the pack.');
  } catch (e) {
    toast(aiError(e));
  }
}
A.saveFood = () => {
  const n = $('#cfN').value.trim();
  if (!n) return toast('Give the food a name.');
  const g = id => {
    const v = $(id).value.trim();
    return v === '' ? null : Math.max(0, num(v));
  };
  let k = g('#cfK'),
    p = g('#cfP') || 0,
    c = g('#cfC') || 0,
    f = g('#cfF') || 0,
    su = g('#cfSu'),
    sf = g('#cfSf'),
    fi = g('#cfFi') || 0,
    salt = g('#cfSalt');
  const sv = g('#cfSv');
  if (k == null) return toast('Enter the calories.');
  let ports = [],
    nog = false;
  const pk = g('#cfPk');
  let svn = $('#cfSvN').value.trim().slice(0, 40) || '1 serving';
  if (/^[a-z]/i.test(svn)) svn = '1 ' + svn;
  if (CF.mode === 'sv') {
    if (sv) {
      const m = 100 / sv;
      k *= m;
      p *= m;
      c *= m;
      f *= m;
      fi *= m;
      if (su != null) su *= m;
      if (sf != null) sf *= m;
      if (salt != null) salt *= m;
      ports = [[svn, sv]];
    } else {
      nog = true;
      ports = [[svn, 100]];
    }
  } else if (sv) ports = [[svn, sv]];
  if (pk && !nog && pk !== sv) ports.push(['1 pack', pk]);
  const est = 4 * p + 4 * c + 9 * f;
  if (est > 0 && Math.abs(k - est) > Math.max(30, est * 0.3) && !CF.warned) {
    CF.warned = true;
    const sb = topSheet().querySelector('[data-act="saveFood"]');
    if (sb) sb.textContent = 'Save anyway';
    return toast(
      'Those macros add up to about ' +
        r0(est) +
        ' kcal, not ' +
        r0(k) +
        '. Check the label, or save again to keep it.',
    );
  }
  const id = CF.id || newId();
  const rec = {
    id,
    n,
    b: $('#cfB').value.trim(),
    k: r0(k),
    p: r1(p),
    c: r1(c),
    f: r1(f),
    fi: r1(fi),
    su: su == null ? null : r1(su),
    sf: sf == null ? null : r1(sf),
    na: salt == null ? null : r0(salt * 400),
    ports,
    code: $('#cfCode').value.replace(/\D/g, ''),
    nog,
    ...(CF.liq != null ? { liq: !!CF.liq } : {}),
  };
  S.foods[id] = rec;
  Store.put('foods', id, rec);
  const fresh = !CF.id;
  closeSheet();
  toast('Food saved');
  if (fresh && sheets.length && $('#bcOut')) {
    closeSheet();
    openFood(customFood(rec));
  } else if (fresh && ADD && $('#addList')) openFood(customFood(rec));
  else {
    if (sheets.length) {
      closeSheet();
      A.openFoods();
    }
    render();
  }
};
A.delFood = () => {
  delete S.foods[CF.id];
  Store.del('foods', CF.id);
  closeAll();
  A.openFoods();
  render();
  toast('Food deleted');
};

/* ---------- weight ---------- */
A.addWeight = () => {
  const last = P.wts.length ? P.wts[P.wts.length - 1].kg : P.kg;
  openSheet(
    `${sh('Weigh-in')}<div class="sheet-b"><div class="grid2"><label class="f">Weight in kg<input class="inp" id="wtKg" inputmode="decimal" value="${last}"></label><label class="f">Date<input class="inp" id="wtD" type="date" value="${today()}" max="${today()}"></label></div><p class="small muted">Weigh at the same time of day for a cleaner trend. First thing in the morning works well.</p></div><div class="sheet-f"><button class="btn" data-act="saveWeight">Save weigh-in</button></div>`,
  );
};
A.saveWeight = async () => {
  const kg = r1(num($('#wtKg').value)),
    d = $('#wtD').value || today();
  if (kg < 25 || kg > 400) return toast('Enter a weight in kilograms.');
  const had = P.wts.some(w => w.d === d);
  P.wts = P.wts
    .filter(w => w.d !== d)
    .concat([{ d, kg }])
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .slice(-1500);
  P.kg = P.wts[P.wts.length - 1].kg;
  closeSheet();
  if (!had) {
    P.st.weigh++;
    grant(10, 0, d === today() ? await loadDay(d) : null, 'Weigh-in');
  } else toast('Weigh-in updated');
  commitDay(await loadDay(today()));
};
A.delWeight = ({ date }) => {
  P.wts = P.wts.filter(w => w.d !== date);
  saveProfile();
  render();
  toast('Weigh-in removed');
};
A.buyFreeze = () => {
  if (P.gems < 50 || P.fr >= 2) return;
  P.gems -= 50;
  P.fr++;
  saveProfile();
  render();
  toast('Streak freeze added');
};

/* ---------- targets + onboarding ---------- */
let TG = null;
const ACTS = [
  [1.2, 'Mostly sitting'],
  [1.375, 'Lightly active, 1 to 3 sessions a week'],
  [1.55, 'Active, 3 to 5 sessions a week'],
  [1.725, 'Very active, most days'],
];
const RATES = {
  lose: [
    [0.25, 'Gently, 0.25 kg a week'],
    [0.5, 'Steadily, 0.5 kg a week'],
    [0.75, 'Faster, 0.75 kg a week'],
  ],
  gain: [
    [0.25, 'Lean, 0.25 kg a week'],
    [0.5, 'Faster, 0.5 kg a week'],
  ],
};
A.openTargets = () => openTargets(false);
function openTargets(first) {
  TG = {
    first,
    sex: P.sex,
    age: P.age,
    cm: P.cm,
    kg: P.kg,
    act: P.act,
    goal: P.goal,
    rate: P.rate,
    exAdd: P.exAdd,
    t: { ...P.t },
    orig: { ...P.t },
    auto: first,
  };
  // a new person starts with an empty form: targets worked out from made-up details would be wrong for nearly everyone
  if (first) Object.assign(TG, { sex: '', age: 0, cm: 0, kg: 0, t: { k: 0, p: 0, c: 0, f: 0, w: 0 } });
  // the date of birth given with the health consent sets the age, so it is not asked for again
  if (P.dob && ageOn(P.dob, today()) >= MIN_AGE) TG.age = ageOn(P.dob, today());
  openSheet(
    `<div class="sheet-h"><h3>${first ? 'Set your daily targets' : 'Targets and profile'}</h3>${first ? '' : `<button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button>`}</div><div class="sheet-b" id="tgBody"></div><div class="sheet-f"><button class="btn ${first ? 'ember' : ''}" data-act="saveTargets">${first ? 'Start tracking' : 'Save'}</button></div>`,
    true,
  );
  if (first) sheets[sheets.length - 1]._locked = true;
  renderTargets();
  SEG.tgSex = v => {
    TG.sex = v;
    tgRecalc(false, true);
  };
  SEG.tgGoal = v => {
    TG.goal = v;
    if (v !== 'keep' && !RATES[v].some(r => r[0] === TG.rate)) TG.rate = RATES[v][v === 'lose' ? 1 : 0][0];
    tgRecalc(true, true);
  };
  SEG.tgEx = v => (TG.exAdd = v === '1');
}
function renderTargets() {
  const b = $('#tgBody');
  if (!b) return;
  const why = t => `<small class="muted tg-why">${t}</small>`,
    age = P.dob
      ? ''
      : `<label class="f">Age<input class="inp" inputmode="numeric" value="${TG.age || ''}" placeholder="34" data-on="tg" data-k="age"></label>`;
  b.innerHTML = `${TG.first ? `<p class="muted">A few quick details and Ember works out a calorie and macro target. You can change any of it later.</p>` : ''}
    <div class="f">Your goal${segHtml(
      'tgGoal',
      [
        ['lose', 'Lose weight'],
        ['keep', 'Maintain'],
        ['gain', 'Gain'],
      ],
      tgGoal(),
    )}</div>
    <div class="f">Sex${segHtml(
      'tgSex',
      [
        ['m', 'Male'],
        ['f', 'Female'],
      ],
      TG.sex,
    )}${why('The calorie formula is different for each.')}</div>
    <div class="${age ? 'grid3' : 'two'}">${age}<label class="f">Height cm<input class="inp" inputmode="decimal" value="${TG.cm || ''}" placeholder="175" data-on="tg" data-k="cm"></label><label class="f">Weight kg<input class="inp" inputmode="decimal" value="${TG.kg || ''}" placeholder="78" data-on="tg" data-k="kg"></label></div>
    ${P.dob ? `<p class="tiny muted" style="margin-top:-6px">Age ${TG.age}, from your date of birth.</p>` : ''}
    <label class="f">Activity<select class="inp" data-on="tgSel" data-k="act">${ACTS.map(a => `<option value="${a[0]}" ${a[0] === TG.act ? 'selected' : ''}>${a[1]}</option>`).join('')}</select>${why('How much you move sets how much you burn.')}</label>
    ${tgGoal() !== 'keep' ? `<label class="f">Pace<select class="inp" data-on="tgSel" data-k="rate">${RATES[tgGoal()].map(a => `<option value="${a[0]}" ${a[0] === TG.rate ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></label>` : ''}
    <div id="tgCard">${tgCard()}</div>
    <div><div class="tiny muted" style="font-weight:700;margin-bottom:5px">Exercise calories</div>${segHtml(
      'tgEx',
      [
        ['1', 'Add to my budget'],
        ['0', 'Record only'],
      ],
      TG.exAdd ? '1' : '0',
    )}</div>`;
}
/* Ember does not set a weight-loss target for someone at or under a healthy weight for their height: the goal
   becomes holding steady, and the card says why and where to find support. */
const tgLow = () => TG.goal === 'lose' && TG.cm >= 120 && TG.kg >= 30 && !canLose(TG.kg, TG.cm);
const tgGoal = () => (tgLow() ? 'keep' : TG.goal);
const LOW_HELP =
  'If food or your weight is on your mind a lot, Bodywhys (Ireland) and Beat (UK) can help, and so can your GP.';
/* The targets card. Changing anything about you above recalculates it straight away; the old figures stay on show with a way back until you save. */
function tgCard() {
  if (TG.first && !tgReady())
    return `<div class="card"><p class="small muted">Your calorie and macro targets appear here once the details above are in.</p></div>`;
  const s = calcTargets({ ...TG, goal: tgGoal() }),
    o = TG.orig,
    t = TG.t,
    changed = !TG.first && ['k', 'p', 'c', 'f', 'w'].some(k => (t[k] || 0) !== (o[k] || 0)),
    gap = r0(s.tdee - t.k);
  let pace =
    'You burn about ' +
    fmt(s.tdee) +
    ' kcal a day. ' +
    (Math.abs(gap) < 40
      ? 'This target holds your weight steady.'
      : 'This target is ' +
        fmt(Math.abs(gap)) +
        ' kcal ' +
        (gap > 0 ? 'below' : 'above') +
        ' that, about ' +
        r1(Math.abs(gap) / 1100) +
        ' kg a week ' +
        (gap > 0 ? 'down' : 'up') +
        '.');
  if (Math.abs(gap) >= 40) pace += ' Results vary from person to person.';
  // with a goal weight set: how far off it is at this pace, as a number of weeks and never as a date
  if (
    !TG.first &&
    P.goalKg &&
    Math.abs(gap) >= 40 &&
    P.goalKg < TG.kg === gap > 0 &&
    Math.abs(P.goalKg - TG.kg) > 0.2
  ) {
    const wks = Math.abs(P.goalKg - TG.kg) / (Math.abs(gap) / 1100);
    if (wks < 200)
      pace += ' At that pace ' + P.goalKg + ' kg is roughly ' + Math.max(1, Math.round(wks)) + ' weeks away.';
  }
  const was = (k, u) =>
    changed && (t[k] || 0) !== (o[k] || 0) ? `<small class="was tn">was ${fmt(o[k] || 0)}${u}</small>` : '';
  return `<div class="card stack ${changed ? 'chg' : ''}"><div class="between"><h2>Daily targets</h2>${TG.auto ? `<span class="pill" title="Worked out from a standard formula, not measured">Estimate</span>` : `<button class="link" data-act="tgSuggest">Work them out for me</button>`}</div>
      ${tgLow() ? `<div class="banner">${ic('label')}<span>At your height and weight Ember does not set a weight-loss target, so this one holds your weight steady. ${LOW_HELP}</span></div>` : ''}
      ${changed ? `<div class="tg-chg"><span>${TG.auto ? 'Updated to match your details.' : 'Changed.'} Before: <b class="tn">${fmt(o.k)} kcal</b>, ${o.p} g protein.</span><button class="btn sm ghost" data-act="tgRevert">${ic('undo')} Keep the old ones</button></div>` : ''}
      <p class="small muted" id="tgNote">${pace}${s.floored && TG.auto ? ' It is held at a sensible minimum rather than going lower.' : ''}</p>
      <label class="f">Calories ${was('k', '')}<input class="inp" inputmode="numeric" id="tgK" value="${t.k}" data-on="tgT" data-k="k"></label>
      <div class="grid3"><label class="f">Protein g ${was('p', '')}<input class="inp" inputmode="numeric" id="tgP" value="${t.p}" data-on="tgT" data-k="p"></label><label class="f">Carbs g ${was('c', '')}<input class="inp" inputmode="numeric" id="tgC" value="${t.c}" data-on="tgT" data-k="c"></label><label class="f">Fat g ${was('f', '')}<input class="inp" inputmode="numeric" id="tgF" value="${t.f}" data-on="tgT" data-k="f"></label></div>
      <label class="f">Water ml ${was('w', '')}<input class="inp" inputmode="numeric" id="tgW" value="${t.w}" data-on="tgT" data-k="w"></label></div>`;
}
/* touched: something about the person changed, so the targets follow it */
const tgReady = () => !!TG.sex && TG.age >= MIN_AGE && TG.cm >= 120 && TG.kg >= 30;
function tgRecalc(full, touched) {
  if (touched) TG.auto = true;
  if (TG.auto && tgReady()) {
    const s = calcTargets({ ...TG, goal: tgGoal() });
    TG.t = { k: s.k, p: s.p, c: s.c, f: s.f, w: s.w };
  }
  if (full) return renderTargets();
  const c = $('#tgCard');
  if (c) c.innerHTML = tgCard();
  tgSaveLabel();
}
function tgSaveLabel() {
  const b = topSheet() && topSheet().querySelector('[data-act="saveTargets"]');
  if (b && !TG.first)
    b.textContent = ['k', 'p', 'c', 'f', 'w'].some(k => (TG.t[k] || 0) !== (TG.orig[k] || 0))
      ? 'Save new targets'
      : 'Save';
}
I.tg = el => {
  const v = num(el.value, NaN);
  if (!(v > 0)) {
    if (TG.first) TG[el.dataset.k] = 0;
    return;
  }
  TG[el.dataset.k] = v;
  tgRecalc(false, true);
};
I.tgSel = el => {
  TG[el.dataset.k] = num(el.value);
  tgRecalc(false, true);
};
/* typing a target yourself: keep the cursor where it is, refresh only the note and the old-value hints on blur */
I.tgT = el => {
  TG.t[el.dataset.k] = r0(num(el.value));
  TG.auto = false;
  tgSaveLabel();
  clearTimeout(TG.tm);
  TG.tm = setTimeout(() => {
    if (TG && $('#tgCard') && document.activeElement && !document.activeElement.closest('#tgCard'))
      $('#tgCard').innerHTML = tgCard();
  }, 900);
};
document.addEventListener('focusout', e => {
  if (TG && /** @type {HTMLElement} */ (e.target).closest && /** @type {HTMLElement} */ (e.target).closest('#tgCard'))
    setTimeout(() => {
      if (TG && $('#tgCard') && !(document.activeElement && document.activeElement.closest('#tgCard')))
        $('#tgCard').innerHTML = tgCard();
    }, 60);
});
A.tgSuggest = () => {
  tgRecalc(false, true);
};
A.tgRevert = () => {
  TG.auto = false;
  TG.t = { ...TG.orig };
  const c = $('#tgCard');
  if (c) c.innerHTML = tgCard();
  tgSaveLabel();
  toast('Old targets kept. Your details above are still changed.');
};
let tgPrev = null;
A.tgUndo = () => {
  if (!tgPrev) return;
  Object.assign(P, tgPrev);
  tgPrev = null;
  saveProfile();
  render();
  toast('Back to how it was');
};
A.saveTargets = () => {
  if (!TG.sex) return toast('Choose male or female: it changes the sum.');
  if (!(TG.age >= 0)) return toast('Enter your age.');
  if (TG.age < MIN_AGE) return toast('Ember sets targets for people aged ' + MIN_AGE + ' and over.');
  if (!(TG.age <= 110)) return toast('Enter your age.');
  if (!(TG.cm >= 120 && TG.cm <= 230)) return toast('Enter your height in centimetres.');
  if (!(TG.kg >= 30 && TG.kg <= 300)) return toast('Enter your weight in kilograms.');
  const floor = kcalFloor(TG.sex);
  if (!(TG.t.k <= 6000)) return toast('Set a calorie target of 6,000 or less.');
  if (!(TG.t.k >= floor))
    return toast(
      'Ember does not set a target below ' + fmt(floor) + ' kcal a day. Lower than that needs a doctor or dietitian.',
    );
  const first = TG.first;
  tgPrev = first
    ? null
    : {
        sex: P.sex,
        age: P.age,
        cm: P.cm,
        kg: P.kg,
        act: P.act,
        goal: P.goal,
        rate: P.rate,
        exAdd: P.exAdd,
        t: { ...P.t },
      };
  Object.assign(P, {
    sex: TG.sex,
    age: TG.age,
    cm: TG.cm,
    kg: TG.kg,
    act: TG.act,
    goal: tgGoal(),
    rate: TG.rate,
    exAdd: TG.exAdd,
    t: { k: TG.t.k, p: TG.t.p || 0, c: TG.t.c || 0, f: TG.t.f || 0, w: TG.t.w || 2000 },
    onboarded: true,
  });
  if (first && !P.wts.length) P.wts.push({ d: today(), kg: r1(TG.kg) });
  saveProfile();
  closeAll();
  render();
  if (first && guided()) return obAfterTargets();
  if (first) {
    celeQ.push({
      icon: 'flame',
      fill: true,
      tone: 'ember',
      title: 'You are set',
      sub: fmt(P.t.k) + ' kcal a day. Log your first food to light your streak. Tap the orange button to start.',
      rewards: ['1 streak freeze to begin with'],
    });
    flushCele();
  } else toast('Saved: ' + fmt(P.t.k) + ' kcal a day', '', { act: 'tgUndo', label: 'Undo' });
};

/* ---------- data + sources ---------- */
A.openData = () => {
  const cnt = k => (DB[k] ? fmt(DB[k].length) : DB.st[k] === 'loading' ? 'loading' : 'not loaded yet');
  openSheet(
    `${sh('Data and sources')}<div class="sheet-b">
    <div class="card stack"><h2>Your diary</h2><p class="small">${Store.mode === 'cloud' ? 'Saved to your account as you go, private to you, and available on any device where you sign in.' : 'Saved on this device only. Sign in to keep your diary safe and use it on your other devices.'}</p>${Store.account ? `<p class="small muted">Signed in as ${esc(Store.account)}</p>` : ''}${consentRows()}${Store.mode !== 'cloud' && authConfigured() ? `<button class="btn" data-act="signIn">Sign in</button>` : ''}<button class="btn ghost" data-act="copyData">${ic('copy')} Copy my data as JSON</button><div class="f">Download as a spreadsheet (CSV)<div class="opts"><button data-act="exportCsv" data-what="diary">Food diary</button><button data-act="exportCsv" data-what="weights">Weigh-ins</button><button data-act="exportCsv" data-what="sessions">Training</button></div></div>${Store.account ? `<button class="btn ghost" data-act="setPassword">Set or change your password</button><button class="btn ghost" data-act="signOut">Sign out</button><button class="link" data-act="deleteAccount" style="color:var(--bad);align-self:center">Delete my account</button>` : ''}<p class="small muted" style="text-align:center"><a class="link" href="./privacy.html" target="_blank" rel="noopener">Privacy policy</a> · <a class="link" href="./terms.html" target="_blank" rel="noopener">Terms</a></p></div>
    <div class="card stack"><h2>Food database</h2><div class="kv small"><span>Everyday foods, UK food tables and USDA FoodData Central</span><b>${cnt('gen')}</b><span>Branded products, Ireland and UK first</span><b>${cnt('br')}</b><span>More branded products</span><b>${cnt('more')}</b></div><p class="tiny muted">UK figures are from McCance and Widdowson's Composition of Foods Integrated Dataset. Contains public sector information licensed under the Open Government Licence v3.0.</p>
      <p class="small muted">Everyday foods: U.S. Department of Agriculture, FoodData Central (Foundation Foods, FNDDS and SR Legacy), public domain. Branded products: <a href="https://world.openfoodfacts.org" class="link">Open Food Facts</a> contributors, Open Database Licence. Entries whose stated calories disagree with their macros by more than a fifth were left out.</p></div>
    <div class="card stack"><h2>Targets</h2><p class="small muted">Suggested calories use the Mifflin-St Jeor equation and your activity level. They are a starting point, not medical advice.</p></div></div>`,
    true,
  );
};
A.copyData = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(await exportAll(), null, 1));
    toast('Copied. Paste it anywhere to keep a backup.');
  } catch (e) {
    toast('Copying is blocked in this view.');
  }
};

/* ---------- boot ---------- */
$('#filePhoto').addEventListener('change', e => {
  const fs = [...e.target.files];
  e.target.value = '';
  if (fs.length) onPhotos(fs);
});
$('#fileLabel').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) onLabel(f);
});
$('#fileCode').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) onCodePhoto(f);
});
let lastSync = 0,
  lastDay = today();
function dayChecks() {
  const used = applyFreezes(),
    lg = rollLeague();
  if (used)
    celeQ.push({
      icon: 'snow',
      tone: 'ice',
      title: 'Streak saved',
      sub:
        used === 1
          ? 'A streak freeze covered the day you missed.'
          : used + ' streak freezes covered the days you missed.',
    });
  if (lg && (lg.xp > 0 || lg.from !== lg.to))
    celeQ.push(
      lg.to > lg.from
        ? {
            icon: 'trophy',
            title: 'Promoted to ' + LEAGUES[lg.to],
            sub: 'You earned ' + fmt(lg.xp) + ' XP last week.',
            confetti: true,
          }
        : lg.to < lg.from
          ? {
              icon: 'chart',
              title: 'Back to ' + LEAGUES[lg.to],
              sub: 'Last week came in under ' + STAY + ' XP. This week is a fresh start.',
            }
          : {
              icon: 'check',
              title: 'Holding ' + LEAGUES[lg.to],
              sub: 'You earned ' + fmt(lg.xp) + ' XP last week. ' + PROMO + ' moves you up.',
            },
    );
  const hadBoss = !!P.boss;
  checkBoss();
  if (used || lg || (hadBoss && !P.boss)) saveProfile();
}
let errorsWired = false;
async function boot() {
  const h = location.hash.slice(1);
  if (['today', 'train', 'progress', 'quests', 'you'].includes(h)) S.tab = h;
  await Store.init();
  if (mustSignIn()) return signInGate();
  try {
    await offerMove();
    const p = await Store.get('profile');
    P = p ? fixProfile(p) : defaultProfile();
    if (await consentGate()) return; // health information is agreed to before anything else is asked or shown
    const [rs, fs] = await Promise.all([Store.list('recipes'), Store.list('foods')]);
    rs.forEach(r => (S.recipes[r.id] = r));
    fs.forEach(f => (S.foods[f.id] = f));
    const [tr, ps] = await Promise.all([Store.get('meta', 'train'), Store.list('programs')]);
    TR = { ...defaultTR(), ...(tr || {}) };
    ps.forEach(p => (S.progs[p.id] = p));
    await loadCO();
    S.days = {};
    S.days[today()] = { ...newDay(today()), ...((await Store.get('days', today())) || {}) };
  } catch (e) {
    $('#main').innerHTML =
      `<div class="boot"><div class="busy">${ic('db')}<span>Your diary could not be reached.</span><button class="btn sm" data-act="retryBoot">Try again</button></div></div>`;
    return;
  }
  S.ready = true;
  lastSync = Date.now();
  lastDay = today();
  if (isCoach()) {
    S.tab = 'clients';
    if (needSeed()) seedSamples();
  }
  if (P.onboarded) dayChecks();
  render();
  if (!P.onboarded) openTargets(true);
  else flushCele();
  offerNewPassword();
  if (signInLinkFailed) toast('That sign-in link has expired or was already used. Ask for a new one.');
  if (Store.durable) setInterval(refresh, 8000); // another device's changes show within a few seconds
  recordConsent();
  if (Store.durable && !errorsWired) {
    // unexpected errors go to the project's own database, stripped of anything that could be diary content (errors.js)
    errorsWired = true;
    reportErrors({
      version: __APP_VERSION__,
      screen: () => S.tab,
      send: async row => {
        const { error } = await (await supabaseClient()).from('client_errors').insert(row);
        if (error) throw error;
      },
    });
  }
  initAI();
  loadDB('gen');
  pullAssign();
  publishStatus();
  publishSquad();
  loadCommunity();
  if (isCoach()) loadLive();
  if (P.onboarded) backfillUsage();
  loadGym().then(() => {
    if (!sheets.length) render();
  });
}
A.retryBoot = () => {
  $('#main').innerHTML =
    `<div class="boot"><div class="busy"><div class="spinner"></div>Opening your diary</div></div>`;
  boot();
};
async function refresh() {
  if (!S.ready || document.hidden || DEMO) return;
  cgLoad(); // links with a coach or clients: what they sent, what was set (at most every 20 seconds)
  if (today() !== lastDay) {
    const was = lastDay;
    lastDay = today();
    if (S.date === was) S.date = lastDay;
    await loadDay(S.date);
    await loadDay(lastDay);
    if (P.onboarded) dayChecks();
    if (!sheets.length) render();
    flushCele();
  }
  if (
    Store.mode === 'cloud' &&
    !Store.busy &&
    !sheets.length &&
    Date.now() - lastSync > (Store.durable ? 6000 : 45000)
  ) {
    lastSync = Date.now();
    try {
      const [p, d] = await Promise.all([Store.get('profile'), Store.get('days', S.date)]);
      if (Store.busy || sheets.length) return;
      // signed in, this runs every few seconds to pick up another device's changes: leave the screen alone when nothing changed
      const np = p ? fixProfile(p) : null,
        nd = { ...newDay(S.date), ...(d || {}) };
      if (Store.durable && (!np || sameDoc(np, P)) && sameDoc(nd, S.days[S.date] || newDay(S.date))) return;
      if (np) P = np;
      S.days = {};
      S.days[S.date] = { ...newDay(S.date), ...(d || {}) };
      if (S.date !== today()) await loadDay(today());
      render();
    } catch (e) {}
  }
}
document.addEventListener('visibilitychange', refresh);
const sameDoc = (a, b) => JSON.stringify(a) === JSON.stringify(b);
setInterval(refresh, 60000);
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (['today', 'train', 'progress', 'quests', 'you'].includes(h) && h !== S.tab) {
    S.tab = h;
    render();
  }
});

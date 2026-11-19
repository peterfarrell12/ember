/* ---------- Add: one place to log food by search, sentence, photo or barcode, plus one-tap repeats ---------- */
let ADD = null,
  addTimer = 0;
function openAdd(ctx = {}) {
  ADD = {
    meal: ctx.meal || mealNow(),
    pick: ctx.pick || null,
    tab: 'recent',
    rows: [],
    depth: sheets.length,
    q: ctx.q || '',
    added: [],
  };
  loadDB('gen');
  loadDB('br');
  openSheet(
    `${sh(ctx.title || 'Add', ADD.pick ? '' : `<span class="pill" id="addLeft"></span>`)}<div class="sheet-b" id="addBody">
    ${ADD.pick ? '' : segHtml('addMeal', Object.entries(MEALS), ADD.meal)}
    <div class="searchbar">${ic('search')}<input id="q" type="text" enterkeyhint="search" placeholder="${ADD.pick ? 'Search foods and brands' : 'Search a food, or type a whole meal'}" autocomplete="off" autocapitalize="off" spellcheck="false" data-on="q" value="${esc(ADD.q)}"><button class="icon-btn hide" id="qx" data-act="clearQ" aria-label="Clear search">${ic('x')}</button></div>
    ${
      ADD.pick
        ? ''
        : `<div class="stack" id="addTiles" style="gap:8px">
      <button class="say" data-act="say"><span class="say-i">${ic('mic')}</span><span class="grow"><b>Say or type what you ate</b><small>"Two eggs on buttered toast and a flat white"</small></span>${ic('chev-r')}</button>
      <div class="tiles t3"><button class="tile" data-act="photo">${ic('camera')}Photo</button><button class="tile" data-act="barcode">${ic('barcode')}Barcode</button><button class="tile" data-act="quick">${ic('bolt')}Quick add</button></div>
      <div class="also"><button data-act="addOther" data-k="water" aria-label="Add 250 ml of water">${ic('drop')}Water</button><button data-act="addOther" data-k="caf">${ic('cup')}Caffeine</button><button data-act="addOther" data-k="ex">${ic('pulse')}Exercise</button><button data-act="addOther" data-k="wt">${ic('scale')}Weight</button></div>
    </div>`
    }
    <div id="addList"></div></div>
    <div class="sheet-f hide" id="addFoot"></div>`,
    true,
  );
  SEG.addTab = v => {
    ADD.tab = v;
    renderAddList();
  };
  SEG.addMeal = v => {
    ADD.meal = v;
    renderAddList();
  };
  sheets[sheets.length - 1]._onClose = () => {
    ADD = null;
  };
  if (!ADD.pick) warmDay(addDays(S.date, -1));
  addLeft();
  renderAddList();
  if (ADD.q || ADD.pick) $('#q').focus();
}
A.add = ({ meal }) => openAdd({ meal });
A.clearQ = () => {
  const q = $('#q');
  q.value = '';
  q.focus();
  I.q(q);
};
I.q = el => {
  ADD.q = el.value;
  ADD.more = false;
  clearTimeout(addTimer);
  addTimer = setTimeout(renderAddList, 130);
};
document.addEventListener('dbready', () => {
  if (ADD && $('#addList') && ADD.q.trim()) renderAddList();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'q' && ADD && !ADD.pick && mealLike(ADD.q)) A.sayQ();
});
/* A query that reads like a meal rather than one food: amounts, lists, "and", "with". */
const mealLike = q => {
  q = q.trim();
  return q.length >= 6 && (/\d/.test(q) || /,|&|\b(and|with|plus)\b/i.test(q) || q.split(/\s+/).length >= 5);
};
A.sayQ = () => {
  openSay();
  A.sayGo();
};
function addLeft() {
  const el = $('#addLeft');
  if (!el) return;
  const l = leftNow();
  el.textContent = fmt(l.k) + ' kcal left';
}
function foodRow(food, note) {
  const i = ADD.rows.push(food) - 1,
    a = defAmount(food),
    k = portion(food, a.g).k;
  return `<div class="frow"><button class="res" data-act="pickFood" data-i="${i}"><span class="n">${esc(food.n)}</span><span class="k tn">${fmt(k)}<small> kcal</small></span><span class="s">${srcBadge(food.src)}<span class="ell">${esc([food.b, a.label, note].filter(Boolean).join(' · '))}</span></span></button>${ADD.pick ? '' : `<button class="qadd" data-act="quickPick" data-i="${i}" aria-label="Add ${esc(food.n)}, ${esc(a.label)}">${ic('plus')}</button>`}</div>`;
}
function resolveRecent(r) {
  if (r.id && r.id[0] === 'r') {
    const x = S.recipes[r.id.slice(1)];
    if (x) return { ...recipeFood(x), lq: r.lq, lu: r.lu, ...(r.ls != null ? { ls: r.ls } : {}) };
  }
  if (r.id && r.id[0] === 'c') {
    const x = S.foods[r.id.slice(1)];
    if (x) return { ...customFood(x), lq: r.lq, lu: r.lu, ...(r.ls != null ? { ls: r.ls } : {}) };
  }
  return { ...r, id: '' };
}
function renderAddList() {
  const box = $('#addList');
  if (!box || !ADD) return;
  const q = ADD.q.trim();
  ADD.rows = [];
  $('#qx').classList.toggle('hide', !q);
  const tiles = $('#addTiles');
  if (tiles) tiles.classList.toggle('hide', !!q);
  if (q.length >= 2) {
    const r = searchAll(q, ADD.more ? 40 : 14);
    let h = '';
    const ask =
      !ADD.pick && mealLike(q)
        ? `<button class="say slim" data-act="sayQ"><span class="say-i">${ic('spark')}</span><span class="grow"><b>Work this out as a meal</b><small>Splits "${esc(q.length > 44 ? q.slice(0, 42) + '…' : q)}" into foods and amounts</small></span>${ic('chev-r')}</button>`
        : '';
    if (r.mine.length)
      h += `<div class="grp">Yours</div><div class="list">${r.mine.map(x => foodRow(x.food)).join('')}</div>`;
    if (r.gen.length)
      h += `<div class="grp">Everyday foods</div><div class="list">${r.gen.map(x => foodRow(x.food)).join('')}</div>`;
    if (r.br.length)
      h += `<div class="grp">Branded products</div><div class="list">${r.br.map(x => foodRow(x.food)).join('')}</div>`;
    const loading = DB.st.gen === 'loading' || DB.st.br === 'loading' || DB.st.more === 'loading';
    const found = !!h;
    if (!h && loading) h = `<div class="busy"><div class="spinner"></div>Loading the food database</div>`;
    else if (!h && ask)
      h = `<p class="small muted">No single food matches that. Work it out as a meal, or search for one food at a time.</p>`;
    else if (!h)
      h = `<div class="card stack"><b>Nothing matched "${esc(q)}"</b><span class="small muted">Try a simpler name, describe it instead, or add it from its label.</span><div class="row">${ADD.pick ? '' : `<button class="btn sm ghost" data-act="say">${ic('mic')} Describe it</button>`}<button class="btn sm ghost" data-act="newFood">${ic('plus')} New food</button></div></div>`;
    else if (loading) h += `<p class="small muted" style="margin-top:10px">Still loading more products…</p>`;
    if (DB.st.gen === 'error' || DB.st.br === 'error')
      h += `<p class="small muted" style="margin-top:10px">Part of the food database did not load. <button class="link" data-act="retryDB">Retry</button></p>`;
    if (found && !loading)
      h += `<div class="row" style="margin-top:2px;flex-wrap:wrap">${!ADD.more ? `<button class="btn sm ghost" data-act="moreRes">Show more results</button>` : ''}${DB.st.more === 'idle' ? `<button class="btn sm ghost" data-act="loadMore">Search 72,000 more products</button>` : ''}</div>`;
    else if (!found && !loading && DB.st.more === 'idle' && !ask)
      h += `<button class="btn sm ghost" data-act="loadMore" style="align-self:flex-start">Search 72,000 more products</button>`;
    box.innerHTML = ask + h;
    return;
  }
  let top = '';
  const keyOf = r => (r.n + '|' + (r.b || '')).toLowerCase(),
    shown = new Set();
  if (!ADD.pick) {
    const name = MEALS[ADD.meal].toLowerCase(),
      y = S.days[addDays(S.date, -1)],
      ys = y ? y.e.filter(e => e.m === ADD.meal) : [];
    if (ys.length && !day().e.some(e => e.m === ADD.meal))
      top += `<div class="yrow"><div class="grow"><b>Same as yesterday's ${name}</b><small class="ell">${esc(
        ys
          .slice(0, 3)
          .map(e => e.n)
          .join(', '),
      )}${ys.length > 3 ? ' and ' + (ys.length - 3) + ' more' : ''}</small></div><span class="tn">${fmt(ys.reduce((s, e) => s + e.k, 0))}<small> kcal</small></span><button class="btn sm ember" data-act="copyYesterday" data-meal="${ADD.meal}">Add all</button></div>`;
    const us = ADD.tab === 'recent' ? usuals(ADD.meal, 5, 2) : [];
    if (us.length) {
      us.forEach(r => shown.add(keyOf(r)));
      top += `<div class="grp">Your usual ${name}</div><div class="list">${us.map(r => foodRow(resolveRecent(r), r.ms[ADD.meal] + ' times')).join('')}</div>`;
    }
  }
  const tabs = segHtml(
    'addTab',
    [
      ['recent', 'Recent'],
      ['foods', 'My foods'],
      ['recipes', 'Recipes'],
    ],
    ADD.tab,
  );
  let list;
  if (ADD.tab === 'recent') {
    const rs = P.rec.filter(r => !shown.has(keyOf(r)));
    list = rs.length
      ? `<div class="list">${rs.map(r => foodRow(resolveRecent(r))).join('')}</div>`
      : `<p class="empty">${shown.size ? 'Everything else you log will be listed here.' : 'Foods you log are listed here, ready to add again in one tap.'}</p>`;
  } else if (ADD.tab === 'foods') {
    const fs = Object.values(S.foods);
    list = `<button class="btn sm ghost" data-act="newFood" style="align-self:flex-start">${ic('plus')} New food from a label</button>${fs.length ? `<div class="list">${fs.map(c => foodRow(customFood(c))).join('')}</div>` : `<p class="empty">Save a food from its label once and it is here every time.</p>`}`;
  } else {
    const rs = Object.values(S.recipes);
    list = `<button class="btn sm ghost" data-act="newRecipe" style="align-self:flex-start">${ic('plus')} New recipe</button>${rs.length ? `<div class="list">${rs.map(r => foodRow(recipeFood(r), 'makes ' + r.sv)).join('')}</div>` : `<p class="empty">Build a recipe once and add a serving in one tap.</p>`}`;
  }
  box.innerHTML = top + tabs + list;
}
A.moreRes = () => {
  ADD.more = true;
  renderAddList();
};
A.loadMore = () => {
  loadDB('more');
  renderAddList();
};
A.retryDB = () => {
  ['gen', 'br'].forEach(k => {
    if (DB.st[k] === 'error') loadDB(k);
  });
  renderAddList();
};
A.pickFood = ({ i }) => openFood(ADD.rows[+i]);
/* The plus on a row: log it at its usual amount and stay here for the next one. */
A.quickPick = async ({ i }, el) => {
  const food = ADD.rows[+i];
  if (!food || el.classList.contains('ok')) return;
  el.classList.add('ok');
  el.innerHTML = ic('check');
  const meal = ADD.meal,
    got = await quickLog(food, meal, { keep: true, silent: true });
  setTimeout(() => {
    if (el.isConnected) {
      el.classList.remove('ok');
      el.innerHTML = ic('plus');
    }
  }, 1100);
  if (!ADD || !got) return;
  ADD.added.push({ ...got, meal });
  addFoot();
  addLeft();
};
function addFoot() {
  const f = $('#addFoot');
  if (!f || !ADD) return;
  const n = ADD.added.length;
  f.classList.toggle('hide', !n);
  if (!n) return;
  const last = ADD.added[n - 1];
  f.innerHTML = `<div class="grow" style="min-width:0"><b>${n} added, ${fmt(ADD.added.reduce((s, x) => s + x.k, 0))} kcal</b><div class="small muted ell">Last: ${esc(last.n)} to ${MEALS[last.meal].toLowerCase()}</div></div><button class="btn sm ghost" data-act="editEntry" data-id="${last.id}">Amount</button><button class="btn sm ghost" data-act="addUndo" aria-label="Undo the last one">${ic('undo')}</button><button class="btn sm" data-act="close">Done</button>`;
}
A.addUndo = async () => {
  const x = ADD && ADD.added.pop();
  if (!x) return;
  await removeEntries(S.date, [x.id]);
  if (ADD) {
    addFoot();
    addLeft();
  }
  toast(x.n + ' removed');
};
A.addOther = async ({ k }) => {
  if (k === 'water') {
    await A.water({ n: 250 });
    return toast('250 ml of water added');
  }
  closeAll();
  (k === 'caf' ? A.caf : k === 'ex' ? A.addExercise : A.addWeight)();
};
A.undoLog = async () => {
  const l = lastLog;
  if (!l) return;
  lastLog = null;
  if (await removeEntries(l.date, l.ids)) {
    if (ADD) {
      ADD.added = ADD.added.filter(x => !l.ids.includes(x.id));
      addFoot();
    }
    toast('Removed');
  }
};
A.again = async ({ i }, el) => {
  const f = HOME.rows[+i];
  if (!f) return;
  el.disabled = true;
  await quickLog(f, mealNow());
};
/* One-off: count how often each remembered food was logged at each meal, from the diary so far. */
async function backfillUsage() {
  if (P.recV) return;
  try {
    const ds = await Store.list('days'),
      cnt = {};
    for (const d of ds)
      for (const e of d.e || []) {
        const k = (e.n + '|' + (e.b || '')).toLowerCase();
        (cnt[k] = cnt[k] || {})[e.m] = (cnt[k][e.m] || 0) + 1;
      }
    P.rec.forEach(r => {
      const c = cnt[(r.n + '|' + (r.b || '')).toLowerCase()];
      if (c) {
        r.ms = c;
        r.ct = Object.values(c).reduce((a, b) => a + b, 0);
      }
    });
    P.recV = 1;
    saveProfile();
    if (S.tab === 'today' && !isCoach() && !sheets.length) render();
  } catch (e) {}
}

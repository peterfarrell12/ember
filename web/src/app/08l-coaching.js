/* ================= coaching between real accounts =================
   Signed in, a coach and a client are two accounts joined by a link the client accepts (coaching.js and
   supabase/migrations, coaching). This file is that link's screens and its plumbing. The coach screens
   themselves (08-coach.js, 08d-clients.js, 08e-chat.js) are unchanged: they read LIVE and call pushAssign,
   and here those are fed from the coaching tables instead of the prototype's shared documents.

   The rules that matter:
   - A coach sees only the copy the client's own app sends, cut to what the client shares (sharedCopy).
   - A coach never writes into a client's diary. A programme or new targets arrive as an offer the client
     accepts or declines.
   - "See their app" shows that copy through the app's own screens, read-only: nothing is read from or
     written to either person's account while it is open (LENS, in 01-core.js). */
const CG = { coach: null, clients: [], at: 0, busy: false, recent: null, sent: '' };
const coachingOn = () => FEATURES.coach && Store.durable && authConfigured();
const cgApi = async () => coachingApi(await supabaseClient(), Store.uid);
const hasCoach = () => coachingOn() && !!CG.coach;
const CG_WHY = {
  not_found: 'That code is not right, or it has already been used. Ask your coach for a new one.',
  own_invite: 'That is your own invitation. Send it to your client.',
  already_coached: 'You already have a coach on Ember. End that first, under You, Your coach.',
  too_many_clients: 'You have reached the most clients one coach can have for now.',
  too_large: 'That is too large to send.',
};
const cgWhy = e => CG_WHY[e && e.code] || 'That did not go through. Check your connection and try again.';
const cgAreas = share => SHARE_AREAS.filter(a => share && share[a]).map(a => SHARE_LABEL[a][0]);
const cgList = words =>
  words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1] : words[0] || '';

/* ---------- loading: my links, what my clients have sent, what my coach has set ---------- */
async function cgLoad(force) {
  if (!coachingOn() || CG.busy || DEMO || (!force && Date.now() - CG.at < 20000)) return;
  CG.busy = true;
  const before = JSON.stringify([CG.coach, CG.clients, LIVE]);
  try {
    const api = await cgApi();
    const { clients, coach } = await api.links();
    CG.clients = clients;
    CG.coach = coach;
    CG.at = Date.now();
    const linked = clients.filter(l => l.client_id);
    if (linked.length && P.mode === 'coach') {
      const sent = await api.statuses();
      const next = {};
      for (const l of linked) {
        const row = sent[l.id];
        next[l.client_id] = {
          ...(row ? row.data : { st: {}, ev: [] }),
          name: (row && row.data.name) || l.client_name || 'Client',
          share: l.share,
          _link: l.id,
          _status: l.status,
        };
      }
      LIVE = next;
    } else if (!linked.length) LIVE = {};
    if (coach && coach.status !== 'invited') {
      const set = await api.assigned(coach.id);
      if (set) applyAssign(set, true);
      cgPublish();
    }
  } catch (e) {}
  CG.busy = false;
  if (JSON.stringify([CG.coach, CG.clients, LIVE]) !== before && !sheets.length && S.ready) render();
}
/* the last fortnight of the diary, read once, so the copy sent to a coach can show recent days */
async function cgRecentDays() {
  if (!CG.recent) {
    const from = addDays(today(), -14);
    CG.recent = {};
    for (const d of await Store.list('days')) if (d.date && d.date >= from) CG.recent[d.date] = d;
  }
  return { ...CG.recent, ...S.days };
}
/* Send my coach the copy they may see. At most once a minute, and only when something has changed. */
async function cgPublish() {
  const l = CG.coach;
  if (!coachingOn() || DEMO || !l || l.status !== 'active' || !P.onboarded) return;
  clearTimeout(CG.later);
  const wait = 60000 - (Date.now() - lastPub);
  if (wait > 0) return void (CG.later = setTimeout(cgPublish, wait + 500)); // the latest change still goes, a little later
  lastPub = Date.now();
  try {
    const copy = sharedCopy(
      {
        name: P.coachName || l.client_name,
        goal: P.goalKg ? 'Reach ' + P.goalKg + ' kg' : '',
        st: myStatus(),
        ev: myEvents(),
        msgs: (P.thread || []).filter(m => m.f === 'u'),
        profile: P,
        days: await cgRecentDays(),
        train: TR,
        progs: S.progs,
      },
      l.share,
    );
    copy.resp = P.offerResp || {};
    const same = JSON.stringify({ ...copy, v: 0 });
    if (same === CG.sent) return;
    await (await cgApi()).publish(copy);
    CG.sent = same;
  } catch (e) {}
}
/* Coach: set one part of what a client has been given. */
async function cgAssign(uid, part, val) {
  const l = CG.clients.find(x => x.client_id === uid && x.status !== 'invited');
  try {
    if (!l) throw { code: 'not_found' };
    await (await cgApi()).assign(l.id, part, val);
    return true;
  } catch (e) {
    toast(
      e && e.code === 'not_found'
        ? 'They are no longer linked to you, so that was not sent.'
        : 'That could not be sent to the client. Check your connection.',
    );
    return false;
  }
}

/* ---------- the client: a programme or new targets from the coach arrive as an offer ---------- */
function cgOffers(a, seen) {
  let changed = false;
  P.offer = P.offer || {};
  for (const k of ['prog', 't']) {
    if (!a[k] || a[k].v <= (seen[k] || 0)) continue;
    if (k === 'prog' && !a.prog.p) continue;
    P.offer[k] = a[k];
    seen[k] = a[k].v;
    changed = true;
  }
  return changed;
}
function cgOfferCard() {
  if (!hasCoach() || !P.offer) return '';
  const who = esc(CG.coach.coach_name),
    out = [];
  const card = (k, title, detail, yes, no) =>
    `<section class="card stack" style="border-color:var(--ember)"><div><div class="tiny muted">From your coach, ${who}</div><h2>${title}</h2></div><p class="small">${detail}</p><div class="two"><button class="btn sm ember" data-act="cgOfferYes" data-k="${k}">${yes}</button><button class="btn sm ghost" data-act="cgOfferNo" data-k="${k}">${no}</button></div></section>`;
  const p = P.offer.prog && P.offer.prog.p;
  if (p)
    out.push(
      card(
        'prog',
        'A programme for you: ' + esc(p.n),
        `${p.days.length} day${p.days.length === 1 ? '' : 's'} a week${p.weeks ? ' for ' + p.weeks + ' weeks' : ''}. Using it replaces the programme you are on now; your past sessions stay.`,
        'Use this programme',
        'Not now',
      ),
    );
  const t = P.offer.t;
  if (t)
    out.push(
      card(
        't',
        'New targets',
        `${fmt(t.k)} kcal a day${t.p ? ' and ' + t.p + ' g of protein' : ''}. Yours now: ${fmt(P.t.k)} kcal${t.p ? ' and ' + P.t.p + ' g' : ''}.`,
        'Use these targets',
        'Keep mine',
      ),
    );
  return out.join('');
}
function cgAnswer(k, yes) {
  const o = P.offer && P.offer[k];
  if (!o) return;
  if (yes && k === 'prog') {
    saveProg({ ...o.p, id: 'coach', src: 'coach' });
    P.prog = { id: 'coach', at: 0, n: 0, started: today() };
  }
  if (yes && k === 't') {
    P.t.k = o.k;
    if (o.p) P.t.p = o.p;
  }
  delete P.offer[k];
  P.offerResp = { ...(P.offerResp || {}), [k]: { v: o.v, yes: !!yes, d: today() } };
  saveProfile();
  lastPub = 0;
  cgPublish(); // the coach sees the answer
  render();
  toast(
    yes
      ? k === 'prog'
        ? 'Programme set. It is on the Train tab.'
        : 'Targets updated.'
      : 'Left as it was. Your coach will see that.',
  );
}
A.cgOfferYes = ({ k }) => cgAnswer(k, true);
A.cgOfferNo = ({ k }) => cgAnswer(k, false);

/* ---------- the client: joining a coach, and what the coach may see ---------- */
/* an invite link: …#coach=ABCD2345. Kept through sign-in and setup, then offered once the app is open. */
function cgNoteInvite() {
  const m = /^#coach=([A-Za-z0-9]{8})$/.exec(location.hash);
  if (!m) return;
  LS.set('ember:coachcode', m[1].toUpperCase());
  history.replaceState(null, '', location.pathname + location.search + '#today');
}
cgNoteInvite();
window.addEventListener('hashchange', () => {
  cgNoteInvite();
  cgOfferInvite();
});
function cgOfferInvite() {
  const code = LS.get('ember:coachcode');
  if (!code || !coachingOn() || !S.ready || !P.onboarded || sheets.length || celeOpen || DEMO || isCoach()) return;
  LS.del('ember:coachcode');
  A.cgJoin({ code });
}
const cgToggles = share =>
  SHARE_AREAS.map(
    a =>
      `<button class="chk" data-act="cgShare" data-area="${a}" aria-pressed="${share[a] ? 'true' : 'false'}"><span class="tb"></span><span><b>${SHARE_LABEL[a][0]}</b><small class="muted" style="display:block;font-weight:400">${SHARE_LABEL[a][1]}</small></span></button>`,
  ).join('');
const CG_PROMISE = `<p class="tiny muted">Your coach sees a copy your app sends, holding only what is switched on here. They never see anything else, they cannot change your diary, and progress photos are not included. You can change this, pause it or end it at any time, and they stop seeing it at once.</p>`;
let CJ = null;
A.cgJoin = async ({ code } = {}) => {
  if (!coachingOn()) return toast('Sign in to join a coach.');
  if (hasCoach()) return A.myCoach();
  CJ = { code: code || '', share: {}, from: '' };
  openSheet(
    `${sh('Join your coach')}<div class="sheet-b" id="cjBody"></div><div class="sheet-f"><button class="btn" data-act="cgJoinGo" id="cjGo">Join</button></div>`,
    true,
  );
  cjDraw();
  if (CJ.code) cjLook();
};
async function cjLook() {
  try {
    const info = await (await cgApi()).inviteInfo(CJ.code);
    if (!CJ) return;
    CJ.from = info.own ? '' : info.coach_name;
    CJ.err = info.own ? cgWhy({ code: 'own_invite' }) : '';
  } catch (e) {
    if (!CJ) return;
    CJ.from = '';
    CJ.err = cgWhy(e);
  }
  cjDraw();
}
function cjDraw() {
  const b = $('#cjBody');
  if (!b || !CJ) return;
  const name = $('#cjName') ? $('#cjName').value : P.coachName || '';
  b.innerHTML = `${CJ.from ? `<div class="banner">${ic('users')}<span><b>${esc(CJ.from)}</b> has invited you to work with them on Ember.</span></div>` : ''}${CJ.err ? `<div class="banner">${ic('label')}<span>${esc(CJ.err)}</span></div>` : ''}
    <label class="f">Code from your coach<input class="inp" id="cjCode" value="${esc(CJ.code)}" maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false" style="letter-spacing:.12em;text-transform:uppercase" data-on="cjCode"></label>
    <label class="f">Your name, as your coach will see it<input class="inp" id="cjName" maxlength="40" value="${esc(name)}" autocomplete="name"></label>
    <div class="f">What your coach can see<div class="stack" style="gap:8px;margin-top:6px">${cgToggles(CJ.share)}</div></div>${CG_PROMISE}`;
}
I.cjCode = el => {
  CJ.code = el.value.trim().toUpperCase();
  if (CJ.code.length === 8) cjLook();
};
A.cgShare = async ({ area }, el) => {
  // on the join sheet this only changes the choice; under Your coach it is saved at once
  const on = el.getAttribute('aria-pressed') !== 'true';
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
  if (CJ && $('#cjBody')) return void (CJ.share[area] = on);
  const l = CG.coach;
  if (!l) return;
  const share = { ...l.share, [area]: on };
  try {
    await (await cgApi()).setShare(l.id, share);
    l.share = share;
    CG.sent = '';
    lastPub = 0;
    cgPublish();
    toast(
      on ? SHARE_LABEL[area][0] + ' is now shared with your coach.' : SHARE_LABEL[area][0] + ' is no longer shared.',
    );
  } catch (e) {
    el.setAttribute('aria-pressed', on ? 'false' : 'true');
    toast(cgWhy(e));
  }
};
A.cgJoinGo = async () => {
  const code = ($('#cjCode').value || '').trim().toUpperCase(),
    name = ($('#cjName').value || '').trim();
  if (code.length !== 8) return toast('Enter the eight-character code from your coach.');
  if (!name) return toast('Add the name your coach will see.');
  const go = $('#cjGo');
  go.disabled = true;
  try {
    await (await cgApi()).accept(code, name, CJ.share);
    if (!P.coachName) P.coachName = name;
    saveProfile();
    CJ = null;
    closeAll();
    await cgLoad(true);
    lastPub = 0;
    cgPublish();
    render();
    toast('You are linked with ' + (CG.coach ? CG.coach.coach_name : 'your coach') + '.', 'good');
  } catch (e) {
    go.disabled = false;
    CJ.err = cgWhy(e);
    cjDraw();
  }
};
/* the row on the You page */
const cgYouRow = row =>
  hasCoach()
    ? row(
        'myCoach',
        'users',
        'Your coach: ' + esc(CG.coach.coach_name),
        CG.coach.status === 'paused'
          ? 'Paused. They see nothing'
          : cgAreas(CG.coach.share).length
            ? 'Sees your ' + cgList(cgAreas(CG.coach.share)).toLowerCase()
            : 'Sees nothing yet. Choose what to share',
      )
    : row('cgJoin', 'users', 'Join a coach', 'Have a code from your coach? Enter it here');
A.myCoach = () => {
  const l = CG.coach;
  if (!l) return A.cgJoin();
  CJ = null;
  const paused = l.status === 'paused';
  openSheet(
    `${sh('Your coach')}<div class="sheet-b"><div class="card stack"><div class="between"><h2>${esc(l.coach_name)}</h2>${paused ? '<span class="pill">Paused</span>' : '<span class="pill good">Linked</span>'}</div>
      ${paused ? `<p class="small">Sharing is paused. Your coach sees nothing until you resume.</p><button class="btn" data-act="cgResume">Resume sharing</button>` : `<div class="stack" style="gap:8px">${cgToggles(l.share)}</div>`}
      ${CG_PROMISE}</div>
    <button class="btn ghost" data-act="cgSees">${ic('search')} See exactly what your coach sees</button>
    ${paused ? '' : `<button class="btn ghost" data-act="cgPause">Pause sharing</button>`}
    <button class="link" data-act="cgEnd" style="color:var(--bad);align-self:center">Stop working with this coach</button></div>`,
    true,
  );
};
const cgSet = (what, done) => async () => {
  const l = CG.coach;
  if (!l) return;
  try {
    await (await cgApi())[what](l.id);
    closeAll();
    CG.sent = '';
    await cgLoad(true);
    lastPub = 0;
    cgPublish();
    render();
    toast(done);
  } catch (e) {
    toast(cgWhy(e));
  }
};
A.cgPause = cgSet('pause', 'Paused. Your coach sees nothing until you resume.');
A.cgResume = cgSet('resume', 'Sharing again.');
A.cgEnd = () =>
  openSheet(
    `${sh('Stop working with this coach?')}<div class="sheet-b"><p>${esc(CG.coach ? CG.coach.coach_name : 'Your coach')} will stop seeing anything of yours at once, and can no longer set your programme or targets. What they have already set stays in your app.</p></div><div class="sheet-f"><button class="btn ghost" data-act="close">Cancel</button><button class="btn ember" data-act="cgEndGo">Stop</button></div>`,
  );
A.cgEndGo = cgSet('end', 'You are no longer linked with that coach.');
/* the copy itself, in words, so a client can check it */
A.cgSees = async () => {
  const l = CG.coach;
  if (!l) return;
  const copy = sharedCopy(
    {
      name: P.coachName || l.client_name,
      goal: P.goalKg ? 'Reach ' + P.goalKg + ' kg' : '',
      st: myStatus(),
      ev: myEvents(),
      profile: P,
      days: await cgRecentDays(),
      train: TR,
      progs: S.progs,
    },
    l.status === 'paused' ? {} : l.share,
  );
  const st = copy.st,
    on = copy.share,
    line = (label, value) =>
      `<div class="between small" style="padding:7px 0;border-bottom:1px solid var(--line)"><span class="muted">${label}</span><b style="text-align:right">${value}</b></div>`;
  const rows = [line('Your name', esc(copy.name)), line('Streak', st.streak + ' days')];
  if (on.food)
    rows.push(
      line(
        'Food, last 7 days',
        st.logged7 + ' days logged, ' + fmt(st.kcalAvg) + ' kcal a day against ' + fmt(st.kcalT),
      ),
      line('Protein', st.protAvg + ' g against ' + st.protT + ' g'),
      line(
        'Your diary',
        Object.values(copy.view.days).filter(d => (d.e || []).length).length + ' recent days, every entry',
      ),
    );
  if (on.training)
    rows.push(
      line('Sessions, last 7 days', st.sess7 + (st.plan7 ? ' of ' + st.plan7 : '')),
      line('Programme', esc(st.progN || 'None')),
      line('Recent sessions', copy.view.train.sess.length + ' with sets and weights'),
    );
  if (on.weight)
    rows.push(
      line('Weight', st.kg == null ? 'No weigh-ins' : st.kg + ' kg'),
      line('Goal', esc(copy.goal || 'None set')),
    );
  if (on.recovery) rows.push(line('Recovery today', st.ready == null ? 'No check-in' : st.ready));
  const off = SHARE_AREAS.filter(a => !on[a]).map(a => SHARE_LABEL[a][0]);
  openSheet(
    `${sh('What your coach sees')}<div class="sheet-b">${l.status === 'paused' ? `<div class="banner">${ic('lock')}<span>Sharing is paused, so your coach sees nothing at the moment.</span></div>` : ''}<div class="card" style="padding:6px 14px">${rows.join('')}</div>
    <p class="small muted">${off.length ? 'Not shared: ' + cgList(off).toLowerCase() + '. ' : ''}Your messages to your coach are always sent. Progress photos, notes, meal plans and anything not listed here are never sent.</p></div>`,
    true,
  );
};

/* ---------- the coach: invitations ---------- */
const cgInviteLink = code => location.origin + location.pathname + '#coach=' + code;
A.cgInvite = () => {
  if (!coachingOn()) return toast('Sign in to invite a client.');
  openSheet(
    `${sh('Invite a client')}<div class="sheet-b"><p class="small">They get a link or a code, sign in to Ember (it is free), and choose what you can see. You see nothing until they accept.</p>
    <label class="f">Your name, as they will see it<input class="inp" id="ciMe" maxlength="40" value="${esc(P.coachName || '')}" autocomplete="name"></label>
    <label class="f">Their name<input class="inp" id="ciName" maxlength="40" placeholder="So you know whose invitation it is" autocomplete="off"></label><div id="ciOut"></div></div>
    <div class="sheet-f"><button class="btn" data-act="cgInviteGo" id="ciGo">Make the invitation</button></div>`,
    true,
  );
};
A.cgInviteGo = async () => {
  const me = ($('#ciMe').value || '').trim(),
    name = ($('#ciName').value || '').trim();
  if (!me) return toast('Add your name first.');
  const go = $('#ciGo');
  go.disabled = true;
  try {
    const inv = await (await cgApi()).invite(me, name);
    if (!P.coachName) {
      P.coachName = me;
      saveProfile();
    }
    await cgLoad(true);
    render(); // the invitation shows on the Clients screen behind this sheet
    $('#ciOut').innerHTML =
      `<div class="card stack" style="margin-top:10px"><div class="tiny muted">Their code</div><div class="sq-code">${esc(inv.code)}</div><button class="btn" data-act="cgInviteCopy" data-code="${esc(inv.code)}">${ic('copy')} Copy the invite link</button><p class="tiny muted">Send it however you like. It works once.</p></div>`;
    go.textContent = 'Make another';
    go.disabled = false;
    $('#ciName').value = '';
  } catch (e) {
    go.disabled = false;
    toast(cgWhy(e));
  }
};
A.cgInviteCopy = ({ code }) => copyText(cgInviteLink(code), 'Link copied. Send it to your client.');
A.cgInviteCancel = async ({ id }) => {
  try {
    await (await cgApi()).end(id);
    await cgLoad(true);
    render();
    toast('Invitation withdrawn.');
  } catch (e) {
    toast(cgWhy(e));
  }
};
function cgInvitesCard() {
  if (!coachingOn()) return '';
  const waiting = CG.clients.filter(l => l.status === 'invited');
  if (!waiting.length) return '';
  return `<section class="card"><h2>Invitations waiting</h2>${waiting
    .map(
      l =>
        `<div class="entry" style="cursor:default;grid-template-columns:1fr auto auto;align-items:center"><span class="n">${esc(l.client_name || 'No name')}</span><button class="link" data-act="cgInviteCopy" data-code="${esc(l.code)}">Copy link</button><button class="icon-btn" data-act="cgInviteCancel" data-id="${l.id}" aria-label="Withdraw the invitation for ${esc(l.client_name || 'this client')}">${ic('x')}</button><span class="s">Code ${esc(l.code)} · sent ${niceDate(l.created_at.slice(0, 10))}</span></div>`,
    )
    .join('')}</section>`;
}
/* in a client's workspace: what they share, and the way into their app */
function cgClientNote(c) {
  if (c.kind !== 'live' || !c.link) return '';
  if (c.paused)
    return `<div class="banner">${ic('lock')}<span>${esc(c.name.split(' ')[0])} has paused sharing. You will see their figures again when they resume.</span></div>`;
  const on = cgAreas(c.share),
    off = SHARE_AREAS.filter(a => !(c.share && c.share[a])).map(a => SHARE_LABEL[a][0]);
  const said = Object.entries(c.resp || {})
    .map(
      ([k, r]) =>
        `${k === 'prog' ? 'The programme you sent' : 'The targets you sent'}: ${r.yes ? 'accepted' : 'declined'} ${niceDate(r.d).toLowerCase()}.`,
    )
    .join(' ');
  return `<div class="card stack" style="gap:8px"><p class="small">${on.length ? 'Shares ' + cgList(on).toLowerCase() + '.' : 'Shares nothing yet.'}${off.length && on.length ? ' Not shared: ' + cgList(off).toLowerCase() + '.' : ''}${said ? ' ' + said : ''}</p>${c.view ? `<button class="btn sm ghost" data-act="coViewAs" style="align-self:flex-start">${ic('search')} See their app</button>` : ''}</div>`;
}

/* ---------- see their app: the client's own screens, from the copy they share, read-only ---------- */
A.coViewAs = () => {
  const c = getClient(CC),
    v = c && c.view;
  if (!v) return toast('They have not shared anything to show yet.');
  closeAll();
  DEMO = {
    P,
    days: S.days,
    TR,
    date: S.date,
    tab: S.tab,
    progs: S.progs,
    recipes: S.recipes,
    foods: S.foods,
    as: c.name,
    back: c.id,
  };
  LENS = true;
  P = fixProfile({ ...clone(v.profile), mode: 'me', onboarded: true });
  S.days = {};
  for (const [k, d] of Object.entries(clone(v.days))) S.days[k] = { ...newDay(k), ...d };
  S.date = today();
  if (!S.days[S.date]) S.days[S.date] = newDay(S.date);
  TR = { ...defaultTR(), ...clone(v.train) };
  S.progs = clone(v.progs || {});
  S.recipes = {};
  S.foods = {};
  S.tab = 'today';
  render();
  $('#main').scrollTop = 0;
};
/* called by previewOff when the preview was a client's app */
function cgLeaveLens(o) {
  LENS = false;
  S.progs = o.progs;
  S.recipes = o.recipes;
  S.foods = o.foods;
  S.tab = 'clients';
  render();
  A.coClient({ id: o.back });
}

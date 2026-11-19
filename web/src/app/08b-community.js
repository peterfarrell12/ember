/* ================= v3: squad (community) and coach profile ================= */
let SQUAD = {},
  REVIEWS = [],
  COACHPUB = null,
  lastSq = 0;
const weekKey = () => weekStart(today());
const myWin = () => (P.wins || [])[0] || (e => (e ? { d: e.d, t: e.s } : null))(myEvents().find(e => e.k === 'trophy'));
function squadMembers() {
  const wk = weekKey();
  const out = [
    {
      id: 'me',
      uid: Store.uid,
      name: P.coachName || 'You',
      me: true,
      xp: P.lg.xp,
      streak: streak().count,
      sess7: TR.sess.filter(s => s.kind === 'train' && s.d >= addDays(today(), -6)).length,
      win: myWin(),
    },
  ];
  Object.keys(SQUAD).forEach(uid => {
    const d = SQUAD[uid];
    out.push({
      id: 'u:' + uid,
      uid,
      name: d.name || 'Member ' + uid.slice(-4),
      xp: d.wk === wk ? d.xp || 0 : 0,
      streak: d.streak || 0,
      sess7: d.sess7 || 0,
      win: d.win || null,
    });
  });
  if (Store.owner !== false)
    Object.values(CO.clients)
      .filter(c => c.kind === 'sample' || c.kind === 'manual')
      .forEach(c => {
        const w = (c.ev || []).find(e => e.k === 'trophy'),
          st = clientStatus(c);
        out.push({
          id: c.id,
          name: c.name,
          sample: c.kind === 'sample',
          xp: (st.sess7 || 0) * 45 + (st.logged7 || 0) * 15 + (st.prs14 || 0) * 10,
          streak: st.streak || 0,
          sess7: st.sess7 || 0,
          win: w ? { d: w.d || addDays(today(), -(w.ago || 0)), t: w.s } : null,
        });
      });
  return out.sort((a, b) => b.xp - a.xp);
}
function kudosFor(m) {
  const wk = weekKey();
  let n = (P.kudos || {})[m.id] === wk ? 1 : 0;
  const uid = m.me ? Store.uid : m.uid;
  if (uid)
    Object.values(SQUAD).forEach(d => {
      if (d.kudos && d.kudos[uid] === wk) n++;
    });
  return n;
}
const challenge = () =>
  (Store.owner === false ? COACHPUB && COACHPUB.ch : CO.challenge) || { n: 'Squad sessions this week', goal: 12 };
async function publishSquad(force) {
  if (DEMO || Store.mode !== 'cloud' || (!force && Date.now() - lastSq < 60000)) return;
  lastSq = Date.now();
  const wk = weekKey(),
    kd = {};
  Object.keys(P.kudos || {}).forEach(k => {
    if (k.startsWith('u:') && P.kudos[k] === wk) kd[k.slice(2)] = wk;
  });
  try {
    await Store.db.doc('squad/' + Store.uid).set({
      name: P.coachName || '',
      xp: P.lg.xp,
      wk,
      streak: streak().count,
      sess7: TR.sess.filter(s => s.kind === 'train' && s.d >= addDays(today(), -6)).length,
      win: myWin(),
      kudos: kd,
      v: Date.now(),
    });
  } catch (e) {}
}
async function loadCommunity() {
  if (Store.mode !== 'cloud') return;
  try {
    const [sq, rv, cp] = await Promise.all([
      withTimeout(Store.db.collection('squad').limit(200).get()),
      withTimeout(Store.db.collection('reviews').limit(200).get()),
      withTimeout(Store.db.doc('coach/profile').get()),
    ]);
    const s = {};
    sq.docs.forEach(d => {
      if (d.id !== Store.uid) s[d.id] = clone(d.data());
    });
    SQUAD = s;
    REVIEWS = rv.docs.map(d => ({ id: d.id, ...clone(d.data()) })).filter(r => r.stars);
    COACHPUB = cp.exists ? clone(cp.data()) : null;
    if (!sheets.length) render();
  } catch (e) {}
}
function squadCard() {
  const ms = squadMembers(),
    ch = challenge(),
    done = ms.reduce((s, m) => s + m.sess7, 0),
    me = ms.findIndex(m => m.me);
  return `<section class="card stack"><div class="between"><h2>Squad</h2><button class="link" data-act="squad">Open</button></div>
    ${ms.length > 1 ? `<p class="small">You are ${me + 1}${['st', 'nd', 'rd'][me] || 'th'} of ${ms.length} this week with ${fmt(ms[me].xp)} XP.</p>` : `<p class="small muted">Train alongside the people your coach works with: a weekly board, shared wins and a team challenge.</p>`}
    <div class="between small"><b>${esc(ch.n)}</b><span class="muted tn">${done} of ${ch.goal}</span></div>${bar(done, ch.goal, done >= ch.goal ? 'good' : 'ember')}</section>`;
}
A.squad = () => {
  openSheet(`${sh('Squad')}<div class="sheet-b" id="sqBody"></div>`, true);
  renderSquad();
  loadCommunity().then(renderSquad);
};
function renderSquad() {
  const b = $('#sqBody');
  if (!b) return;
  const ms = squadMembers(),
    ch = challenge(),
    done = ms.reduce((s, m) => s + m.sess7, 0),
    wins = ms.filter(m => m.win && m.win.t);
  b.innerHTML = `<section class="card stack"><div class="between"><h2>${esc(ch.n)}</h2>${Store.owner !== false ? `<button class="link" data-act="squadEdit">Edit</button>` : ''}</div><div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:36px;line-height:1">${done}</span><span class="muted">of ${ch.goal} sessions</span></div>${bar(done, ch.goal, done >= ch.goal ? 'good lg' : 'ember lg')}<p class="tiny muted">Every finished training session by anyone in the squad counts.</p></section>
    <section class="card" style="padding:4px 14px">${ms.map((m, i) => `<div class="crow" style="cursor:default"><span class="rk tn">${i + 1}</span><span class="av">${esc(initials(m.name))}</span><span class="grow"><span class="row" style="gap:6px"><b class="ell">${esc(m.name)}</b>${m.me ? '<span class="pill gold">You</span>' : m.sample ? '<span class="pill">Sample</span>' : ''}</span><span class="small muted">${m.streak}-day streak · ${m.sess7} session${m.sess7 === 1 ? '' : 's'}</span></span><span class="cr"><b class="tn">${fmt(m.xp)}</b><span class="tiny muted">XP</span></span></div>`).join('')}</section>
    <section class="card stack"><h2>Wins</h2><div class="row"><input class="inp" id="sqWin" placeholder="First 100 kg squat. Ten days of logging." autocomplete="off"><button class="btn sm" data-act="squadPost">Post</button></div>
      ${
        wins
          .map(m => {
            const k = kudosFor(m),
              mine = (P.kudos || {})[m.id] === weekKey();
            return `<div class="entry" style="cursor:default;grid-template-columns:1fr auto;align-items:center"><span class="n" style="white-space:normal">${esc(m.win.t)}</span>${m.me ? `<span class="k muted small">${k ? k + ' kudos' : ''}</span>` : `<button class="btn sm ${mine ? '' : 'ghost'}" data-act="squadKudos" data-id="${m.id}" aria-pressed="${mine}">${ic('star', mine ? 'fill' : '')}${k || ''}</button>`}<span class="s">${esc(m.name)} · ${niceDate(m.win.d)}</span></div>`;
          })
          .join('') || `<p class="empty">No wins posted yet. Records and milestones show up here on their own.</p>`
      }</section>
    <p class="tiny muted">${ms.some(m => m.sample) ? 'People marked Sample are examples from the coach view, not real members. ' : ''}Real members are people in your Claude organisation who open this app.</p>`;
}
A.squadPost = () => {
  const t = ($('#sqWin').value || '').trim();
  if (!t) return;
  P.wins = [{ d: today(), t: t.slice(0, 140) }].concat(P.wins || []).slice(0, 10);
  saveProfile();
  publishSquad(true);
  renderSquad();
  toast('Posted');
};
A.squadKudos = ({ id }) => {
  P.kudos = P.kudos || {};
  if (P.kudos[id] === weekKey()) delete P.kudos[id];
  else P.kudos[id] = weekKey();
  saveProfile();
  publishSquad(true);
  renderSquad();
};
A.squadEdit = () => {
  const ch = challenge();
  openSheet(
    `${sh('Team challenge')}<div class="sheet-b"><label class="f">Name<input class="inp" id="chN" value="${esc(ch.n)}" autocomplete="off"></label><label class="f">Sessions to hit this week, across everyone<input class="inp" id="chG" inputmode="numeric" value="${ch.goal}"></label></div><div class="sheet-f"><button class="btn" data-act="squadEditSave">Save</button></div>`,
  );
};
A.squadEditSave = () => {
  CO.challenge = {
    n: $('#chN').value.trim().slice(0, 50) || 'Squad sessions this week',
    goal: clamp(r0(num($('#chG').value, 12)), 1, 999),
  };
  saveCO();
  publishCoach();
  closeSheet();
  renderSquad();
  render();
};

/* ---------- coach profile: built to be checkable ---------- */
const blankProfile = () => ({ name: '', tag: '', bio: '', spec: '', loc: '', quals: [], ins: '', aid: '' });
const coachProfile = () =>
  Store.owner === false ? COACHPUB || blankProfile() : CO.profile || (CO.profile = blankProfile());
function trustChecks(pf) {
  return [
    ['Bio and what you specialise in', !!(pf.bio && pf.spec)],
    ['A qualification, with who awarded it and its reference', (pf.quals || []).some(q => q.t && q.body && q.ref)],
    ['Professional insurance', !!pf.ins],
    ['First aid, in date', !!pf.aid && pf.aid >= today().slice(0, 7)],
    ['A review from a client', REVIEWS.length > 0],
  ];
}
const stars = n =>
  `<span class="stars" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map(i => ic('star', i <= n ? 'fill on' : '')).join('')}</span>`;
function profileCard(pf) {
  const avg = REVIEWS.length ? REVIEWS.reduce((s, r) => s + r.stars, 0) / REVIEWS.length : 0;
  return `<section class="card stack"><div class="crow" style="cursor:default;border:0;padding:0"><span class="av lg">${esc(initials(pf.name || 'Coach'))}</span><span class="grow"><b style="font-size:17px">${esc(pf.name || 'Your name')}</b><span class="small muted" style="display:block">${esc([pf.tag, pf.loc].filter(Boolean).join(' · ') || 'What you do, and where')}</span></span></div>
    ${pf.bio ? `<p class="small">${esc(pf.bio)}</p>` : ''}${
      pf.spec
        ? `<div class="ms">${pf.spec
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 8)
            .map(s => `<span>${esc(s)}</span>`)
            .join('')}</div>`
        : ''
    }
    ${(pf.quals || []).length ? `<div>${pf.quals.map(q => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal">${esc(q.t)}</span><span class="k"><span class="pill">Self-declared</span></span><span class="s" style="white-space:normal">${esc([q.body, q.yr, q.ref ? 'ref ' + q.ref : ''].filter(Boolean).join(' · '))}</span></div>`).join('')}</div>` : ''}
    <div class="row small" style="flex-wrap:wrap;gap:6px">${pf.ins ? `<span class="pill">Insured: ${esc(pf.ins)}</span>` : ''}${pf.aid ? `<span class="pill">First aid to ${esc(pf.aid)}</span>` : ''}</div>
    ${plansOf(pf).length ? `<div class="tiny muted" style="font-weight:700;margin-bottom:-6px">Plans</div>${plansHtml(pf)}` : ''}
    <div class="between"><span class="row" style="gap:8px">${stars(Math.round(avg))}<b>${REVIEWS.length ? r1(avg) : ''}</b></span><span class="muted small">${REVIEWS.length} review${REVIEWS.length === 1 ? '' : 's'}</span></div>
    ${
      REVIEWS.slice(0, 6)
        .map(
          r =>
            `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc(r.t || '')}</span><span class="k">${stars(r.stars)}</span><span class="s">${esc(r.name || 'A client')} · ${niceDate(r.d)}</span></div>`,
        )
        .join('') ||
      `<p class="small muted">No reviews yet. Only a client this coach has set a plan for can leave one, and the coach cannot edit or remove it.</p>`
    }</section>`;
}
async function publishCoach() {
  if (Store.mode !== 'cloud' || Store.owner === false) return;
  try {
    await Store.db.doc('coach/profile').set({
      ...clone(coachProfile()),
      plans: (coachProfile().plans || []).filter(p => !p.ex),
      ch: challenge(),
      v: Date.now(),
    });
  } catch (e) {}
}
A.coProfile = () => {
  openSheet(
    `${sh('Coach profile')}<div class="sheet-b" id="cpBody"></div><div class="sheet-f"><button class="btn" data-act="coProfileSave">Save profile</button></div>`,
    true,
  );
  renderProfile();
  loadCommunity().then(() => {
    if ($('#cpPrev')) $('#cpPrev').innerHTML = profileCard(coachProfile());
  });
};
function renderProfile() {
  const b = $('#cpBody');
  if (!b) return;
  const pf = coachProfile(),
    f = (k, l, ph, ta) =>
      `<label class="f">${l}${ta ? `<textarea class="inp" style="min-height:84px" data-on="cp" data-k="${k}" placeholder="${ph}">${esc(pf[k])}</textarea>` : `<input class="inp" value="${esc(pf[k])}" data-on="cp" data-k="${k}" placeholder="${ph}" autocomplete="off">`}</label>`;
  const tc = trustChecks(pf);
  b.innerHTML = `<section class="card stack"><div class="between"><h2>Trust checks</h2><span class="muted small">${tc.filter(t => t[1]).length} of ${tc.length}</span></div>${tc.map(t => `<div class="task ${t[1] ? 'on' : ''}" style="border:0;padding:4px 0;margin:0"><span class="tb">${t[1] ? ic('check') : ''}</span><span>${t[0]}</span></div>`).join('')}
      <p class="tiny muted">Ember cannot check certificates itself yet, so clients see qualifications marked as self-declared, with the awarding body and reference so they can check with that body.</p></section>
    ${f('name', 'Name', 'As clients know you')}${f('tag', 'What you do', 'Strength and conditioning coach')}${f('loc', 'Where', 'Castlerea, or online')}${f('spec', 'Specialisms, separated by commas', 'Hyrox, field sports, return from injury')}${f('bio', 'About you', 'Who you work with and how', 1)}
    <section class="card stack"><div class="between"><h2>Qualifications</h2><button class="link" data-act="cpQual">Add</button></div>${(pf.quals || []).map((q, i) => `<button class="entry" data-act="cpQualDel" data-i="${i}"><span class="n" style="white-space:normal">${esc(q.t)}</span><span class="k muted small">Remove</span><span class="s" style="white-space:normal">${esc([q.body, q.yr, q.ref ? 'ref ' + q.ref : ''].filter(Boolean).join(' · '))}</span></button>`).join('') || `<p class="empty">None added.</p>`}</section>
    <section class="card stack"><div class="between"><h2>Plans you offer</h2><button class="link" data-act="cpPlan">Add</button></div>${plansHtml(pf, true)}</section>
    <div class="grid2">${f('ins', 'Insurer', 'Provider name')}<label class="f">First aid valid to<input class="inp" type="month" value="${esc(pf.aid)}" data-on="cp" data-k="aid"></label></div>
    <div class="grp">How clients see you</div><div id="cpPrev">${profileCard(pf)}</div>`;
}
I.cp = el => {
  coachProfile()[el.dataset.k] = el.value;
};
A.cpQual = () => {
  openSheet(
    `${sh('Add a qualification')}<div class="sheet-b"><label class="f">Qualification<input class="inp" id="cqT" placeholder="Level 4 strength and conditioning" autocomplete="off"></label><label class="f">Awarded by<input class="inp" id="cqB" placeholder="Awarding body" autocomplete="off"></label><div class="grid2"><label class="f">Year<input class="inp" id="cqY" inputmode="numeric"></label><label class="f">Certificate or member number<input class="inp" id="cqR" autocomplete="off"></label></div></div><div class="sheet-f"><button class="btn" data-act="cpQualSave">Add</button></div>`,
  );
};
A.cpQualSave = () => {
  const t = $('#cqT').value.trim();
  if (!t) return toast('Name the qualification.');
  const pf = coachProfile();
  pf.quals = (pf.quals || []).concat([
    {
      t: t.slice(0, 80),
      body: $('#cqB').value.trim().slice(0, 60),
      yr: $('#cqY').value.trim().slice(0, 4),
      ref: $('#cqR').value.trim().slice(0, 40),
    },
  ]);
  closeSheet();
  renderProfile();
};
A.cpQualDel = ({ i }) => {
  coachProfile().quals.splice(+i, 1);
  renderProfile();
};
A.coProfileSave = () => {
  const pf = coachProfile();
  ['name', 'tag', 'loc', 'spec', 'ins'].forEach(
    k =>
      (pf[k] = String(pf[k] || '')
        .trim()
        .slice(0, 120)),
  );
  pf.bio = String(pf.bio || '')
    .trim()
    .slice(0, 600);
  saveCO();
  publishCoach();
  closeAll();
  render();
  toast('Profile saved');
};
/* The client's side: see who is coaching you, and review them once they have set you a plan. */
function coachCardForClient() {
  if (Store.owner !== false || !COACHPUB || !COACHPUB.name) return '';
  const can = P.asg && Object.keys(P.asg).length > 0,
    mine = REVIEWS.find(r => r.id === Store.uid);
  return `<div class="grp">Your coach</div>${profileCard(COACHPUB)}<button class="btn ghost" data-act="review" ${can ? '' : 'disabled'}>${ic('star')} ${mine ? 'Change my review' : 'Leave a review'}</button>${can ? '' : `<p class="tiny muted">You can review your coach once they have set you a plan.</p>`}`;
}
A.review = () => {
  const mine = REVIEWS.find(r => r.id === Store.uid) || { stars: 5, t: '' };
  let st = mine.stars;
  openSheet(
    `${sh('Review your coach')}<div class="sheet-b">${segHtml(
      'rvS',
      [1, 2, 3, 4, 5].map(n => [n, n + ' star' + (n === 1 ? '' : 's')]),
      st,
    )}<textarea class="inp" id="rvT" placeholder="What working with them has been like">${esc(mine.t)}</textarea><p class="small muted">Your coach can read this but cannot change or remove it.</p></div><div class="sheet-f"><button class="btn" data-act="reviewSave">Post review</button></div>`,
  );
  SEG.rvS = v => (st = +v);
  A.reviewSave = async () => {
    try {
      await Store.db
        .doc('reviews/' + Store.uid)
        .set({ stars: st, t: ($('#rvT').value || '').trim().slice(0, 600), d: today(), name: P.coachName || '' });
      closeSheet();
      toast('Review posted');
      loadCommunity();
    } catch (e) {
      toast('That could not be posted. Check your connection.');
    }
  };
};
A.setCoachName = () => {
  openSheet(
    `${sh('Your name')}<div class="sheet-b"><label class="f">Name your coach and squad see<input class="inp" id="cnN" value="${esc(P.coachName || '')}" autocomplete="off"></label></div><div class="sheet-f"><button class="btn" data-act="setCoachNameSave">Save</button></div>`,
  );
};
A.setCoachNameSave = () => {
  P.coachName = $('#cnN').value.trim().slice(0, 40);
  saveProfile();
  closeSheet();
  render();
  lastPub = 0;
  publishStatus();
  publishSquad(true);
};

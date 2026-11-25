/* ================= squads: one board for the week with the people you choose to train alongside =================
   A few friends, a club, a class, or the following of a coach or creator. Invite-only, by a six-letter code.
   What a member shares is a display name, this week's XP, their streak and how many sessions they have done
   this week. Nothing else leaves the diary. The database enforces who sees what (supabase/migrations, squads). */
const SQ = { list: null, boards: {}, at: 0, busy: false, err: '' };
const squadsOn = () => FEATURES.squads !== false && Store.durable && authConfigured();
const sqApi = async () => squadsApi(await supabaseClient(), Store.uid);
const sqWeek = () => weekStart(today());
const sqName = () => String(P.coachName || '').trim();
const sqStats = () => ({
  week: sqWeek(),
  xp: P.lg.xp,
  streak: streak().count,
  sessions: TR.sess.filter(s => s.kind === 'train' && s.d >= sqWeek()).length,
  ...(sqName() ? { name: sqName() } : {}),
});
const SQ_WHY = {
  not_found: 'No squad has that code. Check it and try again.',
  too_many_joined: 'You can be in five squads at most. Leave one first.',
  too_many_owned: 'You can run three squads at most.',
  squad_full: 'That squad is full.',
  not_a_member: 'You are not in that squad any more.',
  not_owner: 'Only the person who started the squad can do that.',
};
const sqWhy = e => SQ_WHY[e && e.code] || 'That did not go through. Check your connection and try again.';
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const sqShares = `<p class="tiny muted">A squad sees the name you give here, your XP for the week, your streak and how many sessions you have done this week. It never sees your food, weight, photos or anything else. Leaving takes you off the board at once.</p>`;

/* Load my squads and their boards, putting my own figures up first. At most once a minute unless asked. */
async function sqLoad(force) {
  if (DEMO || !squadsOn() || SQ.busy || (!force && SQ.list && Date.now() - SQ.at < 60000)) return;
  SQ.busy = true;
  try {
    const api = await sqApi();
    const list = await api.mine();
    if (list.length) await api.publish(sqStats());
    const boards = {};
    for (const s of list) boards[s.id] = await api.board(s.id, sqWeek()).catch(() => null);
    Object.assign(SQ, { list, boards, at: Date.now(), err: '' });
  } catch (e) {
    SQ.err = sqWhy(e);
    if (!SQ.list) SQ.list = [];
  }
  SQ.busy = false;
  if ($('#sqBody2')) renderSquad2();
  else if (!sheets.length && S.tab === 'quests') render();
}
/* after something is logged or a session finished: put the new figures on the boards, but not on every tap */
let sqTimer = 0;
function sqPublishSoon() {
  if (DEMO) return; // a preview, or a client's app being looked at: not this person's own figures
  if (!squadsOn() || !SQ.list || !SQ.list.length) return;
  clearTimeout(sqTimer);
  sqTimer = setTimeout(async () => {
    try {
      await (await sqApi()).publish(sqStats());
      SQ.at = 0;
    } catch (e) {}
  }, 15000);
}

/* the card on the Quests tab */
function squadsCard() {
  if (!squadsOn()) return '';
  if (!SQ.list) {
    sqLoad();
    return `<section class="card stack"><h2>Squads</h2><div class="busy"><div class="spinner"></div>Loading your squads</div></section>`;
  }
  if (Date.now() - SQ.at > 60000) sqLoad();
  const rows = SQ.list
    .map(s => {
      const b = SQ.boards[s.id],
        ch = s.challenge && s.challenge.goal > 0 ? s.challenge : null;
      return `<button class="sqrow" data-act="squadOpen" data-id="${s.id}"><span class="grow"><b class="ell">${esc(s.name)}</b><small>${b ? (b.rank ? 'You are ' + ordinal(b.rank) + ' of ' + b.active + ' this week' : 'Log or train to get on this week`s board') + ' · ' + b.members + (b.members === 1 ? ' member' : ' members') : 'Board not loaded'}</small>${ch && b ? `<span class="sq-ch"><span class="between tiny"><span>${esc(ch.name || 'Sessions this week')}</span><span class="tn">${b.sessions} of ${ch.goal}</span></span>${bar(b.sessions, ch.goal, b.sessions >= ch.goal ? 'good' : 'ember')}</span>` : ''}</span>${ic('chev-r')}</button>`;
    })
    .join('');
  return `<section class="card stack"><div class="between"><h2>Squads</h2>${SQ.list.length ? `<span class="muted small">${SQ.list.length} of 5</span>` : ''}</div>
    ${SQ.list.length ? `<div class="sqlist">${rows}</div>` : `<p class="small muted">Train alongside friends, a club or a coach you follow. One board for the week and one shared challenge. Invite-only.</p>`}
    ${SQ.err ? `<p class="small muted">${esc(SQ.err)}</p>` : ''}
    <div class="two"><button class="btn sm" data-act="squadJoin">Join with a code</button><button class="btn sm ghost" data-act="squadNew">Start a squad</button></div></section>`;
}

/* ---- joining and starting ---- */
A.squadJoin = ({ code } = {}) => {
  if (!squadsOn()) return toast('Sign in to join a squad.');
  openSheet(
    `${sh('Join a squad')}<div class="sheet-b"><label class="f">Squad code<input class="inp" id="sqCode" value="${esc(code || '')}" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="6 letters and numbers" style="letter-spacing:.2em;text-transform:uppercase"></label>
    <label class="f">Your name on the board<input class="inp" id="sqMe" value="${esc(sqName())}" maxlength="24" autocomplete="nickname" placeholder="First name, or a nickname"></label>${sqShares}</div>
    <div class="sheet-f"><button class="btn ember" data-act="squadJoinGo">Join</button></div>`,
  );
  $(code ? '#sqMe' : '#sqCode').focus();
};
A.squadJoinGo = async (_, el) => {
  const code = ($('#sqCode').value || '').trim().toUpperCase(),
    me = ($('#sqMe').value || '').trim().slice(0, 24);
  if (!/^[A-Z0-9]{6}$/.test(code)) return toast('The code is six letters and numbers.');
  if (!me) return toast('Add the name the squad will see.');
  el.disabled = true;
  try {
    const id = await (await sqApi()).join(code, me);
    sqKeepName(me);
    LS.del('ember:join');
    closeSheet();
    await sqLoad(true);
    A.squadOpen({ id });
    toast('You are in.');
  } catch (e) {
    el.disabled = false;
    toast(sqWhy(e));
  }
};
A.squadNew = () => {
  if (!squadsOn()) return toast('Sign in to start a squad.');
  openSheet(
    `${sh('Start a squad')}<div class="sheet-b"><label class="f">Name of the squad<input class="inp" id="sqTitle" maxlength="40" autocomplete="off" placeholder="Castlerea lifters, Saturday run club"></label>
    <label class="f">Your name on the board<input class="inp" id="sqMe" value="${esc(sqName())}" maxlength="24" autocomplete="nickname" placeholder="First name, or a nickname"></label>
    <p class="small muted">You get a code to send to the people you want in it. Up to 5,000 members, so it works for a few friends or a whole following.</p>${sqShares}</div>
    <div class="sheet-f"><button class="btn ember" data-act="squadNewGo">Start it</button></div>`,
  );
  $('#sqTitle').focus();
};
A.squadNewGo = async (_, el) => {
  const name = ($('#sqTitle').value || '').trim().slice(0, 40),
    me = ($('#sqMe').value || '').trim().slice(0, 24);
  if (name.length < 2) return toast('Give the squad a name.');
  if (!me) return toast('Add the name the squad will see.');
  el.disabled = true;
  try {
    const made = await (await sqApi()).create(name, me);
    sqKeepName(me);
    closeSheet();
    await sqLoad(true);
    A.squadOpen({ id: made.id });
  } catch (e) {
    el.disabled = false;
    toast(sqWhy(e));
  }
};
function sqKeepName(me) {
  if (me && me !== sqName()) {
    P.coachName = me;
    saveProfile();
  }
}

/* ---- one squad: the challenge, the board, the invite ---- */
let SQV = null;
A.squadOpen = ({ id }) => {
  SQV = id;
  openSheet(`${sh('Squad')}<div class="sheet-b" id="sqBody2"></div>`, true);
  renderSquad2();
  sqLoad(true);
};
const sqLink = code => location.origin + location.pathname + '#join=' + code;
function renderSquad2() {
  const el = $('#sqBody2'),
    s = (SQ.list || []).find(x => x.id === SQV);
  if (!el) return;
  if (!s) return void (el.innerHTML = `<p class="empty">That squad is no longer on your list.</p>`);
  const title = topSheet() && topSheet().querySelector('.sheet-h h3');
  if (title) title.textContent = s.name;
  const b = SQ.boards[s.id],
    ch = s.challenge && s.challenge.goal > 0 ? s.challenge : null;
  el.innerHTML = `${
    ch && b
      ? `<section class="card stack"><div class="between"><h2>${esc(ch.name || 'Sessions this week')}</h2><span class="muted small">this week</span></div><div class="row" style="align-items:baseline;gap:8px"><span class="num" style="font-size:36px;line-height:1">${b.sessions}</span><span class="muted">of ${ch.goal} sessions</span></div>${bar(b.sessions, ch.goal, b.sessions >= ch.goal ? 'good lg' : 'ember lg')}<p class="tiny muted">Every finished training session by anyone in the squad counts.</p></section>`
      : ''
  }
    <section class="card" style="padding:4px 14px">${
      !b
        ? `<div class="busy"><div class="spinner"></div>Loading the board</div>`
        : b.top.length
          ? b.top
              .map(
                (m, i) =>
                  `<div class="crow" style="cursor:default"><span class="rk tn">${i + 1}</span><span class="av">${esc(initials(m.name))}</span><span class="grow"><span class="row" style="gap:6px"><b class="ell">${esc(m.name)}</b>${m.me ? '<span class="pill gold">You</span>' : ''}</span><span class="small muted">${m.streak}-day streak · ${m.sessions} session${m.sessions === 1 ? '' : 's'}</span></span><span class="cr"><b class="tn">${fmt(m.xp)}</b><span class="tiny muted">XP</span></span></div>`,
              )
              .join('')
          : `<p class="empty">Nobody is on this week's board yet. Log something or finish a session and you are first.</p>`
    }</section>
    ${b ? `<p class="tiny muted">${b.members} ${b.members === 1 ? 'member' : 'members'}, ${b.active} on the board this week.${b.rank && b.rank > 50 ? ' You are ' + ordinal(b.rank) + '.' : ''} The board starts again every Monday.</p>` : ''}
    <section class="card stack"><h2>Invite</h2><div class="between"><span class="num sq-code">${esc(s.code)}</span><button class="btn sm" data-act="squadShare">Share the invite</button></div><p class="tiny muted">Anyone with this code can join. They choose the name the squad sees.</p></section>
    ${
      s.owned
        ? `<section class="card stack"><h2>Run the squad</h2><label class="f">Name<input class="inp" id="sqEdName" value="${esc(s.name)}" maxlength="40"></label>
      <div class="grid3" style="grid-template-columns:2fr 1fr"><label class="f">Team challenge<input class="inp" id="sqEdCh" value="${esc(ch ? ch.name || '' : '')}" maxlength="40" placeholder="Sessions this week"></label><label class="f">Sessions<input class="inp" id="sqEdGoal" inputmode="numeric" value="${ch ? ch.goal : ''}" placeholder="20"></label></div>
      <button class="btn sm" data-act="squadSave" style="align-self:flex-start">Save</button>
      <div class="row" style="gap:8px"><input class="inp" id="sqRm" placeholder="A name to take off the board" maxlength="24" autocomplete="off"><button class="btn sm ghost" data-act="squadRemove">Remove</button></div>
      <button class="link" data-act="squadDelete" style="color:var(--bad);align-self:flex-start">Delete this squad</button></section>`
        : `<button class="link" data-act="squadLeave" style="color:var(--bad);align-self:center">Leave this squad</button>`
    }${sqShares}`;
}
A.squadShare = async () => {
  const s = (SQ.list || []).find(x => x.id === SQV);
  if (!s) return;
  const text = 'Join ' + s.name + ' on Ember. Code ' + s.code + '.',
    url = sqLink(s.code);
  try {
    if (navigator.share) return await navigator.share({ title: s.name, text, url });
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(text + ' ' + url);
    toast('Invite copied. Paste it wherever you like.');
  } catch (e) {
    toast('Share the code ' + s.code + '.');
  }
};
A.squadSave = async () => {
  const name = ($('#sqEdName').value || '').trim().slice(0, 40),
    goal = clamp(r0(num($('#sqEdGoal').value)), 0, 100000),
    chName = ($('#sqEdCh').value || '').trim().slice(0, 40);
  if (name.length < 2) return toast('The squad needs a name.');
  try {
    await (
      await sqApi()
    ).edit(SQV, { name, challenge: goal > 0 ? { name: chName || 'Sessions this week', goal } : null });
    toast('Saved');
    sqLoad(true);
  } catch (e) {
    toast(sqWhy(e));
  }
};
A.squadRemove = async () => {
  const name = ($('#sqRm').value || '').trim();
  if (!name) return toast('Type the name exactly as it shows on the board.');
  try {
    const n = await (await sqApi()).remove(SQV, name);
    toast(n ? n + (n === 1 ? ' member removed' : ' members removed') : 'Nobody on the board goes by that name.');
    sqLoad(true);
  } catch (e) {
    toast(sqWhy(e));
  }
};
const sqSure = (el, words) => {
  if (el.dataset.sure === '1') return true;
  el.dataset.sure = '1';
  el.textContent = words;
  return false;
};
A.squadLeave = async (_, el) => {
  if (!sqSure(el, 'Tap again to leave')) return;
  try {
    await (await sqApi()).leave(SQV);
    closeSheet();
    toast('You have left the squad.');
    sqLoad(true);
  } catch (e) {
    toast(sqWhy(e));
  }
};
A.squadDelete = async (_, el) => {
  if (!sqSure(el, 'Tap again to delete it for everyone')) return;
  try {
    await (await sqApi()).destroy(SQV);
    closeSheet();
    toast('Squad deleted.');
    sqLoad(true);
  } catch (e) {
    toast(sqWhy(e));
  }
};

/* ---- an invite link: …#join=ABC234. Kept through sign-in and setup, then offered once the app is open. ---- */
function sqNoteInvite() {
  const m = /^#join=([A-Za-z0-9]{6})$/.exec(location.hash);
  if (!m) return;
  LS.set('ember:join', m[1].toUpperCase());
  history.replaceState(null, '', location.pathname + location.search + '#quests');
}
sqNoteInvite();
window.addEventListener('hashchange', () => {
  sqNoteInvite();
  sqOfferInvite();
});
function sqOfferInvite() {
  const code = LS.get('ember:join');
  if (!code || !squadsOn() || !S.ready || !P || !P.onboarded || sheets.length || celeOpen) return;
  LS.del('ember:join');
  S.tab = 'quests';
  render();
  A.squadJoin({ code });
}

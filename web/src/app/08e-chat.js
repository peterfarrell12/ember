/* ---------- messaging: one thread per client. Live for people in your Claude organisation; a kept record with copy-out for everyone else ---------- */
const CHAT_MAX = 80;
const mkMsg = (f, t) => ({ id: newId(), f, t: String(t).slice(0, 800), ts: Date.now() });
const legacyMsgs = list =>
  (list || []).map((m, i) => ({ id: 'l' + m.d + i, f: 'c', t: m.t, ts: pdate(m.d).getTime() + i * 60000 }));
const SAMPLE_REPLIES = [
  'Thanks, that helps. Will do.',
  'Got it. I will let you know how it goes.',
  'Sounds good, talk next week.',
];
/* Coach side: the whole thread with one client, oldest first. */
function threadOf(c) {
  if (!c) return [];
  let th;
  if (c.kind === 'me') th = P.thread || legacyMsgs(P.cmsgs);
  else {
    const r = CO.clients[c.id] || {};
    th = r.thread || legacyMsgs(r.msgs);
    if (c.kind === 'sample' && !r.thread)
      th = th.flatMap((m, i) => [
        m,
        { id: m.id + 'r', f: 'u', t: SAMPLE_REPLIES[i % SAMPLE_REPLIES.length], ts: m.ts + 3 * 3600e3 },
      ]);
    if (c.kind === 'live') {
      const inn = (LIVE[c.uid] || {}).msgs || [];
      th = th.concat(inn.filter(m => !th.some(x => x.id === m.id)));
    }
  }
  return th.slice().sort((a, b) => a.ts - b.ts);
}
const myThread = () => (P.thread || legacyMsgs(P.cmsgs)).slice().sort((a, b) => a.ts - b.ts);
const coachSeen = c =>
  c.kind === 'me'
    ? P.seenU || 0
    : c.kind === 'sample' && !(CO.clients[c.id] || {}).seen
      ? Infinity
      : (CO.clients[c.id] || {}).seen || 0;
const unreadFrom = c => threadOf(c).filter(m => m.f === 'u' && m.ts > coachSeen(c)).length;
const myUnread = () => (!FEATURES.coach ? 0 : myThread().filter(m => m.f === 'c' && m.ts > (P.seenC || 0)).length);
const CHAT_QUICK = {
  c: ['Great work this week.', 'How did the session feel?', 'Send me a check-in when you can.'],
  u: ['Done for today.', 'Can we move my next session?', 'Feeling good after that one.'],
};

let CH = null,
  chTimer = 0;
A.chat = ({ id } = {}) => {
  const coach = isCoach() && !!id,
    c = coach ? getClient(id) : null;
  if (coach && !c) return;
  const own = c && (c.kind === 'manual' || c.kind === 'sample');
  CH = { side: coach ? 'coach' : 'me', cid: id || '', as: 'c' };
  const sub = !coach
    ? (coachingOn() ? !hasCoach() : Store.owner !== false)
      ? 'This thread is with yourself in coach view. Switch views to answer as the coach.'
      : 'Your coach sees replies the next time they open Ember.'
    : c.kind === 'live'
      ? 'Uses Ember. Messages arrive in their app.'
      : c.kind === 'me'
        ? 'You, as your own client. Switch to My view to see it arrive.'
        : c.kind === 'sample'
          ? 'Sample client. Nothing is sent anywhere.'
          : 'Not on Ember. Sending keeps a record and copies the message for WhatsApp or a text.';
  openSheet(
    `<div class="sheet-h"><div class="grow" style="min-width:0"><h3 class="ell">${coach ? esc(c.name) : 'Your coach'}</h3><div class="tiny muted" style="line-height:1.3">${sub}</div></div><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div>
    <div class="sheet-b chat" id="chBody"></div>
    <div class="chat-f"><div class="also ch-q">${CHAT_QUICK[coach ? 'c' : 'u'].map(q => `<button data-act="chatQuick">${esc(q)}</button>`).join('')}</div>
      ${
        own
          ? segHtml(
              'chatAs',
              [
                ['c', 'From you'],
                ['u', 'Log their reply'],
              ],
              'c',
            )
          : ''
      }
      <div class="row" style="align-items:flex-end;gap:8px"><textarea class="inp" id="chT" rows="1" placeholder="Write a message" autocapitalize="sentences"></textarea>${coach && c.kind !== 'me' ? `<button class="icon-btn solid" data-act="chatDraft" aria-label="Draft a message with Claude">${ic('spark')}</button>` : ''}<button class="btn sm ember" data-act="chatGo" aria-label="Send">${ic('send')}</button></div></div>`,
    true,
  );
  SEG.chatAs = v => {
    CH.as = v;
    $('#chT').placeholder = v === 'u' ? 'Type what they said' : 'Write a message';
  };
  const fast = coachingOn() ? setInterval(cgMsgs, 5000) : 0; // between two accounts, new messages show within seconds
  sheets[sheets.length - 1]._onClose = () => {
    CH = null;
    clearInterval(chTimer);
    clearInterval(fast);
    render();
    if ($('#ccBody')) renderClient();
  };
  chatSeen();
  renderChat();
  if (Store.mode === 'cloud' && (!coach || c.kind === 'live'))
    chTimer = setInterval(async () => {
      if (!CH) return;
      if (CH.side === 'coach') await loadLive();
      else await pullAssign();
      if (CH) {
        chatSeen();
        renderChat();
      }
    }, 20000);
};
function chatSeen() {
  if (!CH) return;
  if (CH.side === 'me') {
    if (myUnread() || P.coachMsg) {
      P.seenC = Date.now();
      P.coachMsg = null;
      saveProfile();
    }
    return;
  }
  const c = getClient(CH.cid);
  if (!c || !unreadFrom(c)) return;
  if (c.kind === 'me') {
    P.seenU = Date.now();
    saveProfile();
  } else {
    recOf(c.id).seen = Date.now();
    saveCO();
  }
}
function renderChat() {
  const b = $('#chBody');
  if (!b || !CH) return;
  const th = CH.side === 'coach' ? threadOf(getClient(CH.cid)) : myThread(),
    mine = CH.side === 'coach' ? 'c' : 'u';
  let last = '';
  b.innerHTML = th.length
    ? th
        .map(m => {
          const dk = dkey(new Date(m.ts)),
            sep = dk !== last ? `<div class="ch-d">${niceDate(dk)}</div>` : '';
          last = dk;
          return (
            sep +
            `<div class="bub ${m.f === mine ? 'me' : ''}"><p>${esc(m.t)}</p><span class="tn">${hm(m.ts)}</span></div>`
          );
        })
        .join('')
    : `<p class="empty" style="text-align:center;padding:40px 12px">${CH.side === 'coach' ? 'No messages yet. A short note after a session goes a long way.' : 'No messages yet. Ask your coach anything about your plan.'}</p>`;
  b.scrollTop = b.scrollHeight;
}
A.chatQuick = (_, el) => {
  const t = $('#chT');
  t.value = el.textContent;
  t.focus();
};
A.chatGo = async () => {
  const box = $('#chT'),
    text = (box.value || '').trim();
  if (!text || !CH) return;
  let copy = '';
  if (CH.side === 'me' && hasCoach()) {
    // two real accounts: the message goes on the conversation both of them read
    if (!(await cgSendMsg(CG.coach.id, text))) return;
    P.seenC = Date.now();
    saveProfile();
  } else if (CH.side === 'me') {
    P.thread = myThread()
      .concat([mkMsg('u', text)])
      .slice(-CHAT_MAX);
    P.seenC = Date.now();
    saveProfile();
    lastPub = 0;
    publishStatus();
  } else {
    const c = getClient(CH.cid),
      m = mkMsg(CH.as === 'u' && c.kind !== 'me' && c.kind !== 'live' ? 'u' : 'c', text);
    if (c.kind === 'live' && c.link && coachingOn()) {
      if (!(await cgSendMsg(c.link, text))) return;
      recOf(c.id).seen = Date.now();
      saveCO();
    } else if (c.kind === 'me') {
      P.thread = threadOf(c).concat([m]).slice(-CHAT_MAX);
      P.seenU = Date.now();
      saveProfile();
    } else {
      const r = recOf(c.id),
        th = (r.thread || (c.kind === 'sample' ? threadOf(c) : legacyMsgs(r.msgs))).concat([m]).slice(-CHAT_MAX);
      if (c.kind === 'live' && !(await pushAssign(c.uid, 'chat', { list: th.filter(x => x.f === 'c').slice(-30) })))
        return;
      r.thread = th;
      r.seen = Date.now();
      saveCO();
      if (m.f === 'c' && c.kind === 'manual') copy = m.t;
    }
  }
  box.value = '';
  renderChat();
  if (copy) copyText(copy, 'Saved and copied. Paste it into a message to them.');
};
A.chatDraft = async () => {
  if (!AI.sample) return toast('Drafting needs Claude, which is not available in this view.');
  const c = getClient(CH.cid),
    st = c.st || {},
    box = $('#chT'),
    was = box.value;
  box.value = 'Drafting…';
  try {
    const r = await AI.sample.json(
      [
        'chat_draft',
        {
          name: c.name,
          p1: c.goal || 'not stated',
          p2: st.sess7 ?? 'unknown',
          p3: st.plan7 || 'none',
          p4: st.progN || 'no program',
          p5: st.logged7 ?? 'unknown',
          p6: st.kcalAvg || 'unknown',
          p7: st.kcalT || 'no target',
          p8: st.kg ?? 'unknown',
          p9: st.ready ?? 'not checked in',
          p10: alertsFor(st).join('; ') || 'none',
          p11:
            threadOf(c)
              .slice(-6)
              .map(m => (m.f === 'c' ? 'Coach: ' : 'Client: ') + m.t)
              .join('\n') || 'none',
        },
      ],
      { cache: false },
    );
    if (CH && $('#chT')) $('#chT').value = String((r && r.text) || '').slice(0, 800) || was;
  } catch (e) {
    if ($('#chT')) $('#chT').value = was;
    toast(aiError(e));
  }
};
/* A one-line way into the thread, for Today and Train. */
function msgStrip() {
  if (!FEATURES.coach) return '';
  const th = myThread();
  if (!th.length && Store.owner !== false) return '';
  const n = myUnread(),
    last = th[th.length - 1];
  return `<button class="pstrip ${n ? 'hot' : ''}" data-act="chat">${ic('chat')}<span class="grow"><b>${n ? (n === 1 ? 'New message from your coach' : n + ' new messages from your coach') : 'Messages with your coach'}</b><small class="ell">${last ? esc((last.f === 'u' ? 'You: ' : '') + last.t) : 'Ask anything about your plan.'}</small></span>${n ? `<span class="pill bad">${n}</span>` : ic('chev-r')}</button>`;
}
/* Coach view: every thread with something in it, unread first. */
function inboxCard() {
  const rows = clientList()
    .map(c => ({ c, th: threadOf(c), n: unreadFrom(c) }))
    .filter(x => x.th.length)
    .sort((a, b) => (b.n > 0) - (a.n > 0) || b.th[b.th.length - 1].ts - a.th[a.th.length - 1].ts);
  return `<section class="card" style="padding:4px 14px 6px"><div class="between" style="padding:10px 0 2px"><h2>Messages</h2><span class="muted small">${rows.filter(x => x.n).length} unread</span></div>${
    rows.length
      ? rows
          .slice(0, 12)
          .map(({ c, th, n }) => {
            const m = th[th.length - 1];
            return `<button class="crow" data-act="chat" data-id="${c.id}"><span class="av">${esc(initials(c.name))}</span><span class="grow" style="min-width:0"><span class="row" style="gap:6px"><b class="ell">${esc(c.name)}</b>${kindPill(c)}<span class="tiny muted" style="margin-left:auto;white-space:nowrap">${niceDate(dkey(new Date(m.ts)))}</span></span><span class="small ${n ? '' : 'muted'} ell" style="display:block">${esc((m.f === 'c' ? 'You: ' : '') + m.t)}</span></span>${n ? `<span class="pill bad">${n}</span>` : ''}</button>`;
          })
          .join('')
      : `<p class="empty" style="padding-bottom:10px">Open a client and tap Message to start a thread.</p>`
  }</section>`;
}

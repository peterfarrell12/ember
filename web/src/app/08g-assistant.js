/* ---------- the assistant: talk or type; it asks what it needs, shows what it will save, then the app does it ---------- */
let AS = null,
  TTS;
const AS_LOG = [];
async function ttsGet() {
  if (TTS === undefined) {
    try {
      TTS = (window.claude && (await window.claude.use('tts'))) || null;
    } catch (e) {
      TTS = null;
    }
  }
  return TTS;
}
const synthOk = () => {
  try {
    return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  } catch (e) {
    return false;
  }
};
const asVoiceOut = () => !!TTS || synthOk();
async function asSpeak(text) {
  if (!AS || P.asMute || !text) return false;
  const t = await ttsGet();
  const done = () => {
    if (AS) {
      AS.speaking = false;
      asMic();
    }
  };
  if (t) {
    try {
      AS.speaking = true;
      asMic();
      await t.speak(String(text).slice(0, 1900));
      return true;
    } catch (e) {
      if (e && e.code === 'not_granted') TTS = null;
      return false;
    } finally {
      done();
    }
  }
  if (!synthOk()) return false;
  return new Promise(res => {
    try {
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'en-IE';
      u.rate = 1.05;
      u.onend = () => {
        done();
        res(true);
      };
      u.onerror = () => {
        done();
        res(false);
      };
      AS.speaking = true;
      asMic();
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      setTimeout(() => {
        done();
        res(false);
      }, 25000);
    } catch (e) {
      done();
      res(false);
    }
  });
}
function asHush() {
  try {
    if (TTS) TTS.stop();
    else if (synthOk()) speechSynthesis.cancel();
  } catch (e) {}
  if (AS) AS.speaking = false;
}

A.assistant = async () => {
  if (AS) return;
  if (!AI.sample)
    return toast(
      AI.ready
        ? 'The assistant needs Claude, which is not available in this view.'
        : 'Still connecting. Try again in a moment.',
    );
  AS = {
    pend: null,
    busy: false,
    listening: false,
    speaking: false,
    buf: '',
    timer: 0,
    chips: [],
    voice: false,
    after: null,
  };
  if (S.date !== today()) {
    try {
      await loadDay(today());
      S.date = today();
      render();
    } catch (e) {
      AS = null;
      return;
    }
  }
  openSheet(
    `<div class="sheet-h"><div class="grow"><h3>Assistant</h3><div class="tiny muted" id="asSub">Say what you ate, ask how the day is going, or have it move a session.</div></div><button class="icon-btn hide" id="asSpk" data-act="asMute" aria-label="Spoken replies"></button><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div>
    <div class="sheet-b chat" id="asBody"></div>
    <div class="chat-f"><div class="also ch-q" id="asChips"></div><div class="as-live hide" id="asLive"></div>
      <div class="row" style="align-items:flex-end;gap:8px">${AI.dict ? `<button class="mic as-mic" id="asMic" data-act="asMic" aria-label="Talk">${ic('mic')}</button>` : ''}<textarea class="inp" id="asT" rows="1" placeholder="${AI.dict ? 'Or type it' : 'Type, or use the microphone key on your keyboard'}" autocapitalize="sentences"></textarea><button class="btn sm ember" data-act="asGo" aria-label="Send">${ic('send')}</button></div></div>`,
    true,
  );
  sheets[sheets.length - 1]._onClose = () => {
    const a = AS;
    AS = null;
    clearTimeout(a.timer);
    if (a.listening && AI.dict) AI.dict.stop().catch(() => {});
    try {
      if (TTS) TTS.stop();
      else if (synthOk()) speechSynthesis.cancel();
    } catch (e) {}
    render();
  };
  if (!AS_LOG.length) {
    AS_LOG.push({
      r: 'a',
      t: 'What can I do for you? Tell me what you ate and I will work it out, asking if I need more.',
    });
    AS.chips = ['I had a fry this morning', 'How am I doing today?', 'What is my next session?'];
  }
  renderAs();
  ttsGet().then(asSpkBtn);
  loadDB('gen');
  loadDB('br');
  loadGym();
};
function asSpkBtn() {
  const b = $('#asSpk');
  if (!b || !AS) return;
  b.classList.toggle('hide', !asVoiceOut());
  b.innerHTML = ic(P.asMute ? 'x' : 'pulse');
  b.title = P.asMute ? 'Spoken replies are off' : 'Spoken replies are on';
  b.classList.toggle('solid', !P.asMute);
  const s = $('#asSub');
  if (s && !asVoiceOut()) s.textContent = 'Replies show as text here. Spoken replies are not available in this view.';
}
A.asMute = () => {
  P.asMute = !P.asMute;
  saveProfile();
  if (P.asMute) asHush();
  asSpkBtn();
  toast(P.asMute ? 'Spoken replies off' : 'Spoken replies on');
};
function asMic() {
  const b = $('#asMic');
  if (!b || !AS) return;
  b.classList.toggle('on', AS.listening);
  b.innerHTML = ic(AS.speaking ? 'x' : 'mic');
  b.setAttribute('aria-label', AS.speaking ? 'Stop talking' : AS.listening ? 'Stop listening' : 'Talk');
  const l = $('#asLive');
  if (l) {
    l.classList.toggle('hide', !AS.listening);
    if (AS.listening && !l.textContent) l.textContent = 'Listening…';
  }
}
A.asMic = () => {
  if (!AS || !AI.dict) return;
  if (AS.speaking) return (asHush(), asMic());
  if (AS.listening) return void AI.dict.stop().catch(() => {});
  if (AS.busy) return;
  AS.buf = '';
  const l = $('#asLive');
  if (l) l.textContent = '';
  AI.dict.start().catch(e => {
    if (e && e.code === 'not_granted') {
      AI.dict = null;
      const b = $('#asMic');
      if (b) b.remove();
      toast('Dictation is off for this page. Type, or use the microphone key on your keyboard.');
    } else toast('Dictation did not start. Try again.');
  });
};
/* called from the shared dictation listeners */
function asDict(kind, v) {
  if (!AS) return;
  const l = $('#asLive');
  if (kind === 'state') {
    AS.listening = v === 'listening';
    asMic();
    if (!AS.listening) {
      clearTimeout(AS.timer);
      const t = AS.buf.trim();
      AS.buf = '';
      if (t) {
        AS.voice = true;
        asSend(t);
      }
    }
    return;
  }
  if (kind === 'partial') {
    if (l) l.textContent = (AS.buf + ' ' + (v || '')).trim() || 'Listening…';
    if (v) clearTimeout(AS.timer);
    return;
  }
  if (v) {
    AS.buf = (AS.buf + ' ' + v).trim();
    if (l) l.textContent = AS.buf;
    clearTimeout(AS.timer);
    AS.timer = setTimeout(() => {
      if (AS && AS.listening && AI.dict) AI.dict.stop().catch(() => {});
    }, 1600);
  }
}
A.asGo = () => {
  const b = $('#asT'),
    t = (b.value || '').trim();
  if (!t) return;
  b.value = '';
  AS.voice = false;
  asSend(t);
};
A.asChip = (_, el) => {
  AS.voice = false;
  asSend(el.textContent);
};
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'asT') {
    e.preventDefault();
    A.asGo();
  }
});

function renderAs() {
  const b = $('#asBody');
  if (!b || !AS) return;
  const p = AS.pend;
  let card = '';
  if (p && p.kind === 'food') {
    const k = p.items.reduce((s, it) => s + (it.food.k * it.g) / 100, 0),
      pr = p.items.reduce((s, it) => s + (it.food.p * it.g) / 100, 0);
    card = `<div class="as-card"><div class="between"><b>Log to ${MEALS[p.meal].toLowerCase()}?</b><span class="tn"><b>${fmt(k)}</b> kcal, ${r0(pr)} g protein</span></div>${p.items.map(it => `<div class="as-it"><span class="grow"><span class="ell" style="display:block;font-weight:600">${esc(it.food.n)}</span><span class="tiny muted row" style="gap:6px">${srcBadge(it.food.src)}${r0(it.g)} g</span></span><b class="tn">${fmt((it.food.k * it.g) / 100)}</b></div>`).join('')}
      <div class="opts" style="margin-top:8px">${Object.entries(MEALS)
        .map(([m, n]) => `<button data-act="asMeal" data-v="${m}" aria-pressed="${p.meal === m}">${n}</button>`)
        .join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="asEdit">Change amounts</button><button class="btn sm ghost" data-act="asNo">Cancel</button><button class="btn sm ember" style="flex:1" data-act="asYes">Log it</button></div></div>`;
  } else if (p) {
    const q =
      p.kind === 'remove'
        ? 'Remove ' + p.names + ' (' + fmt(p.k) + ' kcal) from today?'
        : p.kind === 'msg'
          ? 'Send this to your coach?'
          : 'Change your daily targets to ' + fmt(p.k) + ' kcal' + (p.p ? ' and ' + p.p + ' g protein' : '') + '?';
    card = `<div class="as-card"><b>${esc(q)}</b>${p.kind === 'msg' ? `<p class="small" style="margin-top:6px">${esc(p.text)}</p>` : ''}<div class="row" style="margin-top:10px"><button class="btn sm ghost" data-act="asNo">Cancel</button><button class="btn sm ember" style="flex:1" data-act="asYes">${p.kind === 'remove' ? 'Remove' : p.kind === 'msg' ? 'Send' : 'Change'}</button></div></div>`;
  }
  b.innerHTML =
    AS_LOG.slice(-40)
      .map(m =>
        m.r === 'app'
          ? `<div class="as-note">${ic('check')}<span>${esc(m.t)}</span></div>`
          : `<div class="bub ${m.r === 'u' ? 'me' : ''}"><p>${esc(m.t)}</p></div>`,
      )
      .join('') +
    card +
    (AS.busy ? `<div class="bub as-dots" aria-label="Thinking"><i></i><i></i><i></i></div>` : '');
  $('#asChips').innerHTML = (p ? ['Yes, log it', 'No, cancel'] : AS.chips || [])
    .slice(0, 3)
    .map(c => `<button data-act="asChip">${esc(c)}</button>`)
    .join('');
  b.scrollTop = b.scrollHeight;
  asMic();
}
A.asYes = () => asConfirm(true);
A.asNo = () => asConfirm(false);
A.asMeal = ({ v }) => {
  if (AS.pend && AS.pend.kind === 'food') {
    AS.pend.meal = v;
    renderAs();
  }
};
A.asEdit = () => {
  const p = AS.pend;
  if (!p || p.kind !== 'food') return;
  openReview(p.items, {
    meal: p.meal,
    onDone: () => {
      p.items = REV.items.filter(it => it.g > 0);
      if (!p.items.length) AS.pend = null;
      renderAs();
    },
  });
};

async function asSend(text) {
  if (!AS || AS.busy || !text) return;
  asHush();
  AS_LOG.push({ r: 'u', t: String(text).slice(0, 600) });
  if (
    AS.pend &&
    /^(yes|yeah|yep|yup|ok|okay|sure|go on|go ahead|log it|do it|save it|send it|correct|that'?s right|right|perfect|grand|spot on)\b/i.test(
      text,
    )
  )
    return asConfirm(true);
  if (AS.pend && /^(no|nope|cancel|scrap|forget it|never ?mind|stop)\b/i.test(text)) return asConfirm(false);
  AS.busy = true;
  AS.chips = [];
  renderAs();
  try {
    const r = await AI.sample.json(asPrompt(), { cache: false });
    if (!AS) return;
    AS.busy = false;
    await asHandle(r || {});
  } catch (e) {
    if (!AS) return;
    AS.busy = false;
    AS_LOG.push({ r: 'a', t: aiError(e) });
    renderAs();
  }
}
async function asHandle(r) {
  const say = String(r.say || '').slice(0, 700),
    acts = Array.isArray(r.actions) ? r.actions.slice(0, 5) : [];
  AS.chips = Array.isArray(r.chips) ? r.chips.map(c => String(c).slice(0, 90)) : [];
  if (acts.some(a => a && ['food', 'remove_food', 'message_coach', 'set_target'].includes(a.do))) AS.pend = null;
  if (say) AS_LOG.push({ r: 'a', t: say });
  const notes = [];
  for (const a of acts) {
    try {
      const n = await asDo(a || {});
      if (n) notes.push(n);
    } catch (e) {
      notes.push('That did not work: ' + (a && a.do));
    }
    if (!AS) return;
  }
  notes.forEach(n => AS_LOG.push({ r: 'app', t: n }));
  renderAs();
  await asSpeak([say].concat(notes).join(' '));
  if (!AS) return;
  if (AS.after) {
    const fn = AS.after;
    AS.after = null;
    closeAll();
    return fn();
  }
  if (AS.voice && AI.dict && !AS.listening && !AS.busy && (AS.pend || /\?\s*$/.test(say))) A.asMic();
}
async function asConfirm(yes) {
  const p = AS.pend;
  AS.pend = null;
  if (!p) return;
  let note = 'Cancelled. Nothing was saved.';
  if (yes && p.kind === 'food') {
    const es = p.items.map(it => ({ ...portion(it.food, it.g), m: p.meal, u: r0(it.g) + ' g' }));
    p.items.forEach(it => {
      if (it.food.src !== 'AI') remember(it.food, it.g, 'g', p.meal);
    });
    await logEntries(es, 'say', { keep: true, quiet: true });
    const l = leftNow();
    note =
      'Logged ' +
      es.length +
      (es.length === 1 ? ' item, ' : ' items, ') +
      fmt(es.reduce((s, e) => s + e.k, 0)) +
      ' kcal, to ' +
      MEALS[p.meal].toLowerCase() +
      '. You have ' +
      fmt(l.k) +
      ' kcal and ' +
      l.p +
      ' g of protein left today.';
  } else if (yes && p.kind === 'remove') {
    const d = await loadDay(today());
    dropEntries(d, p.ids);
    commitDay(d);
    note = 'Removed ' + p.names + '.';
  } else if (yes && p.kind === 'msg') {
    P.thread = myThread()
      .concat([mkMsg('u', p.text)])
      .slice(-CHAT_MAX);
    P.seenC = Date.now();
    saveProfile();
    lastPub = 0;
    publishStatus();
    note = 'Sent to your coach.';
  } else if (yes && p.kind === 'target') {
    P.t.k = p.k;
    if (p.p) P.t.p = p.p;
    P.t.c = Math.max(50, Math.round((P.t.k - P.t.p * 4 - P.t.f * 9) / 4 / 5) * 5);
    saveProfile();
    render();
    note = 'Targets changed to ' + fmt(P.t.k) + ' kcal and ' + P.t.p + ' g protein.';
  }
  if (!AS) return;
  AS_LOG.push({ r: 'app', t: note });
  AS.chips = [];
  renderAs();
  await asSpeak(note);
}
const asDate = v => (/^\d{4}-\d\d-\d\d$/.test(String(v || '')) ? v : '');
/* one requested action; returns a line telling Claude and the person what happened */
async function asDo(a) {
  const tk = today(),
    d = await loadDay(tk);
  switch (a.do) {
    case 'food': {
      await ensureDB();
      const items = await matchAll((Array.isArray(a.items) ? a.items : []).slice(0, 15));
      if (!items.length) return 'No foods could be worked out from that.';
      AS.pend = { kind: 'food', items, meal: MEALS[a.meal] ? a.meal : mealNow() };
      return '';
    }
    case 'remove_food': {
      const q = String(a.match || '')
          .toLowerCase()
          .trim(),
        hits = d.e.filter(e => q && e.n.toLowerCase().includes(q) && (!MEALS[a.meal] || e.m === a.meal));
      if (!hits.length) return 'Nothing in today\'s diary matches "' + String(a.match || '') + '".';
      AS.pend = {
        kind: 'remove',
        ids: hits.map(e => e.id),
        names: hits.map(e => e.n).join(', '),
        k: hits.reduce((s, e) => s + e.k, 0),
      };
      return '';
    }
    case 'water': {
      const ml = clamp(r0(num(a.ml)), -3000, 3000);
      if (!ml) return '';
      await A.water({ n: ml });
      return (
        (ml > 0 ? 'Added ' : 'Took off ') +
        Math.abs(ml) +
        ' ml of water. ' +
        fmt(day().w) +
        ' of ' +
        fmt(P.t.w) +
        ' ml today.'
      );
    }
    case 'caffeine': {
      const dr = DRINK[a.drink] || DRINK.filter,
        s = drinkAsks(dr)
          ? {
              ...drinkDefault(dr),
              ...(MILKS[a.milk] ? { milk: a.milk } : {}),
              ...(a.ml != null ? { ml: clamp(r0(num(a.ml)), 0, 600) } : {}),
              su: clamp(r0(num(a.sugar)), 0, 4),
              zero: a.sugar_free ? 1 : 0,
              cal: a.with_calories !== false,
            }
          : null;
      if (s && s.milk !== 'none' && !(s.ml > 0)) s.ml = dr.ml || 30;
      const k = s ? drinkNut(dr, s).k : 0;
      await cafLog(dr, s);
      return (
        'Logged ' + dr.n + ': ' + dr.mg + ' mg of caffeine' + (s && s.cal && k >= 5 ? ' and ' + k + ' kcal' : '') + '.'
      );
    }
    case 'weight': {
      const kg = r1(num(a.kg));
      if (kg < 25 || kg > 400) return 'That weight did not look right, so it was not saved.';
      const had = P.wts.some(w => w.d === tk);
      P.wts = P.wts
        .filter(w => w.d !== tk)
        .concat([{ d: tk, kg }])
        .sort((x, y) => (x.d < y.d ? -1 : 1));
      P.kg = P.wts[P.wts.length - 1].kg;
      if (!had) {
        P.st.weigh++;
        grant(10, 0, d, 'Weigh-in');
      }
      commitDay(d);
      return 'Weigh-in saved: ' + kg + ' kg.';
    }
    case 'exercise': {
      const nm = String(a.name || 'Exercise').slice(0, 40),
        lo = nm.toLowerCase(),
        sp =
          SPORTS.find(s => s[0].toLowerCase() === lo) ||
          SPORTS.find(s => lo.includes(s[0].split(',')[0].toLowerCase())),
        min = clamp(r0(num(a.minutes, 30)), 1, 600);
      const k =
          num(a.kcal) > 0
            ? r0(num(a.kcal))
            : xk(sp ? sp[1] : 5, a.effort === 'easy' ? 0.85 : a.effort === 'hard' ? 1.2 : 1, min),
        x = { id: newId(), n: sp ? sp[0] : nm, k, min, src: 'm' };
      d.x.push(x);
      xlogAdd(d.date, x);
      commitDay(d);
      return 'Logged ' + x.n + ': ' + min + ' minutes, about ' + k + ' kcal.';
    }
    case 'checkin': {
      const v = {
          h: clamp(num(a.sleep_hours, 7.5), 3, 10),
          q: clamp(r0(num(a.sleep_quality, 3)), 1, 5),
          so: clamp(r0(num(a.soreness, 2)), 1, 5),
          en: clamp(r0(num(a.energy, 3)), 1, 5),
          st: clamp(r0(num(a.stress, 2)), 1, 5),
        },
        first = !TR.ready[tk],
        score = readyScore(v);
      TR.ready[tk] = { ...v, score };
      saveTR();
      if (first) {
        P.st.ready = (P.st.ready || 0) + 1;
        grant(5, 0, d, 'Check-in');
      }
      commitDay(d);
      return 'Recovery check-in saved. Score ' + score + ': ' + readyBand(score)[0].toLowerCase() + '.';
    }
    case 'event': {
      const dt = asDate(a.date) || tk,
        e = {
          id: newId(),
          k: PLAN_KINDS[a.kind] ? a.kind : 'other',
          t: String(a.title || '').slice(0, 60) || 'Event',
          tm: /^\d\d:\d\d$/.test(a.time || '') ? a.time : '',
          min: clamp(r0(num(a.minutes)), 0, 600),
        };
      if (a.weekly) {
        e.wd = wdOf(dt);
        e.from = dt;
        e.d = '';
      } else {
        e.wd = null;
        e.d = dt;
      }
      plan().ev.push(e);
      planSave();
      return (
        'Added ' +
        e.t +
        ' to your calendar, ' +
        (a.weekly ? 'every ' + WDL[e.wd] : shortDate(dt)) +
        (e.tm ? ' at ' + e.tm : '') +
        '.'
      );
    }
    case 'move_session': {
      const f = asDate(a.from),
        to = asDate(a.to);
      if (!f || !to || to < tk) return 'Those dates did not make sense, so nothing moved.';
      if (!trainPlanned(f)) return 'No session is planned on ' + shortDate(f) + '.';
      plan().moved[moveOrigin(f)] = to;
      planSave();
      return 'Moved the session from ' + shortDate(f) + ' to ' + shortDate(to) + '.';
    }
    case 'skip_session': {
      const f = asDate(a.date);
      if (!f || !trainPlanned(f)) return 'No session is planned on that day.';
      const pl = plan(),
        o = moveOrigin(f);
      delete pl.moved[o];
      pl.skip[o] = 1;
      planSave();
      return 'Skipped the session on ' + shortDate(f) + '. The ones after it move up.';
    }
    case 'start_session':
      if (!activeProg()) return 'There is no program set, so there is no session to start.';
      AS.after = () => A.trainStart();
      return '';
    case 'message_coach': {
      const t = String(a.text || '')
        .trim()
        .slice(0, 800);
      if (!t) return '';
      AS.pend = { kind: 'msg', text: t };
      return '';
    }
    case 'set_target': {
      const k = r0(num(a.kcal)),
        p = r0(num(a.protein));
      if (k < 1000 || k > 6000) return 'That calorie target did not look right.';
      AS.pend = { kind: 'target', k, p: p >= 30 && p <= 400 ? p : 0 };
      return '';
    }
    case 'book_class':
    case 'cancel_class': {
      await loadGym();
      const dt = asDate(a.date) || tk,
        q = String(a.class || '').toLowerCase(),
        c = classesOn(dt)
          .filter(x => x.n.toLowerCase().includes(q) || q.includes(x.n.toLowerCase()))
          .sort((x, y) => (x.tm === a.time ? -1 : 0) - (y.tm === a.time ? -1 : 0))[0];
      if (!c) return 'There is no ' + (a.class || 'such') + ' class on ' + shortDate(dt) + '.';
      if (a.do === 'cancel_class') {
        const r = gCancel(dt, c, 'me');
        render();
        return r === 'none'
          ? 'You were not booked into ' + c.n + ' on ' + shortDate(dt) + '.'
          : 'Cancelled ' +
              c.n +
              ' on ' +
              shortDate(dt) +
              (r === 'late' ? '. It was a late cancellation, so it still comes off your pass.' : '.');
      }
      const r = gBook(dt, c, 'me');
      render();
      return r === 'in'
        ? 'Booked ' + c.n + ' on ' + shortDate(dt) + ' at ' + c.tm + '.'
        : r === 'wait'
          ? c.n + ' on ' + shortDate(dt) + ' is full. You are on the waitlist.'
          : r === 'nopass'
            ? 'Your class pass has run out, so it was not booked.'
            : 'You were already booked into ' + c.n + '.';
    }
    case 'open': {
      const s = a.screen,
        go =
          { calendar: () => A.cal({}), photos: () => A.photos(), caffeine: () => A.caf(), messages: () => A.chat({}) }[
            s
          ] || (['today', 'train', 'progress', 'quests'].includes(s) ? () => A.tab({ tab: s }) : null);
      if (go) AS.after = go;
      return '';
    }
  }
  return '';
}
function asPrompt() {
  const tk = today(),
    d = S.days[tk] || newDay(tk),
    t = totals(d),
    z = zone(d),
    now = new Date();
  const diary = Object.keys(MEALS)
    .map(
      m =>
        MEALS[m] +
        ': ' +
        (d.e
          .filter(e => e.m === m)
          .map(e => e.n + ' (' + (e.u || e.g + ' g') + ', ' + e.k + ' kcal, ' + r0(e.p) + ' g protein)')
          .join('; ') || 'nothing'),
    )
    .join('\n');
  const planL = Array.from({ length: 8 }, (_, i) => addDays(tk, i))
    .map(
      k =>
        k +
        ' ' +
        WD[wdOf(k)] +
        ': ' +
        (planFor(k)
          .filter(x => !x.skipped)
          .map(x => (x.tm ? x.tm + ' ' : '') + x.t + (x.done ? ' (done)' : ''))
          .join('; ') || 'nothing planned'),
    )
    .join('\n');
  const p = AS.pend,
    pend = !p
      ? 'none'
      : p.kind === 'food'
        ? 'a card offering to log to ' +
          MEALS[p.meal] +
          ': ' +
          p.items.map(it => it.food.n + ' ' + r0(it.g) + ' g').join('; ')
        : p.kind === 'remove'
          ? 'a card offering to remove ' + p.names
          : p.kind === 'msg'
            ? 'a card offering to send a message to the coach'
            : 'a card offering to change targets';
  return `You are the assistant built into Ember, a food, training and recovery tracker. The person talks to you by voice, so "say" is read aloud: one to three short sentences of plain spoken English, no lists, no markdown, no emoji. Be direct and friendly. The person is in Ireland: use Irish and UK food words and metric units.

Reply with only JSON: {"say": string, "actions": array, "chips": array of up to 3 short things the person might say next}

You never save anything yourself. You ask the app to act by adding to "actions"; the app does it and reports back in a line starting [app]. Never say something is saved unless an [app] line says so. Actions:
- {"do":"food","meal":"b"|"l"|"d"|"s","items":[{"name","brand","grams","amount","kcal100","p100","c100","f100"}]}: foods to log. The app matches each to its database and shows a card to confirm, so say briefly what you have and ask if it is right. "name" is a short database-style name with the cooking state ("pork sausage, fried", "egg, fried"). "grams" is the total grams of that item. One item per component.
- {"do":"remove_food","match": part of the food's name, "meal": optional}
- {"do":"water","ml": number, negative to take some off}
- {"do":"caffeine","drink": one of filter, amer, flat, latte, capp, cort, mocha, chai (chai latte), dchai (dirty chai), matcha, esp, dbl, tea, green, cola, ed250, ed500, pre, tab, gel, "milk": whole|semi|skim|oat|soya|almond|coconut|none, "ml": millilitres of milk, "sugar": teaspoons, "sugar_free": boolean, "with_calories": boolean}: a coffee, tea, cola or energy drink on its own. Counts the caffeine and, unless with_calories is false, the calories.
- {"do":"weight","kg": number}
- {"do":"exercise","name","minutes","effort":"easy"|"moderate"|"hard","kcal": optional}
- {"do":"checkin","sleep_hours","sleep_quality","soreness","energy","stress"}: the recovery check-in; the last four are 1 to 5.
- {"do":"event","title","kind":"match"|"class"|"cardio"|"appt"|"rest"|"other","date":"YYYY-MM-DD","time":"HH:MM" or "","minutes","weekly": boolean}
- {"do":"move_session","from":"YYYY-MM-DD","to":"YYYY-MM-DD"} | {"do":"skip_session","date"} | {"do":"start_session"}
- {"do":"book_class","class": class name,"date":"YYYY-MM-DD","time":"HH:MM" optional} | {"do":"cancel_class","class","date"}: classes at their gym, from the timetable below.
- {"do":"message_coach","text"} | {"do":"set_target","kcal","protein"}: each shows a card to confirm first.
- {"do":"open","screen":"today"|"train"|"progress"|"quests"|"calendar"|"photos"|"caffeine"|"messages"}

Food: if what they said is too vague to estimate within about a fifth (a fry, a sandwich, a takeaway, "dinner"), ask before logging. One short question at a time, three at most in the whole exchange: what was in it, how many or how much, how it was cooked. Put the likely answers in "chips". Once you can estimate, send the food action. If they do not know, estimate sensibly and say it is an estimate. If a card is waiting and they change something, send a corrected food action; do not send one if they only asked a question. A coffee or tea that is part of a meal goes in the food items.
Questions: answer from the app state below with the actual numbers. No medical advice; for pain or an injury that sounds serious, tell them to see a physio or doctor. If they ask for something the app cannot do, say so plainly.

Now: ${tk} ${WD[wdOf(tk)]}, ${pad(now.getHours())}:${pad(now.getMinutes())}. Meal slot right now: ${MEALS[mealNow()]}.
Today: ${t.k} of ${z.b} kcal eaten (zone ${z.lo} to ${z.hi}), ${r0(z.b - t.k)} left. Protein ${r0(t.p)} of ${P.t.p} g, carbs ${r0(t.c)} of ${P.t.c} g, fat ${r0(t.f)} of ${P.t.f} g. Water ${d.w} of ${P.t.w} ml. Caffeine ${cafOf(d).reduce((s, c) => s + c.mg, 0)} mg. Day ${d.done ? 'closed' : 'open'}.
Diary today:
${diary}
Plan for the next 8 days:
${planL}
${
  G
    ? 'Gym timetable (' +
      G.name +
      '):\n' +
      Array.from({ length: 4 }, (_, i) => addDays(tk, i))
        .map(
          k =>
            k +
            ' ' +
            WD[wdOf(k)] +
            ': ' +
            (classesOn(k)
              .map(c => c.tm + ' ' + c.n + ' (' + Math.max(0, c.cap - gSess(k, c).in.length) + ' places left)')
              .join('; ') || 'no classes'),
        )
        .join('\n') +
      '\n'
    : ''
}${myUnread() ? 'Unread messages from their coach: ' + myUnread() + '.\n' : ''}${coachContext()}
A card is waiting for: ${pend}.

Conversation so far:
${AS_LOG.slice(-16)
  .map(m => (m.r === 'u' ? 'Person: ' : m.r === 'a' ? 'You: ' : '[app] ') + m.t)
  .join('\n')}`;
}
/* the talk button that sits above the tab bar */
function asFab() {
  const b = $('#asFab');
  if (b) b.classList.toggle('hide', !(S.ready && P && P.onboarded && !isCoach() && !isGym() && AI.sample));
}
document.addEventListener('aiready', asFab);

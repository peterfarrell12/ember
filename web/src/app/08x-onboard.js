/* ================= the first run =================
   What a new person meets between signing in and the Today screen (docs: the onboarding requirements, phase 1a).
   The rules (ages, floors, the order of steps) are in onboarding.js; this file is the screens.

     sign in                08y-account.js, with one line on what the account is for and no consent tick
     health information     its own screen, with a date of birth (18 and over)
     targets                the existing sheet (04-flows.js), then
     log one thing now      the Add sheet with a heading, or a training set-up for people here to train
     day one                the celebration moves to after that first log, then a reminder time (phone app)

   Ember AI asks the first time a photo, voice or chat feature is used, and emails about Ember are an unticked
   choice under You. The furthest step each account reached is kept on the account, so where people stop can be
   counted from Ember's own database.

   The browser tests ask for the old device-only mode, which has no account and so no consent: there the first
   run is as it was (targets, then "You are set"). A test of the first run itself asks for it with the
   localStorage key ember:guided. */
const guided = () => Store.durable || !!LS.get('ember:guided');
/** @type {{ v?: string, at?: string, health?: boolean, ai?: boolean, aiAt?: string, mkt?: boolean, mktAt?: string } | null} */
let CONSENT = null;
const OB = { rec: null, askRem: false, day1: false, time: '19:30' };
const nowIso = () => new Date().toISOString();
function saveConsent(patch) {
  CONSENT = { ...(CONSENT || {}), ...patch };
  Store.put('meta', 'consent', CONSENT);
}

/* ---------- the furthest step reached ---------- */
function obStep(step, extra) {
  if (!guided() || DEMO) return;
  const rec = OB.rec || {},
    next = furthest(rec.step || '', step);
  if (next === rec.step && !extra) return;
  OB.rec = { ...rec, ...(extra || {}), step: next, at: nowIso(), started: rec.started || nowIso() };
  Store.put('meta', 'onboarding', OB.rec);
}

/* ---------- health information: its own screen, before the first question about the person ----------
   Called from boot() once the profile is loaded. Returns true when it has taken over the screen. */
async function consentGate() {
  if (!guided()) return false;
  CONSENT = (await Store.get('meta', 'consent')) || null;
  OB.rec = (await Store.get('meta', 'onboarding')) || null;
  recordConsent(); // an account made on the older form agreed there
  if (Store.durable) LS.set('ember:known', 1);
  if (P.dob) {
    const age = ageOn(P.dob, today());
    if (age >= MIN_AGE && age !== P.age) {
      P.age = age;
      saveProfile();
    }
  }
  if (consentOf(CONSENT).health) return false;
  if (!P.onboarded) obStep('account');
  document.body.classList.add('gate');
  if (LS.get('ember:under18')) under18();
  else consentDraw();
  return true;
}
function consentDraw() {
  $('#main').innerHTML =
    `<div class="gate-wrap"><div class="card stack gate-card" id="hcCard"><h2>Your health information</h2>
    <p class="small">Ember stores what you eat, your weight and your training so it can work out your targets and show your progress.</p>
    <p class="small muted">It is kept in the EU and is private to you. Nobody else sees it unless you choose to share with a coach, and you can delete it at any time under You.</p>
    <fieldset class="dob"><legend>Date of birth</legend><div class="grid3">
      <label class="f">Day<input class="inp" id="hcD" inputmode="numeric" autocomplete="bday-day" maxlength="2" placeholder="DD"></label>
      <label class="f">Month<input class="inp" id="hcM" inputmode="numeric" autocomplete="bday-month" maxlength="2" placeholder="MM"></label>
      <label class="f">Year<input class="inp" id="hcY" inputmode="numeric" autocomplete="bday-year" maxlength="4" placeholder="YYYY"></label></div>
      <p class="tiny muted">Used for your calorie sum. Ember is for people aged ${MIN_AGE} and over.</p></fieldset>
    <div id="hcMsg" role="alert"></div>
    <button class="btn ember" data-act="consentGo" id="hcGo">I agree, continue</button>
    <p class="tiny muted">By continuing you consent to Ember storing the health information you enter. <a class="link" href="./privacy.html" target="_blank" rel="noopener">Read the privacy notice</a></p>
    ${Store.account ? `<button class="link" data-act="signOut" style="align-self:center">Sign out</button>` : ''}</div></div>`;
}
function under18() {
  $('#main').innerHTML =
    `<div class="gate-wrap"><div class="card stack gate-card"><h2>Ember is for people aged ${MIN_AGE} and over</h2>
    <p class="small">Thanks for being straight with us. Ember sets calorie targets, and those are not suitable for anyone under ${MIN_AGE}.</p>
    <p class="small muted">Your date of birth has not been kept. If you would like help with food or training, a parent, a GP or a coach at your club is a good place to start.</p>
    ${Store.account ? `<button class="btn ghost" data-act="signOut">Sign out</button><button class="link" data-act="deleteAccount" style="color:var(--bad);align-self:center">Delete my account</button>` : ''}</div></div>`;
}
A.consentGo = () => {
  const dob = dobFrom($('#hcD').value, $('#hcM').value, $('#hcY').value),
    age = ageOn(dob, today());
  const say = t => ($('#hcMsg').innerHTML = `<div class="banner">${ic('label')}<span>${esc(t)}</span></div>`);
  if (!dob || !(age >= 0)) return say('Enter your date of birth as day, month and year.');
  if (age > 110) return say('Check the year you were born.');
  if (age < MIN_AGE) {
    LS.set('ember:under18', 1);
    return under18();
  }
  saveConsent({ v: CONSENT_VERSION, at: nowIso(), health: true });
  P.dob = dob;
  P.age = age;
  saveProfile();
  obStep('consent');
  document.body.classList.remove('gate');
  $('#main').innerHTML =
    `<div class="boot"><div class="busy"><div class="spinner"></div>Opening your diary</div></div>`;
  boot();
};
/* moving through the three date boxes as they fill */
document.addEventListener('input', e => {
  const el = /** @type {HTMLInputElement} */ (e.target);
  if (el.id === 'hcD' && el.value.length === 2) $('#hcM').focus();
  else if (el.id === 'hcM' && el.value.length === 2) $('#hcY').focus();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && /^hc[DMY]$/.test(/** @type {HTMLElement} */ (e.target).id || '')) A.consentGo();
});

/* ---------- log one thing now: straight after the targets are saved ---------- */
function obAfterTargets() {
  P.ob = 'log';
  P.obDay = today();
  saveProfile();
  obStep('targets');
  openAdd({ title: 'What have you eaten today?', first: true });
}
const obAddIntro = () => `<p class="small muted" id="obIntro">One thing is enough to start your streak.</p>`;
const obAddLinks = () =>
  `<div class="ob-links" id="obLinks"><button class="link" data-act="obImport">Switching from another app? Bring your diary</button><button class="link" data-act="obTrain">Here for training first? Set up your programme</button><button class="btn ghost" data-act="close">Nothing yet today</button></div>`;
A.obImport = () => {
  closeAll();
  A.importDiary();
};
A.obTrain = () => {
  closeAll();
  A.tab({ tab: 'train' });
  A.trainSetup();
};
/* The first food or the first finished session: the moment the old "You are set" card was meant for.
   Called from commitDay with the day just saved. */
function obFirstUse(d) {
  if (!P || P.ob !== 'log' || d.date !== today()) return;
  const food = d.e.length > 0,
    trained = d.x.some(x => x.tr === 'train');
  if (!food && !trained) return;
  P.ob = 'done';
  P.obDay = today();
  // a first food lights the streak, and that card (04-flows.js) is the headline; a first session gets its own
  OB.day1 = food;
  if (!food)
    celeQ.unshift({
      icon: 'flame',
      fill: true,
      tone: 'ember',
      title: 'Day 1',
      sub: 'Your first session is done. Log a food to light your streak.',
      rewards: ['1 streak freeze to begin with'],
    });
  OB.askRem = canRemind() && !remState().log.on;
  obStep('first_log', { first: food ? 'food' : 'training' });
  if (!OB.askRem) obStep('reminder', { rem: 'na' });
}
/* Nothing is open any more: the moment to ask about a reminder, if one is owed. */
function obIdle() {
  if (!OB.askRem || celeOpen || sheets.length || !S.ready) return;
  OB.askRem = false;
  obReminder();
}
/* What Today suggests on the first day: the first log, then the next one. */
function obNext(d) {
  if (!P.ob || P.obDay !== today() || d.date !== today()) return null;
  if (P.ob === 'log')
    return {
      i: 'flame',
      fill: true,
      t: 'Log your first food',
      s: 'One thing is enough to light your streak. Saying it is quickest.',
      b: [['add', 'Add food']],
    };
  if (d.e.length && d.e.length < 3)
    return {
      i: 'flame',
      t: 'Next: add your next meal when you have it',
      s: 'Search, scan a barcode, say it or take a photo.',
      b: [['add', 'Add food']],
    };
  return null;
}

/* ---------- a reminder time, chosen at the moment of the first log (phone app only) ---------- */
function obReminder() {
  OB.time = '19:30';
  openSheet(
    `${sh('A nudge if you forget')}<div class="sheet-b"><p>When should Ember remind you if nothing is logged?</p>
    ${segHtml(
      'obRem',
      [
        ['13:00', '13:00'],
        ['19:30', '19:30'],
        ['21:00', '21:00'],
      ],
      OB.time,
    )}
    <label class="f">Or another time<input class="inp" type="time" id="obRemT" value="${OB.time}" data-on="obRemT"></label>
    <p class="tiny muted">One reminder a day, only on days with nothing logged, and never during a break. Change or stop it under You, Reminders.</p></div>
    <div class="sheet-f stack"><button class="btn ember" data-act="obRemGo">Continue</button><button class="link" data-act="obRemNo" style="align-self:center">No reminders</button></div>`,
  );
  SEG.obRem = v => {
    OB.time = v;
    $('#obRemT').value = v;
  };
}
I.obRemT = el => {
  if (!/^\d\d:\d\d$/.test(el.value)) return;
  OB.time = el.value;
  $$('[data-seg="obRem"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val === OB.time)));
};
A.obRemGo = async () => {
  const ok = await askToRemind();
  const r = remState();
  r.log = { on: !!ok, time: OB.time };
  saveProfile();
  remSync();
  closeSheet();
  obStep('reminder', { rem: ok ? 'on' : 'refused' });
  toast(
    ok
      ? 'Reminder set for ' + OB.time + '.'
      : "Notifications are off for Ember in your phone's settings. You can turn them on there later.",
  );
};
A.obRemNo = () => {
  closeSheet();
  obStep('reminder', { rem: 'off' });
};

/* ---------- Ember AI: asked the first time a photo, voice or chat feature is used ----------
   What is sent goes to an outside AI service in the United States (the privacy notice names it). Search,
   scanning and typing never use it. Once switched on it stays on until switched off under You. */
const AI_QUIET = ['daily_note']; // sent without a tap: never the reason the question appears
function aiConsent(input) {
  const ai = consentOf(CONSENT).ai;
  if (ai === true || !guided()) return Promise.resolve();
  const task = Array.isArray(input) ? input[0] : '';
  if (ai === false || AI_QUIET.includes(task)) return Promise.reject({ code: ai === false ? 'ai_off' : 'ai_declined' });
  return new Promise((res, rej) => {
    let done = false;
    const end = yes => {
      if (done) return;
      done = true;
      if (yes) {
        saveConsent({ v: (CONSENT && CONSENT.v) || CONSENT_VERSION, ai: true, aiAt: nowIso() });
        res(undefined);
      } else rej({ code: 'ai_declined' });
    };
    A.aiYes = () => {
      end(true);
      closeSheet();
    };
    openSheet(
      `${sh('Use Ember AI?')}<div class="sheet-b"><p>Ember AI works out what is in a meal from a photo or from what you say, and answers your questions.</p>
      <p class="small">To do that, what you send (photos, your words and the parts of your diary a question needs) is processed by an outside AI service in the United States. Results are marked Estimate.</p>
      <p class="tiny muted">Search, barcode scanning and typing never use it. You can switch Ember AI off at any time under You, Your data. <a class="link" href="./privacy.html" target="_blank" rel="noopener">Privacy notice</a></p></div>
      <div class="sheet-f stack"><button class="btn ember" data-act="aiYes">Allow and continue</button><button class="btn ghost" data-act="close">Not now</button></div>`,
    );
    sheets[sheets.length - 1]._onClose = () => end(false);
  });
}
/* wraps the way Claude is reached so every request waits for that answer */
function withAiConsent(sample) {
  const run = async (input, o) => {
    await aiConsent(input);
    return sample(input, o);
  };
  run.json = async (input, o) => {
    await aiConsent(input);
    return sample.json(input, o);
  };
  run.limits = () => sample.limits();
  return run;
}
/* the two choices under You, Your data */
function consentRows() {
  if (!guided() || !CONSENT) return '';
  const ai = consentOf(CONSENT).ai === true,
    mkt = !!CONSENT.mkt;
  const row = (act, on, title, sub) =>
    `<div class="between"><span><b>${title}</b><small class="muted" style="display:block">${sub}</small></span><button class="btn sm ${on ? '' : 'ghost'}" data-act="${act}" aria-pressed="${on}" style="width:auto">${on ? 'On' : 'Off'}</button></div>`;
  return `<div class="stack" id="consentRows" style="gap:10px">${row('aiToggle', ai, 'Ember AI', 'Photo, voice and chat features, processed by an outside AI service in the United States')}${row('mktToggle', mkt, 'Emails about Ember', 'News and tips now and then. Never needed to use the app')}</div>`;
}
const consentRedraw = () => {
  const el = $('#consentRows');
  if (el) el.outerHTML = consentRows();
};
A.aiToggle = () => {
  const on = consentOf(CONSENT).ai === true;
  saveConsent({ ai: !on, aiAt: nowIso() });
  consentRedraw();
  toast(on ? 'Ember AI is off. Nothing more is sent.' : 'Ember AI is on.');
};
A.mktToggle = () => {
  saveConsent({ mkt: !CONSENT.mkt, mktAt: nowIso() });
  consentRedraw();
  toast(CONSENT.mkt ? 'You will get the odd email about Ember.' : 'No emails about Ember.');
};

/* ---------- training set-up: three answers, then the programme that fits first ---------- */
let TS = null;
A.trainSetup = () => {
  TS = TS || { goal: 'strength', kit: 'gym', days: 3 };
  openSheet(
    `${sh('Find your programme')}<div class="sheet-b">
    <div class="f">What do you train for?${segHtml('tsGoal', TRAIN_FOR, TS.goal)}</div>
    <div class="f">How many days a week?${segHtml(
      'tsDays',
      [
        ['2', '2'],
        ['3', '3'],
        ['4', '4'],
        ['5', '5 or more'],
      ],
      String(TS.days),
    )}</div>
    <div class="f">What do you have to train with?${segHtml('tsKit', TRAIN_KIT, TS.kit)}</div></div>
    <div class="sheet-f"><button class="btn ember" data-act="trainSetupGo">Show my programme</button></div>`,
    true,
  );
  SEG.tsGoal = v => (TS.goal = v);
  SEG.tsDays = v => (TS.days = +v);
  SEG.tsKit = v => (TS.kit = v);
};
A.trainSetupGo = () => {
  const list = rankTemplates(TEMPLATES, TS),
    res = (t, best) =>
      `<button class="res" data-act="tplView" data-id="${t.id}"><span class="n">${esc(t.n)}</span><span class="k"><span class="pill ${best ? 'good' : ''}">${best ? 'Best fit' : esc(t.tag)}</span></span><span class="s" style="white-space:normal">${esc(t.about)}</span></button>`;
  openSheet(
    `${sh('Your programme')}<div class="sheet-b"><p class="small muted">Picked from your three answers. Open one to see every session before you start it.</p>
    <div class="list">${res(list[0], true)}</div>
    <div class="grp">Others that could suit</div><div class="list">${list
      .slice(1)
      .map(t => res(t, false))
      .join('')}</div>
    ${AI.sample ? `<button class="act" data-act="progAI">${ic('spark')}<span>Build one with Ember AI<small>Around your goal, days and kit</small></span></button>` : ''}</div>`,
    true,
  );
};

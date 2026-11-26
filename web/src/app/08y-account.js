/* ---------- account: sign in with an emailed link, sign out, move a device's diary into the account ---------- */
/* Consent, asked for on the sign-in form. Ember holds health information, which needs explicit consent, and its
   AI features send what is submitted to Anthropic in the United States. The date is the version of the privacy
   policy and terms agreed to (privacy.html, terms.html); change it when they change in a way that matters. */
const CONSENT_VERSION = '2026-11-19';
const consentHtml = () =>
  `<label class="agree"><input type="checkbox" id="siAgree"><span>I am 18 or over and agree to the <a class="link" href="./terms.html" target="_blank" rel="noopener">Terms</a> and <a class="link" href="./privacy.html" target="_blank" rel="noopener">Privacy policy</a>. I consent to Ember storing the health information I enter, and to what I send to its AI features being processed by an outside AI provider in the United States.</span></label>`;
/* Once signed in, note on the account which version was agreed to and when. */
function recordConsent() {
  const c = LS.get('ember:consent');
  if (!Store.durable || !c || LS.get('ember:consent-noted:' + Store.uid) === c.v) return;
  Store.put('meta', 'consent', c);
  LS.set('ember:consent-noted:' + Store.uid, c.v);
}
const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* ---------- the sign-in form ----------
   Four ways through one form, used on the signed-out screen and in the sign-in sheet:
     in     an email and a password
     new    create an account with an email and a password (the consent tick is asked here)
     link   an emailed link that signs you in, no password (it creates the account if there is none, so it asks too)
     reset  an emailed link to choose a new password
   Someone who has used this device before starts on "in"; anyone else on "new". */
const PASSWORD_MIN = 8;
const SI = { mode: '', invited: false };
const siMode = () => SI.mode || (LS.get('ember:consent') ? 'in' : 'new');
const SI_FORM = {
  in: { title: 'Sign in to Ember', lead: 'Sign in with your email and password.', go: 'Sign in' },
  new: {
    title: 'Create your account',
    lead: 'Create your account with an email and a password.',
    go: 'Create account',
  },
  link: {
    title: 'Sign in with a link',
    lead: 'Enter your email and we will send you a link that signs you in. No password needed.',
    go: 'Email me a link',
  },
  reset: {
    title: 'Reset your password',
    lead: 'Enter your email and we will send you a link to choose a new password.',
    go: 'Email me a reset link',
  },
};
const SI_WHY = {
  invalid_credentials:
    'That email and password do not match. If you have only ever signed in with an emailed link, choose "Email me a link instead", then set a password under You, Your data.',
  email_not_confirmed: 'Confirm your email first: open the link we sent when you created the account.',
  user_already_exists: 'There is already an account with that email. Sign in, or reset your password.',
  email_exists: 'There is already an account with that email. Sign in, or reset your password.',
  weak_password: 'Choose a longer or less common password.',
  same_password: 'That is the password you already have.',
  over_email_send_rate_limit: 'Too many emails asked for. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many tries. Wait a minute and try again.',
  unreachable: 'Could not reach Ember. Check your connection and try again.',
};
const siWhy = e => SI_WHY[e && e.code] || 'That did not work. Check your connection and try again.';
const siLink = (mode, label) =>
  `<button class="link" type="button" data-act="siMode" data-mode="${mode}">${label}</button>`;
const passField = (id, label, fresh) =>
  `<label class="f">${label}<span class="pwrow"><input class="inp" id="${id}" name="password" type="password" autocomplete="${fresh ? 'new-password' : 'current-password'}" autocapitalize="off" spellcheck="false"><button class="link" type="button" data-act="pwShow" data-for="${id}" aria-label="Show the password">Show</button></span>${fresh ? `<small class="muted">At least ${PASSWORD_MIN} characters.</small>` : ''}</label>`;
/* Draw the form for the current way in, keeping the email already typed. */
function siDraw() {
  const body = $('#siBody'),
    foot = $('#siFoot');
  if (!body || !foot) return;
  const mode = siMode(),
    f = SI_FORM[mode],
    email = String(($('#siEmail') || {}).value || '');
  const title = $('#siTitle');
  if (title)
    title.textContent = !SI.invited
      ? f.title
      : mode === 'in'
        ? 'Sign in to join the squad'
        : mode === 'new'
          ? 'Create your account to join the squad'
          : f.title;
  body.innerHTML = `<p class="small">${SI.invited ? 'You have been invited to a squad. ' : ''}${f.lead}</p>
    <label class="f">Email<input class="inp" id="siEmail" name="email" type="email" inputmode="email" autocomplete="${mode === 'new' ? 'email' : 'username'}" autocapitalize="off" spellcheck="false" value="${esc(email)}"></label>
    ${mode === 'in' || mode === 'new' ? passField('siPass', 'Password', mode === 'new') : ''}${mode === 'new' || mode === 'link' ? consentHtml() : ''}<div id="siMsg" role="alert"></div>`;
  foot.innerHTML = `<button class="btn ember" data-act="signInGo" id="siGo">${f.go}</button>
    <div class="si-links">${
      mode === 'in'
        ? siLink('reset', 'Forgot your password?') +
          siLink('link', 'Email me a link instead') +
          siLink('new', 'New here? Create an account')
        : mode === 'new'
          ? siLink('in', 'Already have an account? Sign in') + siLink('link', 'Use an emailed link instead')
          : siLink('in', 'Back to sign in')
    }</div>`;
}
const siSay = text => {
  const m = $('#siMsg');
  if (m) m.innerHTML = text ? `<div class="banner">${ic('label')}<span>${esc(text)}</span></div>` : '';
};
/* what the form shows once an email is on its way */
function siSent(text, email) {
  $('#siBody').innerHTML = `<p>${text}</p><p class="small muted">Sent to ${esc(email)}.</p>`;
  $('#siFoot').innerHTML = S.ready
    ? `<button class="btn ghost" data-act="close">Done</button>`
    : `<button class="btn ghost" data-act="signInAgain">Back to sign in</button>`;
}
A.siMode = ({ mode }) => {
  SI.mode = SI_FORM[mode] ? mode : '';
  siDraw();
  const first = $('#siEmail');
  if (first && !first.value) first.focus();
};
A.pwShow = ({ for: id }, el) => {
  const inp = $('#' + id);
  if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  el.textContent = show ? 'Hide' : 'Show';
  el.setAttribute('aria-label', show ? 'Hide the password' : 'Show the password');
};
A.signIn = () => {
  SI.invited = false;
  openSheet(
    `${sh('Sign in to Ember')}<div class="sheet-b" id="siBody"></div><div class="sheet-f stack" id="siFoot"></div>`,
  );
  topSheet().querySelector('.sheet-h h3').id = 'siTitle';
  siDraw();
};
/* Ember needs an account: nobody uses the app signed out. This is the whole screen until they sign in.
   (The browser tests, and anyone developing without a backend, can ask for the old device-only mode with the
   localStorage key ember:device-only; it only ever shows that device's own data.) */
const mustSignIn = () => Store.mode === 'local' && authConfigured() && !LS.get('ember:device-only');
function signInGate() {
  document.body.classList.add('gate');
  SI.invited = !!LS.get('ember:join'); // arrived by a squad's invite link: it is offered once they are in
  const point = (icon, text) => `<li>${ic(icon)}<span>${text}</span></li>`;
  $('#main').innerHTML = `<div class="gate-wrap"><div class="gate-pitch"><h1>Say what you ate. Ember does the rest.</h1>
    <ul>${point('mic', 'Log a meal by talking, a photo, a barcode or a search, with Irish and UK foods and portions.')}${point('dumbbell', 'Follow a training programme and log your sets.')}${point('flame', 'Keep a streak going with quests, and a weekly board with your friends.')}</ul>
    <p class="small muted">Free to use. No adverts and no trackers.</p></div>
    <div class="card stack gate-card"><h2 id="siTitle">Sign in to Ember</h2>
    <div class="stack" id="siBody"></div><div class="stack" id="siFoot"></div></div></div>`;
  siDraw();
  if (signInLinkFailed) toast('That link has expired or was already used. Ask for a new one.');
}
A.signInAgain = () => {
  SI.mode = 'in';
  S.ready ? siDraw() : signInGate();
};
A.signInGo = async () => {
  const mode = siMode(),
    email = String(($('#siEmail') || {}).value || '').trim(),
    password = String(($('#siPass') || {}).value || '');
  siSay('');
  if (!validEmail(email)) return toast('Enter your email address.');
  if ((mode === 'in' || mode === 'new') && !password) return toast('Enter your password.');
  if (mode === 'new' && password.length < PASSWORD_MIN)
    return toast(`Choose a password of at least ${PASSWORD_MIN} characters.`);
  if (mode === 'new' || mode === 'link') {
    if (!($('#siAgree') || {}).checked) return toast('Tick the box to agree before you continue.');
    LS.set('ember:consent', { v: CONSENT_VERSION, at: new Date().toISOString() });
  }
  const go = $('#siGo');
  go.disabled = true;
  try {
    if (mode === 'in') {
      await signInWithPassword(email, password);
      return location.reload();
    }
    if (mode === 'new') {
      if ((await createAccount(email, password)) === 'signed_in') return location.reload();
      return siSent(
        'Check your email and open the link to confirm your address. If you already have an account, sign in or reset your password instead.',
        email,
      );
    }
    if (mode === 'reset') {
      await sendPasswordReset(email);
      return siSent('Check your email. The link lets you choose a new password.', email);
    }
    await sendSignInLink(email);
    siSent('Check your email. The link signs you in on this device.', email);
  } catch (e) {
    go.disabled = false;
    const code = e && e.code;
    siSay(
      mode === 'link' && (e.status === 429 || /rate|seconds/i.test(e.message || ''))
        ? 'Too many links asked for. Wait a minute and try again.'
        : mode === 'link' && !code
          ? 'Could not send the link. Check your connection.'
          : siWhy(e),
    );
  }
};
/* Enter in the email or password box does what the button does */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const id = e.target && /** @type {HTMLElement} */ (e.target).id;
  if (id === 'siEmail' || id === 'siPass') A.signInGo();
  else if (id === 'npPass') A.setPasswordGo();
});

/* ---------- set or change the password: from Your data, or after opening a reset link ---------- */
if (recoveryLink) LS.set('ember:recover', 1); // noted before sign-in finishes, acted on once the app is open
A.setPassword = ({ recover } = {}) => {
  openSheet(
    `${sh(recover ? 'Choose a new password' : 'Set or change your password')}<div class="sheet-b"><p class="small">${recover ? 'You are signed in from the link we sent. Choose a new password for next time.' : 'Your password signs you in on any device, with your email. If you have only used emailed links so far, this adds one.'}</p>
    ${passField('npPass', 'New password', true)}<div id="siMsg" role="alert"></div></div>
    <div class="sheet-f"><button class="btn ember" data-act="setPasswordGo" id="npGo">Save password</button></div>`,
  );
  setTimeout(() => $('#npPass') && $('#npPass').focus(), 60);
};
A.setPasswordGo = async () => {
  const password = String(($('#npPass') || {}).value || '');
  siSay('');
  if (password.length < PASSWORD_MIN) return toast(`Choose a password of at least ${PASSWORD_MIN} characters.`);
  const go = $('#npGo');
  go.disabled = true;
  try {
    await setPassword(password);
    closeSheet();
    toast('Password saved.', 'good');
  } catch (e) {
    go.disabled = false;
    siSay(siWhy(e));
  }
};
/* after a reset link has signed the person in: ask for the new password once the app is on screen */
function offerNewPassword() {
  if (!LS.get('ember:recover')) return;
  LS.del('ember:recover');
  if (Store.durable) A.setPassword({ recover: 1 });
}
A.signOut = async () => {
  for (let i = 0; i < 40 && Store.busy; i++) await sleep(100); // let queued saves finish first
  // the copy of the diary kept for opening offline does not stay on a device after its owner signs out
  LS.keys('ember:kept:' + Store.uid + ':').forEach(k => LS.del(k));
  try {
    await signOut();
  } catch (e) {}
  location.reload();
};

/* Everything the person has stored, for a backup or to take elsewhere. Photos are listed by record; the image files are not included. */
async function exportAll() {
  const byId = async kind => Object.fromEntries((await Store.list(kind)).map(d => [d.id || d.date, d]));
  const [days, recipes, foods, programs, sessions, photos, train] = await Promise.all([
    byId('days'),
    byId('recipes'),
    byId('foods'),
    byId('programs'),
    byId('sessions'),
    byId('photos'),
    Store.get('meta', 'train'),
  ]);
  return { exported: new Date().toISOString(), profile: P, days, recipes, foods, programs, sessions, photos, train };
}
A.deleteAccount = () => {
  openSheet(
    `${sh('Delete my account')}<div class="sheet-b"><p>This deletes your diary, photos and account for good. It cannot be undone. Type DELETE to confirm.</p>
    <label class="f">Confirm<input class="inp" id="daText" autocomplete="off" autocapitalize="characters" spellcheck="false" data-on="daText"></label></div>
    <div class="sheet-f"><button class="btn" id="daGo" data-act="deleteAccountGo" disabled style="background:var(--bad);color:#fff">Delete my account</button></div>`,
  );
};
I.daText = el => ($('#daGo').disabled = el.value.trim() !== 'DELETE');
A.deleteAccountGo = async () => {
  if (String(($('#daText') || {}).value || '').trim() !== 'DELETE' || !Store.durable) return;
  const go = $('#daGo');
  go.disabled = true;
  go.textContent = 'Deleting…';
  try {
    const client = await supabaseClient();
    await supabasePhotos(client, Store.uid).removeAll();
    await deleteAccount(client);
  } catch (e) {
    go.disabled = false;
    go.textContent = 'Delete my account';
    return toast(
      'Could not delete your account. Nothing was removed from your diary. Check your connection and try again.',
    );
  }
  // nothing of theirs stays on this device either
  LS.keys('ember:').forEach(k => LS.del(k));
  try {
    await signOut();
  } catch (e) {}
  location.reload();
};

/* The documents kept on this device, as [kind, id, data]. */
const LOCAL_KINDS = ['days', 'meta', 'foods', 'recipes', 'programs', 'sessions', 'photos', 'clphotos', 'cl'];
function localDocs() {
  const out = [];
  const p = LS.get(Store.key('profile'));
  if (p) out.push(['profile', undefined, p]);
  for (const kind of LOCAL_KINDS)
    for (const k of LS.keys(Store.key(kind) + ':')) {
      const data = LS.get(k);
      if (data) out.push([kind, k.slice(Store.key(kind).length + 1), data]);
    }
  return out;
}
/* First sign-in on a device that already holds a diary, into an account that has none: offer to move it.
   An account that already has a diary is shown as it is; the device's own copy stays on the device, untouched. */
async function offerMove() {
  if (Store.mode !== 'cloud' || !Store.account) return;
  const mine = LS.get(Store.key('profile'));
  if (!mine || !mine.onboarded || LS.get('ember:move:' + Store.uid)) return;
  if (await Store.get('profile')) return;
  const docs = localDocs(),
    days = docs.filter(d => d[0] === 'days').length;
  document.body.classList.add('gate');
  const choice = await new Promise(res => {
    A.moveYes = () => res(true);
    A.moveNo = () => res(false);
    $('#main').innerHTML =
      `<div class="boot"><div class="card stack" style="max-width:340px;text-align:left;color:var(--ink);font-weight:400"><h2>Bring your diary with you?</h2>
      <p class="small">This device has a diary${days ? ' with ' + days + (days === 1 ? ' day' : ' days') + ' in it' : ''}. Move it into your account so it is saved and on your other devices.</p>
      <button class="btn ember" data-act="moveYes">Move it to my account</button><button class="btn ghost" data-act="moveNo">Start fresh</button></div></div>`;
  });
  document.body.classList.remove('gate');
  if (!choice) return LS.set('ember:move:' + Store.uid, 'no');
  $('#main').innerHTML = `<div class="boot"><div class="busy"><div class="spinner"></div>Moving your diary</div></div>`;
  try {
    // the profile goes last: its presence is what marks the move as complete
    for (const [kind, id, data] of docs.filter(d => d[0] !== 'profile')) await Store.backend.set(kind, id, data);
    await Store.backend.set('profile', undefined, mine);
    LS.set('ember:move:' + Store.uid, 'yes');
  } catch (e) {
    toast('Could not move your diary. It is still on this device. Try again later.');
  }
}

/* ---------- "These figures are wrong": flag a product from the lists for checking ---------- */
A.fdWrong = () => {
  if (!FD) return;
  openSheet(
    `${sh('These figures are wrong')}<div class="sheet-b"><p class="small">Tell us what does not match the pack and we will check it. To use the right figures straight away, add the product yourself under My foods.</p>
    <label class="f">What is wrong? Optional<textarea class="inp" id="fwNote" rows="3" maxlength="500"></textarea></label></div>
    <div class="sheet-f"><button class="btn" data-act="fdWrongGo" id="fwGo">Send</button></div>`,
  );
};
A.fdWrongGo = async () => {
  const f = FD && FD.food;
  if (!f) return closeSheet();
  const go = $('#fwGo');
  go.disabled = true;
  try {
    await reportProduct(await supabaseClient(), {
      product: String(f.code || f.id || '').slice(0, 100),
      name: String(f.n || '').slice(0, 200),
      brand: String(f.b || '').slice(0, 100),
      shown: { k: f.k, p: f.p, c: f.c, f: f.f, fi: f.fi, su: f.su, sf: f.sf, na: f.na, src: f.src },
      note: String(($('#fwNote') || {}).value || '')
        .trim()
        .slice(0, 500),
    });
    closeSheet();
    toast('Thanks. It has been flagged for checking.');
  } catch (e) {
    go.disabled = false;
    toast('Could not send that. Check your connection.');
  }
};

/* ---------- inside the phone app: the back button, and sign-in links that open the app ---------- */
nativeStart({
  onBack: () => {
    if (celeOpen) return (A.celeNext(), true);
    if (sheets.length) return (closeSheet(), true);
    if (S.ready && S.tab !== 'today') return (A.tab({ tab: 'today' }), true);
    return false;
  },
  onLink: async url => {
    const ok = await signInFromLink(url);
    if (ok && /[#&?]type=recovery\b/.test(url)) LS.set('ember:recover', 1); // a reset link: ask for the new password next
    if (ok) location.reload();
    else if (ok === false) toast('That sign-in link has expired or was already used. Ask for a new one.');
  },
});

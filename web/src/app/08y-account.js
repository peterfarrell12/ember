/* ---------- account: sign in with an emailed link, sign out, move a device's diary into the account ---------- */
/* Consent, asked for on the sign-in form. Ember holds health information, which needs explicit consent, and its
   AI features send what is submitted to Anthropic in the United States. The date is the version of the privacy
   policy and terms agreed to (privacy.html, terms.html); change it when they change in a way that matters. */
const CONSENT_VERSION = '2026-11-19';
const consentHtml = () =>
  `<label class="agree"><input type="checkbox" id="siAgree"><span>I am 18 or over and agree to the <a class="link" href="./terms.html" target="_blank" rel="noopener">Terms</a> and <a class="link" href="./privacy.html" target="_blank" rel="noopener">Privacy policy</a>. I consent to Ember storing the health information I enter, and to what I send to its AI features being processed by Anthropic in the United States.</span></label>`;
/* Once signed in, note on the account which version was agreed to and when. */
function recordConsent() {
  const c = LS.get('ember:consent');
  if (!Store.durable || !c || LS.get('ember:consent-noted:' + Store.uid) === c.v) return;
  Store.put('meta', 'consent', c);
  LS.set('ember:consent-noted:' + Store.uid, c.v);
}
const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
A.signIn = () => {
  openSheet(
    `${sh('Sign in to Ember')}<div class="sheet-b" id="siBody"><p class="small">Enter your email and we will send you a link. No password needed.</p>
    <label class="f">Email<input class="inp" id="siEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"></label>${consentHtml()}</div>
    <div class="sheet-f" id="siFoot"><button class="btn ember" data-act="signInGo" id="siGo">Email me a link</button></div>`,
  );
};
/* Ember needs an account: nobody uses the app signed out. This is the whole screen until they sign in.
   (The browser tests, and anyone developing without a backend, can ask for the old device-only mode with the
   localStorage key ember:device-only; it only ever shows that device's own data.) */
const mustSignIn = () => Store.mode === 'local' && authConfigured() && !LS.get('ember:device-only');
function signInGate() {
  document.body.classList.add('gate');
  const invited = !!LS.get('ember:join'); // arrived by a squad's invite link: it is offered once they are in
  const point = (icon, text) => `<li>${ic(icon)}<span>${text}</span></li>`;
  $('#main').innerHTML = `<div class="gate-wrap"><div class="gate-pitch"><h1>Say what you ate. Ember does the rest.</h1>
    <ul>${point('mic', 'Log a meal by talking, a photo, a barcode or a search, with Irish and UK foods and portions.')}${point('dumbbell', 'Follow a training programme and log your sets.')}${point('flame', 'Keep a streak going with quests, and a weekly board with your friends.')}</ul>
    <p class="small muted">Free to use. No adverts and no trackers.</p></div>
    <div class="card stack gate-card"><h2>${invited ? 'Sign in to join the squad' : 'Sign in to Ember'}</h2>
    <div class="stack" id="siBody"><p class="small">${invited ? 'You have been invited to a squad. ' : ''}Enter your email and we will send you a link. No password needed.</p>
    <label class="f">Email<input class="inp" id="siEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"></label>${consentHtml()}</div>
    <div id="siFoot"><button class="btn ember" data-act="signInGo" id="siGo">Email me a link</button></div></div></div>`;
  if (signInLinkFailed) toast('That sign-in link has expired or was already used. Ask for a new one.');
}
A.signInAgain = () => signInGate();
A.signInGo = async () => {
  const email = String(($('#siEmail') || {}).value || '').trim();
  if (!validEmail(email)) return toast('Enter your email address.');
  if (!($('#siAgree') || {}).checked) return toast('Tick the box to agree before you continue.');
  LS.set('ember:consent', { v: CONSENT_VERSION, at: new Date().toISOString() });
  const go = $('#siGo');
  go.disabled = true;
  try {
    await sendSignInLink(email);
    $('#siBody').innerHTML =
      `<p>Check your email. The link signs you in on this device.</p><p class="small muted">Sent to ${esc(email)}.</p>`;
    $('#siFoot').innerHTML = S.ready
      ? `<button class="btn ghost" data-act="close">Done</button>`
      : `<button class="btn ghost" data-act="signInAgain">Use a different email</button>`;
  } catch (e) {
    go.disabled = false;
    toast(
      e && (e.status === 429 || /rate|seconds/i.test(e.message || ''))
        ? 'Too many links asked for. Wait a minute and try again.'
        : 'Could not send the link. Check your connection.',
    );
  }
};
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
    if (ok) location.reload();
    else if (ok === false) toast('That sign-in link has expired or was already used. Ask for a new one.');
  },
});

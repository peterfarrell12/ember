/* ---------- account: sign in with an emailed link, sign out, move a device's diary into the account ---------- */
const validEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
A.signIn = () => {
  openSheet(
    `${sh('Sign in to Ember')}<div class="sheet-b" id="siBody"><p class="small">Enter your email and we will send you a link. No password needed.</p>
    <label class="f">Email<input class="inp" id="siEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"></label></div>
    <div class="sheet-f" id="siFoot"><button class="btn ember" data-act="signInGo" id="siGo">Email me a link</button></div>`,
  );
};
/* Ember needs an account: nobody uses the app signed out. This is the whole screen until they sign in.
   (The browser tests, and anyone developing without a backend, can ask for the old device-only mode with the
   localStorage key ember:device-only; it only ever shows that device's own data.) */
const mustSignIn = () => Store.mode === 'local' && authConfigured() && !LS.get('ember:device-only');
function signInGate() {
  document.body.classList.add('gate');
  $('#main').innerHTML =
    `<div class="boot"><div class="card stack" style="width:min(340px,100%);text-align:left;color:var(--ink);font-weight:400"><h2>Sign in to Ember</h2>
    <div class="stack" id="siBody"><p class="small">Enter your email and we will send you a link. No password needed.</p>
    <label class="f">Email<input class="inp" id="siEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"></label></div>
    <div id="siFoot"><button class="btn ember" data-act="signInGo" id="siGo">Email me a link</button></div></div></div>`;
  if (signInLinkFailed) toast('That sign-in link has expired or was already used. Ask for a new one.');
}
A.signInAgain = () => signInGate();
A.signInGo = async () => {
  const email = String(($('#siEmail') || {}).value || '').trim();
  if (!validEmail(email)) return toast('Enter your email address.');
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

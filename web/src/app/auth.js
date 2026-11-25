// Accounts, through Supabase Auth: an email and a password, or a sign-in link sent by email.
// The Supabase library is only fetched when it is first needed, so it costs nothing until then.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { isNative, tokensFrom, NATIVE_SIGNIN_URL } from './native.js';

let client = null;

/** True when this build knows where its backend is. Without it the app is device-only. */
export const authConfigured = () => !!(SUPABASE_URL && SUPABASE_KEY);

/** The sign-in link in the address bar failed (expired or already used). Read before the library tidies the address. */
export const signInLinkFailed = /[#&?]error(_code)?=/.test(location.hash + location.search);

/** The Supabase client. Starting it also completes a sign-in when the page was opened from an emailed link. */
export function supabaseClient() {
  client ||= import('@supabase/supabase-js').then(m =>
    m.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return client;
}

/** The signed-in person ({ id, email }), or null. Does not need the network when nobody is signed in. */
export async function signedInUser() {
  if (!authConfigured()) return null;
  const c = await supabaseClient();
  const { data } = await c.auth.getSession();
  return data && data.session ? data.session.user : null;
}

/** Email a sign-in link. Opening it brings the person back to this page, signed in. */
export async function sendSignInLink(email) {
  const c = await supabaseClient();
  const { error } = await c.auth.signInWithOtp({
    email,
    // in the phone app the link must come back to the app, not open a browser tab
    options: {
      emailRedirectTo: emailLanding(),
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

/** The link that opened this page is a password reset link. Read before the library tidies the address. */
export const recoveryLink = /[#&?]type=recovery\b/.test(location.hash + location.search);

/* What went wrong, as a short code the screens turn into words. Supabase names most of them itself. */
const authError = error => {
  const status = error && error.status;
  return {
    code:
      (error && error.code) ||
      (status === 429 ? 'over_request_rate_limit' : !status || status >= 500 ? 'unreachable' : 'failed'),
    message: String((error && error.message) || ''),
  };
};
/* where a link in an email should land: back in the phone app, or on this page */
const emailLanding = () => (isNative() ? NATIVE_SIGNIN_URL : location.origin + location.pathname);

/** Sign in with an email and a password. Rejects with { code }, for example 'invalid_credentials'. */
export async function signInWithPassword(email, password) {
  const c = await supabaseClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw authError(error);
}

/**
 * Create an account with an email and a password. Returns 'signed_in', or 'confirm' when the address has to
 * be confirmed from an email first. An address that already has an account also gives 'confirm': the server
 * does not say whether an address is known, and neither does the app.
 */
export async function createAccount(email, password) {
  const c = await supabaseClient();
  const { data, error } = await c.auth.signUp({ email, password, options: { emailRedirectTo: emailLanding() } });
  if (error) throw authError(error);
  return data && data.session ? 'signed_in' : 'confirm';
}

/** Email a link that lets the person choose a new password. */
export async function sendPasswordReset(email) {
  const c = await supabaseClient();
  const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: emailLanding() });
  if (error) throw authError(error);
}

/** Set or change the signed-in person's password. */
export async function setPassword(password) {
  const c = await supabaseClient();
  const { error } = await c.auth.updateUser({ password });
  if (error) throw authError(error);
}

/** How the app reaches the `ai` server function: its address, the public key, and the signed-in person's session token. */
export const aiAccess = {
  url: SUPABASE_URL + '/functions/v1/ai',
  key: SUPABASE_KEY,
  token: async () => {
    const { data } = await (await supabaseClient()).auth.getSession();
    return data && data.session ? data.session.access_token : undefined;
  },
};

/** How the app reaches the `product` server function (barcode lookup). */
export const productAccess = { ...aiAccess, url: SUPABASE_URL + '/functions/v1/product' };

/** How the app reaches the `recipe` server function (read a recipe from a web page). */
export const recipeAccess = { ...aiAccess, url: SUPABASE_URL + '/functions/v1/recipe' };

/**
 * Finish signing in from a link that opened the phone app. Returns true when the person is now signed in,
 * false when the link was a sign-in link that failed, and null when the link was something else.
 */
export async function signInFromLink(url) {
  const t = tokensFrom(url);
  if (!t) return null;
  if ('error' in t) return false;
  const c = await supabaseClient();
  const { error } = await c.auth.setSession(t);
  return !error;
}

/** Sign out on this device only. */
export async function signOut() {
  const c = await supabaseClient();
  await c.auth.signOut({ scope: 'local' });
}

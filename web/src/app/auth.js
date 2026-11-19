// Accounts: email sign-in with a link (no password), through Supabase Auth.
// The Supabase library is only fetched when it is first needed, so it costs nothing until then.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

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
    options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true },
  });
  if (error) throw error;
}

/** Sign out on this device only. */
export async function signOut() {
  const c = await supabaseClient();
  await c.auth.signOut({ scope: 'local' });
}

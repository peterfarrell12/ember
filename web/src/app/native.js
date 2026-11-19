// @ts-check
// The few things that differ when Ember runs inside its phone app (Capacitor) rather than a browser.
// In a browser none of this does anything.

/** True inside the phone app. */
export const isNative = () => {
  const c = /** @type {any} */ (globalThis).Capacitor;
  return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
};

/** Where an emailed sign-in link should land so that it opens the app instead of a browser tab. */
export const NATIVE_SIGNIN_URL = 'ie.ember.app://signin';

/**
 * The session tokens carried by a sign-in link that opened the app, or the error it reports.
 * Supabase puts them after the '#': ie.ember.app://signin#access_token=…&refresh_token=…
 * @param {string} url
 * @returns {{ access_token: string, refresh_token: string } | { error: string } | null} null if the link is not a sign-in link
 */
export function tokensFrom(url) {
  if (typeof url !== 'string' || !url.startsWith(NATIVE_SIGNIN_URL)) return null;
  const rest = url.slice(NATIVE_SIGNIN_URL.length).replace(/^[/?#]+/, '');
  const p = new URLSearchParams(rest.replace(/[?#]/g, '&'));
  const access_token = p.get('access_token'),
    refresh_token = p.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  return { error: p.get('error_description') || p.get('error') || 'missing' };
}

/**
 * Wire up the phone app: the Android back button, and links that open the app.
 * @param {{ onBack: () => boolean, onLink: (url: string) => void }} handlers onBack returns true if it used the press
 */
export async function nativeStart({ onBack, onLink }) {
  if (!isNative()) return;
  const { App } = await import('@capacitor/app');
  // back closes whatever is open; with nothing open it leaves the app, as people expect on Android
  App.addListener('backButton', () => {
    if (!onBack()) App.minimizeApp();
  });
  App.addListener('appUrlOpen', ({ url }) => onLink(url));
}

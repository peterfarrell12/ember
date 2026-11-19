// Entry point. The app itself is the numbered files in ./app, joined in name order (see build/single-scope.js).
import 'virtual:ember-app';

// Let the app open with no connection (build/service-worker.js). Only in a real build, and not in the
// browser tests' device-only mode, where a second layer between the page and the test server only gets in the way.
let testMode = false;
try {
  testMode = !!localStorage.getItem('ember:device-only');
} catch (e) {}
if (import.meta.env.PROD && 'serviceWorker' in navigator && !testMode)
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

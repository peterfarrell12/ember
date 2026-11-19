/* ---------- features that wait for their phase ----------
   Coach (clients, messages, squad, reviews, the coach catalogue, sharing photos with a coach) and gym
   (classes, bookings, members) exist in the code but are switched off: their entry points are hidden and
   nothing is read from or written to the shared documents they rely on. See docs/BUILD_PLAN.md, Phases 7 and 8.
   The browser tests for those screens switch them on with the localStorage key below. */
export const FEATURES = { coach: false, gym: false };
try {
  Object.assign(FEATURES, JSON.parse(localStorage.getItem('ember:features') || '{}'));
} catch (e) {}

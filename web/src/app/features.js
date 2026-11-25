/* ---------- features and their switches ----------
   coach      on. Coach view, clients, programmes set for a client, messages. Between real accounts it runs on
              the coaching tables (08l-coaching.js); the prototype's shared documents are only used by the
              browser tests' stand-in for the Claude page.
   community  off. The prototype's coach catalogue, reviews and its older squad feed. They show sample coaches
              and unverified checks, so they stay off until there are real ones.
   gym        off. Classes, bookings, members. See docs/BUILD_PLAN.md, Phase 8.
   squads     on. Invite-only weekly boards for signed-in people.
   With a switch off, the entry points are hidden, the actions do nothing (08z-features.js) and nothing is read
   from or written to the documents the feature relies on. A browser can override the switches with the
   localStorage key below, which is how the tests pin the set of features each was written for. */
export const FEATURES = { coach: true, gym: false, squads: true, community: false };
try {
  Object.assign(FEATURES, JSON.parse(localStorage.getItem('ember:features') || '{}'));
} catch (e) {}

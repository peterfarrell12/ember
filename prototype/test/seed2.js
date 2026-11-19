(() => {
  window.__notOwner = true; if (localStorage.getItem('mockdb')) return; const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const p = { v: 1, onboarded: true, sex: 'f', age: 29, cm: 168, kg: 64, act: 1.55, goal: 'keep', rate: .5, t: { k: 2200, p: 120, c: 260, f: 70, w: 2500 }, created: D(10), hist: {}, wts: [{ d: D(2), kg: 64 }] };
  localStorage.setItem('mockdb', JSON.stringify({ 'data/users/u_test123/profile': p,
    'assign/u_test123': { prog: { v: 5, p: { n: 'Coach block 1', about: 'Two days', weeks: 4, days: [{ n: 'Lower', focus: 'Strength', items: [{ ex: 'squat', sets: 3, reps: '5', rest: 120 }] }] } }, tasks: { v: 6, keys: ['ready', 'steps'] }, t: { v: 7, k: 2300, p: 130 }, msg: { v: 8, d: D(0), t: 'Welcome aboard. Start with Lower on Monday.' } },
    'coach/profile': { name: 'Peter Farrell', tag: 'S&C coach', bio: 'Hybrid athletes.', spec: 'Hyrox', quals: [{ t: 'Level 4 S&C', body: 'Body', yr: '2022', ref: 'A1' }], ins: 'Insurer', aid: '2027-06', ch: { n: 'Squad sessions this week', goal: 10 } },
    'squad/u_other': { name: 'Aisling', xp: 300, wk: (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(), streak: 5, sess7: 3, win: { d: D(1), t: 'New deadlift record' }, kudos: { u_test123: 'x' } } }));
})();

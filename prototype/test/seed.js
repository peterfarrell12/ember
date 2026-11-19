(() => {
  const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  if (localStorage.getItem('mockdb')) return;
  const hist = {}, wts = []; let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 30; i >= 1; i--) { if (i % 9 === 0) continue; const k = Math.round(2050 + (rnd() - .5) * 500 + (new Date(D(i)).getDay() === 6 ? 500 : 0)); hist[D(i)] = { k, p: Math.round(120 + rnd() * 50), c: 210, f: 70, n: 7, w: 2500, ex: i % 3 ? 0 : 400, xm: i % 3 ? 0 : 60, m3: i % 4 ? 1 : 0, d: 1, zn: k > 1790 && k < 2080 ? 1 : 0 }; }
  for (let i = 30; i >= 0; i -= 2) wts.push({ d: D(i), kg: Math.round((88 - (30 - i) * .07 + (rnd() - .5) * .9) * 10) / 10 });
  const ws = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return D(Math.round((new Date() - d) / 864e5)); })();
  const p = { v: 1, onboarded: true, sex: 'm', age: 34, cm: 183, kg: wts[wts.length - 1].kg, act: 1.375, goal: 'lose', rate: .5, t: { k: 1980, p: 155, c: 205, f: 60, w: 3000 }, exAdd: true, xp: 1450, gems: 180, fr: 1, best: 9, ach: { first: D(30) }, lg: { tier: 1, wk: ws, xp: 220 }, hist, wts, rec: [{ n: 'Porridge', b: '', k: 76, p: 2.5, c: 12, f: 1.5, fi: 1.7, su: 0, sf: .3, na: 50, ports: [['1 cup', 234]], src: 'F', lq: 1, lu: '1 cup' }], created: D(30), goalKg: 82, startKg: 88, startD: D(30), ms: {}, xlog: [{ d: D(3), n: 'Padel', min: 60, k: 400, src: 'm' }] };
  localStorage.setItem('mockdb', JSON.stringify({ 'data/users/u_test123/profile': p }));
})();

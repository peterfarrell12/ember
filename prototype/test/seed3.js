(() => {
  if (localStorage.getItem('seed3')) return; localStorage.setItem('seed3', '1');
  const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const db = JSON.parse(localStorage.getItem('mockdb')), base = 'data/users/u_test123/profile', p = db[base];
  const F = (n, b, k, pr, c, f, ports, src, lq, lu, ms) => ({ n, b, k, p: pr, c, f, fi: 1, su: 1, sf: 1, na: 50, ports, src, lq, lu, ct: Object.values(ms).reduce((a, b) => a + b, 0), ms });
  p.rec = [
    F('Porridge', '', 76, 2.5, 12, 1.5, [['1 cup', 234]], 'F', 1, '1 cup', { b: 9 }),
    F('Banana, raw', '', 89, 1.1, 23, .3, [['1 medium', 118]], 'F', 1, '1 medium', { b: 6, s: 3 }),
    F('Greek yogurt, plain, low fat', '', 73, 10, 3.9, 1.9, [['1 container', 170]], 'F', 1, '1 container', { b: 4, s: 2 }),
    F('Chicken breast, grilled', '', 165, 31, 0, 3.6, [['1 breast', 172]], 'F', 150, 'g', { l: 5, d: 7 }),
    F('Basmati rice, cooked', '', 121, 3.5, 25, .4, [['1 cup', 158]], 'F', 200, 'g', { l: 3, d: 6 }),
    F('Wholemeal wrap', 'Tesco', 290, 9.5, 46, 6, [['1 wrap', 64]], 'B', 1, '1 wrap', { l: 6 }),
    F('Flat white', '', 46, 3, 4.5, 1.8, [['1 regular', 240]], 'F', 1, '1 regular', { b: 3, s: 1 }),
    F('Protein bar, chocolate', 'Fulfil', 370, 36, 28, 13, [['1 bar', 55]], 'B', 1, '1 bar', { s: 5 }),
  ];
  const E = (id, f, g, m, u) => ({ id, n: f.n, b: f.b, g, k: Math.round(f.k * g / 100), p: Math.round(f.p * g) / 100, c: Math.round(f.c * g) / 100, f: Math.round(f.f * g) / 100, fi: 1, su: 1, sf: 1, na: 20, src: f.src, m, u, t: 1 });
  const r = p.rec, yd = D(1);
  db[base + '/days/' + yd] = { date: yd, e: [E('y1', r[0], 234, 'b', '1 cup · 234 g'), E('y2', r[1], 118, 'b', '1 medium · 118 g'), E('y3', r[6], 240, 'b', '1 regular · 240 g'), E('y4', r[5], 64, 'l', '1 wrap · 64 g'), E('y5', r[3], 150, 'l', '150 g'), E('y6', r[3], 180, 'd', '180 g'), E('y7', r[4], 200, 'd', '200 g')], w: 2500, x: [], q: {}, chest: 0, done: 1, zone: 1, xp: 60, lx: 35, wx: 0, cf: [] };
  p.recV = 1;
  localStorage.setItem('mockdb', JSON.stringify(db));
})();

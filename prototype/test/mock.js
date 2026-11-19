(() => {
  const load = () => { try { return JSON.parse(localStorage.getItem('mockdb') || '{}'); } catch (e) { return {}; } };
  let data = load(); const save = () => localStorage.setItem('mockdb', JSON.stringify(data));
  const snap = (path) => ({ id: path.split('/').pop(), exists: path in data, data: () => data[path], metadata: { fromCache: false, hasPendingWrites: false } });
  const docRef = path => { if (path.split('/').length % 2) throw new TypeError('doc path parity ' + path); return {
    id: path.split('/').pop(), path,
    get: async () => snap(path), set: async d => { if (typeof d !== 'object') throw { code: 'invalid_argument' }; data[path] = JSON.parse(JSON.stringify(d)); save(); window.__writes = (window.__writes || 0) + 1; },
    update: async d => { Object.assign(data[path], d); save(); }, delete: async () => { delete data[path]; save(); },
    collection: sub => colRef(path + '/' + sub) }; };
  const colRef = path => { if (path.split('/').length % 2 === 0) throw new TypeError('col path parity ' + path); const q = {
    path, doc: id => docRef(path + '/' + (id || Math.random().toString(36).slice(2))), limit: () => q, where: () => q, orderBy: () => q,
    get: async () => { const docs = Object.keys(data).filter(k => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1).map(snap); return { docs, size: docs.length, empty: !docs.length }; } }; return q; };
  const db = { doc: docRef, collection: colRef };
  const user = { id: async () => 'u_test123', isOwner: () => !window.__notOwner };
  const sample = async (input, o) => {
    console.debug('EMBER_PROMPT ' + JSON.stringify(input)); // the harness records every prompt, to prove wording is unchanged by a refactor
    if (/Write the method/.test(input)) { const txt = '1. Heat a pan over a high heat for 2 minutes.\n2. Sear the chicken for 4 minutes a side.\n3. Rest, slice and serve over the rice.\nTip: swap the rice for couscous.'; if (o && o.onText) o.onText({ text: txt.slice(0, 40) }); return { text: txt, truncated: false }; }
    if (/exactly 3 options/.test(input)) window.__chef = input;
    if (/exactly 3 options/.test(input)) { if (/IDEAFAIL/.test(input)) { const e = new Error('x'); e.code = 'rate_limited'; throw e; } const full = JSON.stringify(await sample.json(input, o)); if (o && o.images) window.__menuImg = o.images.length;
      if (o && o.onText) { for (const cut of [.2, .5, .8]) { o.onText({ text: full.slice(0, Math.floor(full.length * cut)) }); await new Promise(r => setTimeout(r, 120)); } }
      return /IDEACUT/.test(input) ? { text: '```json\n' + full.slice(0, Math.floor(full.length * .75)), truncated: true } : { text: full, truncated: false }; }
    return { text: '5099801003339', truncated: false }; };
  sample.json = async (input, o) => {
    console.debug('EMBER_PROMPT ' + JSON.stringify(input));
    if (o && o.images) window.__img = o.images.map(f => ({ size: f.size, type: f.type, name: f.name }));
    if (/shelf ticket/.test(input) && /ITEMFAIL/.test(input)) { const e = new Error('rejected'); e.code = 'image_rejected'; throw e; }
    if (/matching products to its database/.test(input)) { window.__pickPrompt = input; const n = (input.match(/^Product \d+:/gm) || []).length; return Array.from({ length: n }, () => /Heineken/.test(input) ? 1 : /tikka/.test(input) ? -1 : 0); }
    if (/adds: "[^"]*guinness/i.test(input)) return [{ name: 'Draught 0.0 alcohol free stout', brand: 'Guinness', packaged: true, known: true, grams: 440, amount: '1 can', kcal100: 20, p100: 0.3, c100: 4, f100: 0, meal: '' }];
    if (/adds: "[^"]*heineken/i.test(input)) return [{ name: '0.0 alcohol free lager', brand: 'Heineken', packaged: true, known: true, grams: 330, amount: '1 bottle', kcal100: 21, p100: 0, c100: 4.8, f100: 0, meal: '' }];
    if (/adds: "[^"]*tikka/i.test(input)) return [{ name: 'Chicken tikka masala with rice ready meal', brand: 'Dunnes Stores', packaged: true, known: true, grams: 400, amount: '1 pack', kcal100: 130, p100: 7, c100: 15, f100: 4.5, meal: '' }];
    if (/shelf ticket/.test(input) && /pret/i.test(input)) return { items: [{ name: 'Chicken Caesar and bacon baguette', brand: 'Pret A Manger', grams: 250, amount: '1 baguette', label: true, kcal: 599, protein: 33, carbs: 55, fat: null, kcal100: 240, p100: 13, c100: 22, f100: 11, meal: '' }] };

    if (/assistant built into Ember/.test(input)) { window.__asPrompts = (window.__asPrompts || []).concat([input]); const last = (input.match(/Person: ([^\n]*)\s*$/) || [])[1] || '', L = last.toLowerCase(); const it = (name, grams, k, p, c, f) => ({ name, brand: '', grams, amount: '', kcal100: k, p100: p, c100: c, f100: f });
      if (/rashers|three sausages/.test(L)) return { say: 'Two rashers, ' + (/three/.test(L) ? 'three' : 'two') + ' sausages, a fried egg and toast with butter. Is that right?', actions: [{ do: 'food', meal: 'b', items: [it('bacon, fried', 50, 470, 34, 1, 36), it('pork sausage, fried', /three/.test(L) ? 150 : 100, 300, 14, 4, 25), it('egg, fried', 50, 196, 13.6, .8, 15), it('white bread, toasted', 60, 290, 9, 54, 4), it('butter', 10, 717, .9, .1, 81)] }], chips: ['Yes', 'It was three sausages'] };
      if (/fry/.test(L)) return { say: 'Nice. What was in the fry, and how many of each?', actions: [], chips: ['Two rashers, two sausages, an egg and toast'] };
      if (/spin/.test(L)) return { say: 'Sorted.', actions: [{ do: 'book_class', class: 'Spin', date: (input.match(/Gym timetable[^\n]*\n(?:[^\n]*\n)*?(\d{4}-\d\d-\d\d) [A-Za-z]+: [^\n]*Spin/) || [])[1] || '' }], chips: [] };
      if (/water/.test(L)) return { say: 'Done.', actions: [{ do: 'water', ml: 500 }], chips: [] };
      if (/flat white/.test(L)) return { say: 'Got it.', actions: [{ do: 'caffeine', drink: 'flat', milk: 'oat', ml: 130, sugar: 0 }], chips: [] };
      if (/padel/.test(L)) return { say: 'It is in the calendar.', actions: [{ do: 'event', title: 'Padel doubles', kind: 'match', date: new Date(Date.now() + 864e5).toISOString().slice(0, 10), time: '20:00', minutes: 90, weekly: false }], chips: [] };
      if (/weigh/.test(L)) return { say: 'Saved.', actions: [{ do: 'weight', kg: 85.4 }], chips: [] };
      if (/remove/.test(L)) return { say: 'Take the butter off?', actions: [{ do: 'remove_food', match: 'butter' }], chips: [] };
      return { say: 'You have eaten ' + ((input.match(/Today: (\d+) of/) || [])[1] || '0') + ' kcal so far today. Anything else?', actions: [], chips: ['No thanks'] }; }

    window.__prompts = (window.__prompts || []).concat([input]);
    const D = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    if (/fitness data service/.test(input)) return { days: [{ date: D(1), weightKg: 85.4, steps: 9412, activeKcal: 640, burnKcal: 2740 }, { date: D(2), weightKg: null, steps: 7001, activeKcal: 410, burnKcal: 2510 }, { date: D(3), weightKg: 85.9, steps: 12000, activeKcal: 900, burnKcal: 3010 }, { date: D(4), weightKg: null, steps: 6000, activeKcal: 300, burnKcal: 2400 }, { date: D(5), weightKg: null, steps: 8000, activeKcal: 500, burnKcal: 2600 }], workouts: [{ date: D(1), name: 'Running', minutes: 42, kcal: 480, km: 7.1 }, { date: D(3), name: 'Padel', minutes: 90, kcal: null, km: null }] };
    if (/strength and conditioning coach/.test(input)) return { name: 'Hybrid engine', about: 'Two strength days and one engine day.', weeks: 6, days: [{ name: 'Lower strength', focus: 'Squat and hinge', items: [{ ex: 'squat', sets: 4, reps: '4-6', rest: 150 }, { ex: 'rdl', sets: 3, reps: '8', rest: 120 }, { ex: 'notreal', sets: 3, reps: '10', rest: 60 }, { ex: 'copen', sets: 3, reps: '20s', rest: 30, note: 'Each side' }] }, { name: 'Engine', focus: 'Intervals', items: [{ ex: 'run', sets: 5, reps: '1000 m', rest: 90 }, { ex: 'wallball', sets: 3, reps: '20', rest: 60 }] }] };
    if (/physiotherapist/.test(input)) return { name: 'Hip plan from physio', phases: [{ name: 'Weeks 1 to 2', goal: 'Settle', items: [{ ex: 'clam', name: 'Clamshells', sets: 3, reps: '15', note: 'Each side' }, { ex: '', name: 'Standing hip hikes', sets: 2, reps: '12', note: 'Slow' }] }] };
    if (/Draft a short message/.test(input)) return { text: 'Good week. Four sessions done and protein up. Keep the Thursday session easy.' };
    if (/Review this person/.test(input)) return { headline: 'A steady fortnight with protein the weak spot.', wins: ['Logged 12 of 14 days.', 'Weekday calories sat inside your zone.'], watch: ['Saturdays ran about 600 kcal over.'], next: ['Add 30 g protein at breakfast.', 'Close out every day.', 'Weigh in three mornings.'] };
    if (/exactly 3 options/.test(input)) return [1, 2, 3].map(i => ({ title: 'Chicken and rice bowl ' + i, why: 'About 520 kcal and 45 g protein, built from foods you eat.', items: [{ name: 'chicken breast, grilled', brand: '', grams: 150, amount: '1 breast', kcal100: 165, p100: 31, c100: 0, f100: 3.6, meal: '' }, { name: 'white rice, cooked', brand: '', grams: 200, amount: '1 cup', kcal100: 130, p100: 2.7, c100: 28, f100: .3, meal: '' }] }));
    if (/correction/.test(input)) return [{ name: 'scrambled eggs', brand: '', grams: 180, amount: '3 eggs', kcal100: 150, p100: 10, c100: 1.5, f100: 11, meal: 'b' }];
    if (o && o.images && /nutrition label/.test(input)) return { name: 'Protein Bar', brand: 'Testco', kcal: 380, p: 30, c: 35, f: 12, sf: 5, su: 4, fi: 8, salt: 0.6, serving_g: 60, readable: true };
    return [
      { name: 'scrambled eggs', brand: '', grams: 120, amount: '2 eggs', kcal100: 150, p100: 10, c100: 1.5, f100: 11, meal: 'b' },
      { name: 'wholemeal toast', brand: '', grams: 70, amount: '2 slices', kcal100: 250, p100: 11, c100: 42, f100: 3.5, meal: 'b' },
      { name: 'butter', brand: 'Kerrygold', grams: 10, amount: '1 tsp', kcal100: 720, p100: 0.6, c100: 0.6, f100: 81, meal: 'b' },
      { name: 'dragonfruit kombucha smoothie bowl', brand: '', grams: 300, amount: '1 bowl', kcal100: 85, p100: 2, c100: 16, f100: 1.5, meal: 'b' },
      { name: 'white rice, cooked', brand: '', grams: 180, amount: '1 cup', kcal100: 130, p100: 2.7, c100: 28, f100: 0.3, meal: '' }];
  };
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 4, maxInputBytes: 2e7, mediaTypes: ['image/jpeg', 'image/png'] } });
  const cbs = {}; const dictation = { start: async () => { cbs.state && cbs.state({ state: 'listening' }); setTimeout(() => { cbs.partial && cbs.partial({ text: 'two scrambled' }); }, 100); setTimeout(() => { cbs.final && cbs.final({ text: 'two scrambled eggs on toast' }); }, 250); }, stop: async () => { cbs.state && cbs.state({ state: 'idle', reason: 'stopped' }); }, onPartial: f => cbs.partial = f, onFinal: f => cbs.final = f, onState: f => cbs.state = f };
  const mcp = { callTool: async (server, tool, input) => { window.__mcp = (window.__mcp || []).concat([[server, tool, input]]);
      if (window.__adSetup) return { content: [{ type: 'text', text: 'No apps are connected yet. Step 1: connect at https://www.athletedata.health/dashboard/integrations. Step 2: start the trial at https://www.athletedata.health/dashboard/billing.' }], payload: 'No apps are connected yet. Step 1: connect at https://www.athletedata.health/dashboard/integrations. Step 2: start the trial at https://www.athletedata.health/dashboard/billing.' };
      if (tool === 'whoop_get_workouts') throw { code: 'tool_error', message: 'not linked' };
      return { content: [], payload: { rows: [{ date: 'x', burnKcal: 2700 }] } }; }, listTools: async () => ({ servers: [] }) };
  const caps = { db, user, sample, dictation, mcp };
  caps.tts = { speak: async t => { window.__spoken = (window.__spoken || []).concat([String(t)]); }, stop: () => { }, onState: () => { } };
  caps.assets = { upload: async b => { const id = 'a' + Math.random().toString(36).slice(2, 9); window.__up = (window.__up || 0) + 1; return { id, url: '/_blob/' + id, sizeBytes: b.size, contentType: b.type }; }, list: async () => ({ assets: [], usage: {} }), delete: async () => { window.__del = (window.__del || 0) + 1; } };
  window.claude = { use: async n => caps[n] || null };
})();

/* ---------- a food diary from another app ----------
   Reads the spreadsheet (or zip of spreadsheets) another calorie app exports and puts the days into the diary.
   The reading is in importer.js; this file is the screen and the writing.

   Rules:
   - What comes in is marked Imported (SRC.IM): the other app's figures, not checked against Ember's food data.
   - A day that already has food logged in Ember is left alone, so nothing is counted twice.
   - Imported days earn nothing: no XP, no quests, and they do not count towards the streak (see hasDay).
   - Bringing the same file in again replaces what it brought before instead of doubling it.
   - It can all be taken out again. */
let DY = null;
const dyOut = html => {
  const o = $('#dyOut');
  if (o) o.innerHTML = html;
};
const dyNote = t => `<div class="banner">${ic('label')}<span>${t}</span></div>`;
const ownFood = date => {
  const h = P.hist[date];
  return !!h && h.n > 0 && !h.im;
};
const importedDays = () => Object.keys(P.hist).filter(k => P.hist[k].im);

A.importDiary = () => {
  DY = null;
  const had = importedDays().length;
  openSheet(
    `${sh('Bring your diary with you')}<div class="sheet-b">
    <div class="card stack"><h2>From another calorie app</h2>
      <p class="small muted">Export your diary from the other app as a spreadsheet (CSV) and pick the file here, or the zip it arrived in. Ember reads the column headings, so exports from MyFitnessPal, Cronometer, Lose It! and most others work.</p>
      <button class="btn" data-act="pickDiary">${ic('upload')} Choose the file</button><div id="dyOut"></div>
      <p class="tiny muted">The file is read on this device. Imported days show what the other app recorded and are marked Imported. They give your charts and your measured burn a history to work from; they do not earn XP or count towards your streak.</p></div>
    ${had ? `<div class="card stack"><h2>Already imported</h2><p class="small muted">${had} day${had === 1 ? '' : 's'} in your diary came from another app.</p><button class="btn ghost" data-act="diaryUnimport">Take the imported days out</button></div>` : ''}
    <button class="link" data-act="openConnections" style="align-self:center">Weigh-ins or workouts from a wearable instead</button></div>`,
    true,
  );
};
A.pickDiary = () => $('#fileDiary').click();
$('#fileDiary').addEventListener('change', e => {
  const fs = [...e.target.files];
  e.target.value = '';
  if (fs.length) onDiary(fs);
});

async function onDiary(files) {
  dyOut(
    `<div class="busy"><div class="spinner"></div>Reading ${esc(files.length === 1 ? files[0].name : files.length + ' files')}</div>`,
  );
  try {
    const texts = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name) || /zip/.test(f.type)) texts.push(...(await csvFilesInZip(await f.arrayBuffer())));
      else texts.push({ name: f.name, text: await f.text() });
    }
    const foods = [],
      others = [];
    for (const t of texts) {
      const r = readDiary(parseCsv(t.text));
      if (r.kind === 'food') foods.push(r);
      else if (r.kind === 'other') others.push(t);
    }
    // weigh-ins and workouts that came in the same export go through the reader the app already has
    const extra = { wts: [], works: [] };
    for (const t of others) {
      const r = readCsv(t.text);
      if (r.wts) extra.wts.push(...r.wts);
      if (r.works) extra.works.push(...r.works);
    }
    if (!foods.length && !extra.wts.length && !extra.works.length)
      return dyOut(
        dyNote(
          texts.length
            ? 'No food diary found in that file. It needs a date column and a calories column, with protein, carbohydrate or fat beside them.'
            : 'There are no spreadsheet (CSV) files in that zip.',
        ),
      );
    const m = foods.length ? mergeDiaries(foods, { today: today(), maxDays: 365 }) : null;
    DY = { m, extra };
    dyPreview();
  } catch (e) {
    dyOut(dyNote(e && e.code === 'not_zip' ? 'That zip file could not be opened.' : 'That file could not be read.'));
  }
}
function dyPreview() {
  const { m, extra } = DY;
  const lines = [];
  let fresh = 0;
  if (m) {
    const own = m.days.filter(d => ownFood(d.date)).length;
    fresh = m.days.length - own;
    lines.push(
      `<b>${esc(m.app === 'another app' ? 'Food diary' : m.app + ' diary')}</b>: ${fmt(m.days.length)} day${m.days.length === 1 ? '' : 's'}, ${niceDate(m.from)}${m.to !== m.from ? ' to ' + niceDate(m.to) : ''}, ${fmt(m.entries)} entr${m.entries === 1 ? 'y' : 'ies'}.`,
    );
    if (m.totalsOnly)
      lines.push(
        'This export holds totals, not each food, so each meal or day comes in as one line with its calories and macros.',
      );
    if (own)
      lines.push(
        `${own} of those days already ${own === 1 ? 'has' : 'have'} food logged in Ember and will be left as ${own === 1 ? 'it is' : 'they are'}.`,
      );
    if (m.older) lines.push(`Ember brings in the most recent year. ${fmt(m.older)} older days are left out.`);
    if (m.unsure)
      lines.push(
        'The dates in this file can be read two ways (3/4 as 3 April or as 4 March). Ember read the day first. If the dates above look wrong, do not import.',
      );
  }
  if (extra.wts.length)
    lines.push(`Also in the export: ${fmt(extra.wts.length)} weigh-in${extra.wts.length === 1 ? '' : 's'}.`);
  if (extra.works.length)
    lines.push(
      `Also in the export: ${fmt(extra.works.length)} workout${extra.works.length === 1 ? '' : 's'}. The last 120 days are added.`,
    );
  const any = fresh > 0 || extra.wts.length || extra.works.length;
  dyOut(
    `<div class="stack" style="margin-top:4px">${lines.map(l => `<p class="small">${l}</p>`).join('')}${any ? `<button class="btn" data-act="diaryImport" id="dyGo">${ic('check')} Bring ${fresh > 0 ? fmt(fresh) + ' day' + (fresh === 1 ? '' : 's') : 'them'} in</button>` : `<p class="small muted">Nothing new to bring in.</p>`}</div>`,
  );
}
const dyEntry = e => ({
  id: newId(),
  n: e.n,
  b: e.b || '',
  g: 0,
  u: e.u,
  k: r0(e.k),
  p: r1(e.p),
  c: r1(e.c),
  f: r1(e.f),
  ...(e.fi == null ? {} : { fi: r1(e.fi) }),
  ...(e.su == null ? {} : { su: r1(e.su) }),
  ...(e.sf == null ? {} : { sf: r1(e.sf) }),
  ...(e.na == null ? {} : { na: r0(e.na) }),
  src: 'IM',
  m: e.m,
});
/* Writes go out a few at a time: a year of days is a few hundred documents, and sending them all at once
   would swamp a phone's connection and the device's own outbox. */
const dyBreathe = async () => {
  for (let i = 0; i < 300 && Store.busy > 6; i++) await new Promise(r => setTimeout(r, 50));
};
/** Every stored day by date. Days the list missed (it stops at 500) but the history knows are fetched one by one. */
async function dyStored(dates) {
  const by = {};
  for (const d of await Store.list('days')) if (d.date) by[d.date] = d;
  for (const date of dates) if (!by[date] && P.hist[date]) by[date] = await Store.get('days', date);
  return by;
}
A.diaryImport = async () => {
  if (!DY) return;
  if (DEMO) return toast('Leave the preview first: this would change your own diary.');
  const { m, extra } = DY;
  DY = null;
  dyOut(
    `<div class="stack"><span class="small muted" id="dyMsg">Bringing your diary in</span><div class="prog"><i id="dyBar" style="width:0"></i></div></div>`,
  );
  let days = 0,
    entries = 0;
  try {
    if (m) {
      const todo = m.days.filter(d => !ownFood(d.date));
      const stored = await dyStored(todo.map(d => d.date));
      for (const [i, day] of todo.entries()) {
        const d = { ...newDay(day.date), ...(stored[day.date] || {}) };
        d.e = d.e.filter(e => e.src !== 'IM').concat(day.entries.map(dyEntry)); // the same file again replaces what it brought
        S.days[d.date] = d;
        setHist(d);
        Store.put('days', d.date, d);
        days++;
        entries += day.entries.length;
        if (i % 6 === 5) {
          await dyBreathe();
          const b = $('#dyBar');
          if (b) b.style.width = Math.round(((i + 1) / todo.length) * 100) + '%';
        }
      }
      P.imp = { at: today(), app: m.app, days };
    }
    const { nw, nx } = await applyImport(extra, 'csv'); // saves the profile and redraws
    dyOut(
      `<div class="banner">${ic('check')}<span>${[days ? `${fmt(days)} day${days === 1 ? '' : 's'} and ${fmt(entries)} entr${entries === 1 ? 'y' : 'ies'} brought in` : '', nw ? `${nw} weigh-in${nw === 1 ? '' : 's'} added` : '', nx ? `${nx} workout${nx === 1 ? '' : 's'} added` : ''].filter(Boolean).join(', ') || 'Nothing new was found'}. ${days ? 'Find them on the calendar and in your charts.' : ''}</span></div>`,
    );
  } catch (e) {
    saveProfile();
    dyOut(
      dyNote(
        `The import stopped part way${days ? ' after ' + days + ' days' : ''}. Check your connection and choose the file again: days already brought in are not doubled.`,
      ),
    );
  }
};
A.diaryUnimport = async () => {
  if (DEMO) return;
  const dates = importedDays();
  const more = Object.keys(P.hist).filter(k => !P.hist[k].im && P.hist[k].n > 0);
  closeSheet();
  toast('Taking the imported days out');
  try {
    const stored = await dyStored(dates.concat(more));
    let n = 0;
    for (const d of Object.values(stored)) {
      if (!d || !(d.e || []).some(e => e.src === 'IM')) continue;
      const day = { ...newDay(d.date), ...d };
      day.e = day.e.filter(e => e.src !== 'IM');
      S.days[day.date] = day;
      const empty = !day.e.length && !day.x.length && !day.w && !(day.cf || []).length;
      if (empty && !(P.hist[day.date] || {}).z) {
        delete S.days[day.date];
        delete P.hist[day.date];
        Store.del('days', day.date);
      } else {
        setHist(day);
        Store.put('days', day.date, day);
      }
      if (++n % 6 === 0) await dyBreathe();
    }
    delete P.imp;
    saveProfile();
    render();
    toast(n ? `Imported entries removed from ${n} day${n === 1 ? '' : 's'}` : 'There was nothing imported to remove');
  } catch (e) {
    saveProfile();
    toast('Could not finish. Check your connection and try again.');
  }
};

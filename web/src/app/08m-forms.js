/* ================= forms: a coach's own questions, and the answers =================
   Each coach builds their own forms: a consultation form, a check-in, anything else. Ember ships starters
   that a coach copies and changes; nothing is fixed. A form is kept with the coach's other documents. When a
   coach sets a form for a client, the questions travel with what the coach sets (so the client's app needs
   no access to the coach's documents), and each answer is stored with the question as it was asked, so
   changing a form later does not rewrite what someone already said.

   Kinds of form:
     consult  the consultation form, sent once when someone becomes a client
     checkin  a check-in on a schedule; the week's figures from the diary go with it
     self     a check-in the client does for themselves on a schedule (their relationship with food, say) */
const Q_KINDS = {
  long: 'Long answer',
  text: 'Short answer',
  num: 'Number',
  scale: 'Scale, 1 to 10',
  scale5: 'Scale, 1 to 5',
  one: 'One choice',
  many: 'Several choices',
  yn: 'Yes or no',
  date: 'Date',
  meas: 'Measurement, cm',
};
const FORM_KINDS = { consult: 'Consultation', checkin: 'Check-in', self: 'Self check-in' };
const qNorm = q => (typeof q === 'string' ? { t: q, k: 'long' } : { k: 'long', ...q });
const FORM_STARTERS = {
  consult: {
    title: 'Consultation',
    qs: [
      { t: 'What do you want to achieve, and by when?', k: 'long', r: 1 },
      { t: 'What has got in the way before?', k: 'long' },
      { t: 'How many days a week can you train?', k: 'one', o: ['1', '2', '3', '4', '5', '6 or more'], r: 1 },
      { t: 'Where will you train?', k: 'many', o: ['A gym', 'At home with weights', 'At home, no kit', 'Outdoors'] },
      { t: 'Any injuries, pain or conditions I should know about?', k: 'long' },
      { t: 'Has a doctor ever told you not to exercise, or to take care with it?', k: 'yn', r: 1 },
      { t: 'What do you usually eat on a normal day?', k: 'long' },
      { t: 'Foods you do not eat or cannot eat', k: 'text' },
      { t: 'How many hours do you sleep on a typical night?', k: 'num', u: 'hours' },
      { t: 'How would you rate your stress at the moment?', k: 'scale' },
      { t: 'Anything else you want me to know?', k: 'long' },
    ],
  },
  checkin: {
    title: 'Weekly check-in',
    qs: [
      { t: 'How did the week go overall?', k: 'scale', r: 1 },
      { t: 'What went well?', k: 'long' },
      { t: 'What got in the way?', k: 'long' },
      { t: 'How was your energy?', k: 'scale5' },
      { t: 'How was your sleep?', k: 'scale5' },
      { t: 'Anything you want to change next week?', k: 'long' },
    ],
  },
  self: {
    title: 'Relationship with food',
    qs: [
      { t: 'How relaxed did you feel around food this week?', k: 'scale' },
      { t: 'Did you eat without distraction at least once a day?', k: 'yn' },
      { t: 'A meal you enjoyed this week', k: 'text' },
      { t: 'Anything that felt hard?', k: 'long' },
    ],
  },
};
/* ---------- drawing a form and reading it back ---------- */
function formFields(qs, pre) {
  return qs
    .map(qNorm)
    .map((q, i) => {
      const id = pre + i,
        label = `${esc(q.t)}${q.r ? ' <span class="muted">(needed)</span>' : ''}`,
        pick = (opts, many, cls = '') =>
          `<div class="f">${label}<div class="opts ${cls}" id="${id}" data-many="${many ? 1 : 0}">${opts.map(o => `<button type="button" data-act="fmPick" data-v="${esc(String(o))}" aria-pressed="false">${esc(String(o))}</button>`).join('')}</div></div>`;
      if (q.k === 'one' || q.k === 'many') return pick(q.o && q.o.length ? q.o : ['Yes', 'No'], q.k === 'many');
      if (q.k === 'yn') return pick(['Yes', 'No'], false);
      if (q.k === 'scale' || q.k === 'scale5')
        return pick(
          Array.from({ length: q.k === 'scale' ? 10 : 5 }, (x, n) => n + 1),
          false,
          'scale',
        );
      if (q.k === 'text') return `<label class="f">${label}<input class="inp" id="${id}" maxlength="200"></label>`;
      if (q.k === 'num' || q.k === 'meas')
        return `<label class="f">${label}<span class="row" style="gap:8px"><input class="inp" id="${id}" inputmode="decimal" style="max-width:140px"><span class="muted small">${esc(q.k === 'meas' ? 'cm' : q.u || '')}</span></span></label>`;
      if (q.k === 'date') return `<label class="f">${label}<input class="inp" id="${id}" type="date"></label>`;
      return `<label class="f">${label}<textarea class="inp" id="${id}" rows="2" maxlength="1500" autocapitalize="sentences"></textarea></label>`;
    })
    .join('');
}
A.fmPick = (d, el) => {
  const box = el.parentElement,
    on = el.getAttribute('aria-pressed') !== 'true';
  if (box.dataset.many !== '1') $$('button', box).forEach(b => b.setAttribute('aria-pressed', 'false'));
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
};
/* the answers, each with the question as asked; `missing` is the first needed question left empty */
function formRead(qs, pre) {
  let missing = '';
  const answers = qs.map(qNorm).map((q, i) => {
    const el = $('#' + pre + i);
    let a = '';
    if (el && el.classList.contains('opts'))
      a = $$('button[aria-pressed="true"]', el)
        .map(b => b.dataset.v)
        .join(', ');
    else if (el) a = String(el.value || '').trim();
    if ((q.k === 'num' || q.k === 'meas') && a) a = String(num(a)) + (q.k === 'meas' ? ' cm' : q.u ? ' ' + q.u : '');
    if (q.r && !a && !missing) missing = q.t;
    return { q: q.t, a: a.slice(0, 1500), ...(q.k === 'meas' && a ? { cm: num(a) } : {}) };
  });
  return { answers, missing };
}
const formAnswers = (answers, prev) =>
  answers
    .map(a => {
      const was = prev && (prev.answers.find(p => p.q === a.q) || {}).a;
      return `<div class="card stack" style="gap:4px"><b class="small">${esc(a.q)}</b><p class="small" style="white-space:pre-wrap">${a.a ? esc(a.a) : '<span class="muted">No answer</span>'}</p>${was && was !== a.a ? `<p class="tiny muted">Last time: ${esc(was.slice(0, 200))}</p>` : ''}</div>`;
    })
    .join('');

/* ---------- the coach's forms ---------- */
let FORMS = null,
  FE = null;
async function formsLoad() {
  if (!FORMS) FORMS = (await Store.list('forms')).filter(f => f && f.id).sort((a, b) => (a.title < b.title ? -1 : 1));
  return FORMS;
}
const formsOf = kind => (FORMS || []).filter(f => f.kind === kind);
A.cfForms = async () => {
  openSheet(
    `${sh('Your forms')}<div class="sheet-b" id="fmsBody"><div class="busy"><div class="spinner"></div>Loading</div></div>`,
    true,
  );
  await formsLoad();
  cfDraw();
};
function cfDraw() {
  const b = $('#fmsBody');
  if (!b) return;
  b.innerHTML = `<p class="small muted">Your consultation form, your check-ins and anything else you ask clients. Each one is yours to change; clients get the questions as they are when you send them.</p>
    ${
      FORMS.length
        ? `<div class="card" style="padding:4px 14px">${FORMS.map(f => `<button class="entry" data-act="cfEdit" data-id="${f.id}"><span class="n">${esc(f.title)}</span><span class="k">${ic('chev-r')}</span><span class="s">${FORM_KINDS[f.kind] || 'Form'} · ${f.qs.length} question${f.qs.length === 1 ? '' : 's'}</span></button>`).join('')}</div>`
        : `<p class="empty">No forms yet. Start from one of these and make it yours.</p>`
    }
    <div class="f">Start a new form from<div class="opts">${Object.entries(FORM_KINDS)
      .map(([k, l]) => `<button data-act="cfNew" data-kind="${k}">${l}</button>`)
      .join('')}<button data-act="cfNew" data-kind="blank">A blank form</button></div></div>`;
}
A.cfNew = ({ kind }) => {
  const st = FORM_STARTERS[kind];
  FE = st
    ? { id: '', kind, title: st.title, qs: clone(st.qs) }
    : { id: '', kind: 'checkin', title: '', qs: [{ t: '', k: 'long' }] };
  cfOpenEditor();
};
A.cfEdit = ({ id }) => {
  const f = (FORMS || []).find(x => x.id === id);
  if (!f) return;
  FE = clone(f);
  cfOpenEditor();
};
function cfOpenEditor() {
  openSheet(
    `${sh(FE.id ? 'Edit form' : 'New form')}<div class="sheet-b" id="feBody"></div><div class="sheet-f">${FE.id ? `<button class="btn ghost" style="width:auto" data-act="cfDelete" aria-label="Delete this form">${ic('trash')}</button>` : ''}<button class="btn ghost" data-act="cfPreview">Preview</button><button class="btn" data-act="cfSave">Save</button></div>`,
    true,
  );
  feDraw();
}
/* keep what is typed in the editor before it is redrawn */
function feKeep() {
  if (!$('#feTitle')) return;
  FE.title = $('#feTitle').value;
  FE.kind = $('#feKind').value;
  FE.qs.forEach((q, i) => {
    q.t = $('#feQ' + i).value;
    q.k = $('#feK' + i).value;
    const o = $('#feO' + i),
      u = $('#feU' + i);
    if (o)
      q.o = o.value
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
        .slice(0, 12);
    if (u) q.u = u.value.trim().slice(0, 12);
    q.r = $('#feR' + i).getAttribute('aria-pressed') === 'true' ? 1 : 0;
  });
}
function feDraw() {
  const b = $('#feBody');
  if (!b) return;
  b.innerHTML = `<label class="f">Title<input class="inp" id="feTitle" maxlength="60" value="${esc(FE.title)}" placeholder="Weekly check-in"></label>
    <label class="f">Used as<select class="inp" id="feKind">${Object.entries(FORM_KINDS)
      .map(([k, l]) => `<option value="${k}" ${k === FE.kind ? 'selected' : ''}>${l}</option>`)
      .join('')}</select></label>
    ${FE.qs
      .map((q, i) => {
        q = qNorm(q);
        return `<div class="card stack" style="gap:8px"><div class="between"><b class="small">Question ${i + 1}</b><span class="row" style="gap:2px"><button class="icon-btn" data-act="feMove" data-i="${i}" data-by="-1" aria-label="Move question ${i + 1} up" ${i ? '' : 'disabled'} style="transform:rotate(90deg)">${ic('chev-l')}</button><button class="icon-btn" data-act="feMove" data-i="${i}" data-by="1" aria-label="Move question ${i + 1} down" ${i < FE.qs.length - 1 ? '' : 'disabled'} style="transform:rotate(90deg)">${ic('chev-r')}</button><button class="icon-btn" data-act="feDel" data-i="${i}" aria-label="Remove question ${i + 1}">${ic('x')}</button></span></div>
        <input class="inp" id="feQ${i}" maxlength="160" value="${esc(q.t)}" placeholder="What do you want to ask?" aria-label="Question ${i + 1}">
        <div class="two"><select class="inp" id="feK${i}" data-on="feKind" aria-label="Kind of answer">${Object.entries(
          Q_KINDS,
        )
          .map(([k, l]) => `<option value="${k}" ${k === q.k ? 'selected' : ''}>${l}</option>`)
          .join(
            '',
          )}</select><button class="chk" id="feR${i}" data-act="cgPageOpen" aria-pressed="${q.r ? 'true' : 'false'}"><span class="tb"></span><span>Needed</span></button></div>
        ${q.k === 'one' || q.k === 'many' ? `<input class="inp" id="feO${i}" maxlength="300" value="${esc((q.o || []).join(', '))}" placeholder="Choices, separated by commas" aria-label="Choices">` : ''}${q.k === 'num' ? `<input class="inp" id="feU${i}" maxlength="12" value="${esc(q.u || '')}" placeholder="Unit, for example hours" aria-label="Unit">` : ''}</div>`;
      })
      .join('')}
    <button class="addline" data-act="feAdd">${ic('plus')} Add a question</button>`;
}
I.feKind = () => {
  feKeep();
  feDraw();
};
A.feAdd = () => {
  feKeep();
  if (FE.qs.length >= 30) return toast('Thirty questions is the most a form can hold.');
  FE.qs.push({ t: '', k: 'long' });
  feDraw();
};
A.feDel = ({ i }) => {
  feKeep();
  FE.qs.splice(+i, 1);
  feDraw();
};
A.feMove = ({ i, by }) => {
  feKeep();
  const a = +i,
    b = a + +by;
  if (b < 0 || b >= FE.qs.length) return;
  [FE.qs[a], FE.qs[b]] = [FE.qs[b], FE.qs[a]];
  feDraw();
};
A.cfPreview = () => {
  feKeep();
  openSheet(
    `${sh(FE.title || 'Preview')}<div class="sheet-b"><div class="banner">${ic('search')}<span>This is how your client sees it. Nothing here is sent.</span></div>${formFields(
      FE.qs.filter(q => q.t.trim()),
      'pv',
    )}</div>`,
    true,
  );
};
A.cfSave = () => {
  feKeep();
  FE.title = FE.title.trim().slice(0, 60);
  FE.qs = FE.qs.map(qNorm).filter(q => q.t.trim());
  if (!FE.title) return toast('Give the form a title.');
  if (!FE.qs.length) return toast('Add at least one question.');
  if (!FE.id) FE.id = newId();
  FE.at = today();
  Store.put('forms', FE.id, FE);
  FORMS = (FORMS || []).filter(f => f.id !== FE.id).concat([clone(FE)]);
  FORMS.sort((a, b) => (a.title < b.title ? -1 : 1));
  closeSheet();
  cfDraw();
  if ($('#ccBody')) renderClient();
  // a form picker open underneath shows the form just saved, already chosen
  if ($('#ckPick') && CKF) $('#ckPick').innerHTML = ckPickOpts(CKF.fk, FE.kind === CKF.fk ? FE.title : '');
  toast('Form saved.');
};
A.cfDelete = () => {
  Store.del('forms', FE.id);
  FORMS = FORMS.filter(f => f.id !== FE.id);
  closeSheet();
  cfDraw();
  toast('Form deleted. Answers already given are kept.');
};

/* ---------- what a coach sets arrives in the client's app ---------- */
/* Everything set for a client beyond a programme and targets is kept as it came, under P.co, newest wins. */
const CO_PARTS = ['consult', 'self', 'phases', 'habits', 'supps', 'vault', 'recipes', 'menu', 'steps'];
function cgApplyMore(a, seen) {
  let changed = false;
  if (a.checkin && a.checkin.v > (seen.checkin || 0)) {
    const f = a.checkin.form || { title: 'Check-in', qs: a.checkin.qs || [] };
    P.ckForm = {
      title: f.title || 'Check-in',
      qs: (f.qs || []).slice(0, 30),
      wd: a.checkin.wd || 0,
      every: a.checkin.every || 1,
    };
    seen.checkin = a.checkin.v;
    changed = true;
  }
  if (a.brand && a.brand.v > (seen.brand || 0)) {
    P.coachBrand = a.brand.colour || '';
    seen.brand = a.brand.v;
    changed = true;
  }
  P.co = P.co || {};
  for (const k of CO_PARTS)
    if (a[k] && a[k].v > (seen[k] || 0)) {
      P.co[k] = a[k];
      seen[k] = a[k].v;
      changed = true;
    }
  return changed;
}

/* ---------- the client: forms to fill in ---------- */
const CK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ckWeek = () => weekStart(today());
const weeksSince = k => (k ? Math.round((pdate(ckWeek()) - pdate(k)) / 6048e5) : 999);
const coached = () => hasCoach() && CG.coach.status === 'active';
/* which forms are waiting for this person, in the order to show them */
function formsDue() {
  if (!coached()) return [];
  const out = [],
    co = P.co || {};
  if (co.consult && co.consult.form && P.consultSent !== co.consult.v)
    out.push({ kind: 'consult', form: co.consult.form, note: 'Your coach reads this before building your plan.' });
  const f = P.ckForm;
  if (f && f.qs.length && weeksSince(P.ckSent) >= (f.every || 1) && wdOf(today()) >= (f.wd || 0))
    out.push({ kind: 'checkin', form: f, note: 'Your figures for the week are filled in for you.' });
  const s = co.self && co.self.form;
  if (s && s.qs.length && weeksSince(P.selfSent) >= (co.self.every || 1) && wdOf(today()) >= (co.self.wd || 0))
    out.push({ kind: 'self', form: s, note: 'A few questions for you. Your coach sees your answers.' });
  return out;
}
/* the week's figures, cut to what is shared, as label and value pairs */
function ckFigures() {
  const st = sharedCopy({ st: myStatus() }, CG.coach ? CG.coach.share : {}).st,
    out = [['Streak', st.streak + (st.streak === 1 ? ' day' : ' days')]];
  if (st.logged7 != null)
    out.push(
      ['Food logged', st.logged7 + ' of 7 days'],
      ['Calories', fmt(st.kcalAvg) + ' a day against ' + fmt(st.kcalT)],
      ['Protein', st.protAvg + ' g a day against ' + st.protT + ' g'],
    );
  if (st.sess7 != null) out.push(['Sessions', st.sess7 + (st.plan7 ? ' of ' + st.plan7 + ' planned' : '')]);
  if (st.prs14) out.push(['Records, last 14 days', String(st.prs14)]);
  if (st.pain != null) out.push(['Rehab pain', st.pain + ' out of 10']);
  if (st.kg != null)
    out.push([
      'Weight',
      st.kg + ' kg' + (st.kg30 != null ? ', ' + (st.kg30 > 0 ? '+' : '') + st.kg30 + ' kg in a month' : ''),
    ]);
  if (st.ready != null) out.push(['Recovery today', String(st.ready)]);
  return out;
}
const ckFigureRows = figs =>
  figs
    .map(
      ([l, v]) =>
        `<div class="between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted">${esc(l)}</span><b style="text-align:right">${esc(v)}</b></div>`,
    )
    .join('');
function cgCheckinCard() {
  if (!hasCoach()) return '';
  const who = esc(CG.coach.coach_name),
    last = (CG.cks || []).find(k => k.feedback);
  const reply =
    last && last.feedback_at > (P.ckSeen || '')
      ? `<section class="card stack" style="border-color:var(--ember)"><div><div class="tiny muted">From your coach, ${who}</div><h2>A reply to your ${last.kind === 'consult' ? 'consultation' : 'check-in'}</h2></div><p class="small" style="white-space:pre-wrap">${esc(last.feedback)}</p><button class="btn sm ghost" data-act="cgCkRead" style="align-self:flex-start">Got it</button></section>`
      : '';
  return (
    reply +
    formsDue()
      .map(
        d =>
          `<section class="card stack"><div><div class="tiny muted">For your coach, ${who}</div><h2>${esc(d.form.title || FORM_KINDS[d.kind])}</h2></div><p class="small muted">${d.form.qs.length} question${d.form.qs.length === 1 ? '' : 's'}. ${d.note}</p><button class="btn sm" data-act="cgCheckin" data-kind="${d.kind}" style="align-self:flex-start">Start</button></section>`,
      )
      .join('')
  );
}
A.cgCkRead = () => {
  P.ckSeen = new Date().toISOString();
  saveProfile();
  render();
};
/* shown with any self check-in: where to turn if food is a struggle. General guidance, not a diagnosis. */
const SUPPORT_LINE =
  'If food or eating is weighing on you, you do not have to manage it alone. Bodywhys (bodywhys.ie) in Ireland and Beat (beateatingdisorders.org.uk) in the UK give free, confidential support, and your GP can help too.';
let FILL = null;
A.cgCheckin = ({ kind } = {}) => {
  const d = formsDue().find(x => x.kind === (kind || 'checkin')) || formsDue()[0];
  if (!d) return toast('There is nothing waiting for you to fill in.');
  FILL = d;
  openSheet(
    `${sh((d.form.title || FORM_KINDS[d.kind]) + ' for ' + CG.coach.coach_name)}<div class="sheet-b">${d.kind === 'checkin' ? `<div class="card" style="padding:6px 14px"><div class="tiny muted" style="padding-top:6px">Sent with your answers, from your diary</div>${ckFigureRows(ckFigures())}</div>` : ''}
    ${formFields(d.form.qs, 'ckA')}
    <p class="tiny muted">${d.kind === 'checkin' ? 'Only figures from what you share with your coach are included. You can send it again until they reply.' : 'Your answers go to your coach and to nobody else.'}</p>${d.kind === 'self' ? `<p class="tiny muted">${SUPPORT_LINE}</p>` : ''}</div>
    <div class="sheet-f"><button class="btn ember" data-act="cgCheckinSend" id="ckGo">Send to ${esc(CG.coach.coach_name)}</button></div>`,
    true,
  );
};
A.cgCheckinSend = async () => {
  const d = FILL,
    { answers, missing } = formRead(d.form.qs, 'ckA');
  if (missing) return toast('Please answer: ' + missing);
  if (!answers.some(x => x.a)) return toast('Answer at least one question first.');
  const go = $('#ckGo');
  go.disabled = true;
  try {
    const week = d.kind === 'consult' ? '1970-01-01' : ckWeek();
    await (
      await cgApi()
    ).checkinSend(
      week,
      answers,
      d.kind === 'checkin' ? Object.fromEntries(ckFigures()) : {},
      d.kind,
      d.form.title || '',
    );
    if (d.kind === 'consult') P.consultSent = P.co.consult.v;
    else if (d.kind === 'self') P.selfSent = week;
    else P.ckSent = week;
    // a measurement asked for in a form is also kept with the person's own measurements
    const cm = answers.filter(a => a.cm);
    if (cm.length) measAdd(Object.fromEntries(cm.map(a => [a.q.slice(0, 24), a.cm])));
    saveProfile();
    closeAll();
    render();
    toast('Sent to your coach.', 'good');
  } catch (e) {
    go.disabled = false;
    toast(e && e.code === 'already_answered' ? 'Your coach has already replied to this one.' : cgWhy(e));
  }
};

/* ---------- the coach: setting forms for a client, and reading what comes back ---------- */
const EVERY = { 1: 'Every week', 2: 'Every two weeks', 4: 'Every four weeks' };
function cgCkPlanCard(c) {
  if (c.kind !== 'live' || !c.link) return '';
  const rec = CO.clients[c.id] || {},
    row = (kind, title, on, off) =>
      `<section class="card stack"><div class="between"><h2>${title}</h2><button class="link" data-act="cgCkForm" data-kind="${kind}">${rec[kind] ? 'Change' : 'Set'}</button></div><p class="small muted">${rec[kind] ? on(rec[kind]) : off}</p></section>`;
  return (
    row(
      'ck',
      'Check-in',
      f =>
        `${esc(f.title || 'Check-in')}: ${f.qs.length} question${f.qs.length === 1 ? '' : 's'}, ${(EVERY[f.every || 1] || '').toLowerCase()} from ${CK_DAYS[f.wd || 0]}. Their figures come with the answers.`,
      'Ask your own questions on a schedule. Their figures for the week arrive with the answers, so they only write what the numbers cannot say.',
    ) +
    row(
      'consult',
      'Consultation form',
      f => `${esc(f.title)}: ${f.qs.length} questions. ${rec.consultIn ? 'Answered.' : 'Waiting for their answers.'}`,
      'Sent once. They are asked to fill it in when they next open the app.',
    ) +
    row(
      'self',
      'Self check-in',
      f => `${esc(f.title)}: ${f.qs.length} questions, ${(EVERY[f.every || 1] || '').toLowerCase()}.`,
      'A few questions they answer for themselves on a schedule, such as their relationship with food.',
    )
  );
}
let CKF = null;
/* the coach's own forms of one kind, then Ember's starter, then off */
const ckPickOpts = (fk, title) => {
  const mine = formsOf(fk);
  return `${mine.map(f => `<option value="${f.id}" ${title === f.title ? 'selected' : ''}>${esc(f.title)}</option>`).join('')}<option value="starter" ${mine.some(f => f.title === title) ? '' : 'selected'}>Ember's starter: ${esc(FORM_STARTERS[fk].title)}</option><option value="off">None: stop asking</option>`;
};
A.cgCkForm = async ({ kind } = {}) => {
  kind = kind || 'ck';
  const c = getClient(CC),
    fk = kind === 'ck' ? 'checkin' : kind,
    cur = (CO.clients[c.id] || {})[kind];
  await formsLoad();
  CKF = { kind, fk };
  openSheet(
    `${sh(FORM_KINDS[fk] + ' for ' + c.name)}<div class="sheet-b"><label class="f">Which form<select class="inp" id="ckPick">${ckPickOpts(fk, cur && cur.title)}</select></label>
    ${
      fk === 'consult'
        ? ''
        : `<div class="two"><label class="f">How often<select class="inp" id="ckEvery">${Object.entries(EVERY)
            .map(([n, l]) => `<option value="${n}" ${+n === ((cur && cur.every) || 1) ? 'selected' : ''}>${l}</option>`)
            .join(
              '',
            )}</select></label><label class="f">Ready from<select class="inp" id="ckWd">${CK_DAYS.map((d, i) => `<option value="${i}" ${i === ((cur && cur.wd) || 0) ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>`
    }
    <button class="link" data-act="cfForms" style="align-self:flex-start">Build or change your forms</button>
    <p class="tiny muted">They get the questions as they are now. Changing the form later does not change what they have already answered.</p></div>
    <div class="sheet-f"><button class="btn" data-act="cgCkFormSave">Save</button></div>`,
    true,
  );
};
A.cgCkFormSave = async () => {
  const c = getClient(CC),
    { kind, fk } = CKF,
    pick = $('#ckPick').value,
    src =
      pick === 'starter'
        ? FORM_STARTERS[fk]
        : pick === 'off'
          ? { title: '', qs: [] }
          : (FORMS || []).find(f => f.id === pick),
    form = { title: src.title, qs: clone(src.qs) },
    every = $('#ckEvery') ? clamp(r0(num($('#ckEvery').value)), 1, 4) : 1,
    wd = $('#ckWd') ? clamp(r0(num($('#ckWd').value)), 0, 6) : 0;
  if (!(await pushAssign(c.uid, fk, { form, wd, every }))) return;
  const rec = recOf(c.id);
  if (form.qs.length) rec[kind] = { ...form, wd, every };
  else delete rec[kind];
  saveCO();
  closeSheet();
  renderClient();
  toast(form.qs.length ? FORM_KINDS[fk] + ' set.' : 'Switched off.');
};
/* a client's answers, read when their workspace opens */
async function cgCkLoad(c) {
  if (!c || !c.link) return;
  CG.ck = CG.ck || {};
  try {
    CG.ck[c.link] = await (await cgApi()).checkins(c.link, 12);
    const rec = recOf(c.id),
      had = !!rec.consultIn;
    rec.consultIn = CG.ck[c.link].some(k => k.kind === 'consult');
    if (had !== rec.consultIn) saveCO();
    if ($('#ccBody') && CC === c.id) renderClient();
  } catch (e) {}
}
const ckLabel = k => (k.kind === 'consult' ? 'Consultation' : (k.title || 'Check-in') + ', week of ' + wkDate(k.week));
function cgClientCheckins(c) {
  if (c.kind !== 'live' || !c.link) return '';
  const list = (CG.ck || {})[c.link];
  if (list === undefined) {
    cgCkLoad(c);
    return '';
  }
  if (!list.length) return '';
  return `<section class="card"><h2>Check-ins and forms</h2>${list
    .slice(0, 6)
    .map(
      k =>
        `<button class="entry" data-act="cgCkOpen" data-id="${k.id}"><span class="n">${esc(ckLabel(k))}</span><span class="k">${k.feedback || k.kind === 'self' ? '' : '<span class="pill gold">To answer</span>'}</span><span class="s" style="white-space:normal">${esc(((k.answers.find(a => a.a.length > 3) || k.answers.find(a => a.a) || {}).a || '').slice(0, 110))}</span></button>`,
    )
    .join('')}</section>`;
}
let CKO = null;
A.cgCkOpen = ({ id }) => {
  const c = getClient(CC),
    list = (c && (CG.ck || {})[c.link]) || [],
    k = list.find(x => x.id === id);
  if (!k) return;
  const prev = list.find(x => x.kind === k.kind && x.week < k.week),
    figs = Object.entries(k.figures || {});
  CKO = { id, c: c.id, link: c.link };
  openSheet(
    `${sh(c.name.split(' ')[0] + ': ' + ckLabel(k))}<div class="sheet-b">${figs.length ? `<div class="card" style="padding:6px 14px"><div class="tiny muted" style="padding-top:6px">Their week, from their diary</div>${ckFigureRows(figs)}</div>` : ''}
    ${formAnswers(k.answers, prev)}
    <div id="ckSum"></div>
    <label class="f">Your reply<textarea class="inp" id="ckReply" rows="5" maxlength="4000" autocapitalize="sentences">${esc(k.feedback || '')}</textarea></label>
    ${AI.sample ? `<button class="btn ghost" data-act="cgCkDraft">${ic('spark')} Summarise and draft a reply</button>` : ''}</div>
    <div class="sheet-f"><button class="btn ember" data-act="cgCkReply" id="ckSend">${k.feedback ? 'Send the changed reply' : 'Send reply'}</button></div>`,
    true,
  );
};
A.cgCkDraft = async () => {
  const c = getClient(CKO.c),
    list = (CG.ck || {})[CKO.link] || [],
    k = list.find(x => x.id === CKO.id),
    prev = list.find(x => x.week < k.week && x.feedback),
    out = $('#ckSum');
  out.innerHTML = `<div class="busy"><div class="spinner"></div>Reading it</div>`;
  try {
    const r = await AI.sample.json([
      'checkin_read',
      {
        name: c.name,
        figures:
          Object.entries(k.figures || {})
            .map(([l, v]) => l + ': ' + v)
            .join('; ') || 'none shared',
        answers: k.answers.map(a => a.q + '\n' + (a.a || '(no answer)')).join('\n\n'),
        last: prev ? prev.feedback.slice(0, 600) : '',
      },
    ]);
    if (!$('#ckSum')) return;
    out.innerHTML = `<div class="card stack" style="gap:4px"><span class="src e" style="align-self:flex-start">Claude's summary</span><p class="small">${esc(String(r.summary || ''))}</p></div>`;
    const box = $('#ckReply');
    if (r.reply && !box.value.trim()) {
      box.value = String(r.reply);
      out.innerHTML += `<p class="tiny muted">A draft reply is in the box below. It is Claude's wording: read it, change it, and send it only when it says what you mean.</p>`;
    }
  } catch (e) {
    if ($('#ckSum')) out.innerHTML = `<div class="banner">${ic('spark')}<span>${esc(aiError(e))}</span></div>`;
  }
};
A.cgCkReply = async () => {
  const text = ($('#ckReply').value || '').trim();
  if (text.length < 2) return toast('Write your reply first.');
  const go = $('#ckSend');
  go.disabled = true;
  try {
    await (await cgApi()).checkinReply(CKO.id, text);
    const c = getClient(CKO.c);
    closeSheet();
    CG.inboxAt = 0;
    await cgCkLoad(c);
    toast('Reply sent.', 'good');
  } catch (e) {
    go.disabled = false;
    toast(cgWhy(e));
  }
};

/* ================= v3 demo: coach catalogue with invented sample coaches, plans and reviews ================= */
/* Everything in DEMO_COACHES is fictional and is labelled Sample wherever it is shown. */
const RV = (name, stars, mo, t) => ({ name, stars, mo, t });
const DEMO_COACHES = [
  {
    id: 'd1',
    name: 'Orla Tierney',
    tag: 'Hyrox and hybrid coach',
    loc: 'Galway and online',
    spec: ['Hyrox', 'Running', 'Strength'],
    yrs: 8,
    n: 34,
    ck: { id: 1, q: 1, ins: 1, aid: 1 },
    bio: 'I coach people who want to lift and run well at the same time. Most of my clients are training for their first or second Hyrox.',
    quals: [
      ['Strength and conditioning diploma, level 4', 2018],
      ['Endurance coaching certificate', 2020],
    ],
    plans: [
      ['Hyrox 12-week build', '€299', 'Four sessions a week, a simulation every third week, weekly review'],
      ['Ongoing coaching', '€150 a month', 'Program, nutrition targets and messaging'],
    ],
    reviews: [
      RV('Sample client A', 5, 1, 'Took eleven minutes off my time. The simulations meant race day held no surprises.'),
      RV('Sample client B', 5, 3, 'Clear sessions and she answers the same day.'),
      RV('Sample client C', 4, 5, 'Hard but fair. I would have liked more on nutrition early on.'),
      RV('Sample client D', 5, 8, 'First Hyrox done at 44. Never thought I would say that.'),
    ],
  },
  {
    id: 'd2',
    name: 'Fergal Noone',
    tag: 'Field sport strength coach',
    loc: 'Roscommon',
    spec: ['Field sports', 'Strength', 'Speed'],
    yrs: 11,
    n: 52,
    ck: { id: 1, q: 1, ins: 1, aid: 1 },
    bio: 'In-season and off-season programs for club players. Two sessions a week that fit around training and matches.',
    quals: [
      ['Sports science degree', 2013],
      ['Strength and conditioning accreditation', 2015],
    ],
    plans: [
      ['In-season, two days', '€90 a month', 'Short sessions built around your fixtures'],
      ['Off-season block', '€240', 'Ten weeks of strength and speed'],
    ],
    reviews: [
      RV('Sample client E', 5, 2, 'Played every game this year for the first time in four seasons.'),
      RV('Sample client F', 4, 4, 'Sessions are short enough that I actually do them.'),
      RV('Sample client G', 5, 7, 'Knows the game and knows when to back off before a match.'),
    ],
  },
  {
    id: 'd3',
    name: 'Maeve Costigan',
    tag: 'Return from injury coach',
    loc: 'Online',
    spec: ['Rehab', 'Running', 'Strength'],
    yrs: 9,
    n: 27,
    ck: { id: 1, q: 1, ins: 1, aid: 1 },
    bio: 'I pick up where your physio leaves off and get you back to full training without the setback.',
    quals: [
      ['Physiotherapy degree', 2014],
      ['Strength and conditioning diploma, level 4', 2017],
    ],
    plans: [
      ['Return to sport', '€180 a month', 'Staged plan, pain tracking, fortnightly call'],
      ['Single assessment', '€70', 'One video call and a four-week plan'],
    ],
    reviews: [
      RV('Sample client H', 5, 1, 'Back sprinting after two failed attempts on my own.'),
      RV('Sample client I', 5, 6, 'She explained why at every step, which stopped me rushing it.'),
      RV('Sample client J', 4, 9, 'Slower than I wanted. She was right.'),
    ],
  },
  {
    id: 'd4',
    name: 'Ruairi Lenehan',
    tag: 'Strength coach',
    loc: 'Athlone',
    spec: ['Strength', 'Muscle'],
    yrs: 6,
    n: 19,
    ck: { id: 1, q: 1, ins: 1, aid: 0 },
    bio: 'Barbell coaching for people who want to get properly strong. In person or by video review.',
    quals: [
      ['Personal training certificate, level 3', 2019],
      ['Weightlifting coaching award', 2021],
    ],
    plans: [
      ['Online strength', '€110 a month', 'Program and weekly video review of your lifts'],
      ['In person', '€50 a session', 'One to one in the gym'],
    ],
    reviews: [
      RV('Sample client K', 5, 2, 'Fixed my squat in two sessions after years of knee pain.'),
      RV('Sample client L', 4, 5, 'Good program. Replies can take a couple of days.'),
    ],
  },
  {
    id: 'd5',
    name: 'Grainne Hession',
    tag: 'Padel and racquet performance',
    loc: 'Sligo and online',
    spec: ['Padel', 'Mobility', 'Strength'],
    yrs: 5,
    n: 22,
    ck: { id: 1, q: 1, ins: 1, aid: 1 },
    bio: 'Strength, movement and shoulder care for padel and tennis players at any level.',
    quals: [
      ['Strength and conditioning diploma, level 4', 2020],
      ['Racquet sports fitness certificate', 2022],
    ],
    plans: [['Court-ready', '€95 a month', 'Two sessions a week plus a shoulder and elbow routine']],
    reviews: [
      RV('Sample client M', 5, 1, 'My elbow stopped hurting within a month and I move better on court.'),
      RV('Sample client N', 5, 3, 'Finally a program written for the sport I play.'),
      RV('Sample client O', 4, 4, 'Really good. Wish there were more court drills.'),
    ],
  },
  {
    id: 'd6',
    name: 'Cathal Rattigan',
    tag: 'Weight loss and habits',
    loc: 'Online',
    spec: ['Weight loss', 'Nutrition', 'Strength'],
    yrs: 7,
    n: 61,
    ck: { id: 1, q: 1, ins: 1, aid: 1 },
    bio: 'Simple training and food habits that survive a busy week. No meal plans, no banned foods.',
    quals: [
      ['Nutrition coaching certificate', 2019],
      ['Personal training certificate, level 3', 2018],
    ],
    plans: [['Habit coaching', '€120 a month', 'Three sessions a week, calorie and protein targets, weekly check-in']],
    reviews: [
      RV('Sample client P', 5, 2, 'Nine kilos in five months and I still eat with my family.'),
      RV('Sample client Q', 5, 4, 'The weekly check-in is what kept me going.'),
      RV('Sample client R', 3, 6, 'It worked, but I wanted more training variety.'),
      RV('Sample client S', 5, 10, 'Kept it off for a year now.'),
    ],
  },
  {
    id: 'd7',
    name: 'Jay Maddox Fitness',
    tag: 'Elite transformation coach',
    loc: 'Online',
    spec: ['Weight loss', 'Muscle'],
    yrs: 1,
    n: 3,
    ck: { id: 0, q: 0, ins: 0, aid: 0 },
    bio: 'Guaranteed results in 30 days. DM for the secret method the industry does not want you to know.',
    quals: [['Certified master trainer', 2025]],
    plans: [['30-day shred', '€499', 'Paid up front']],
    reviews: [RV('Unlinked account', 5, 0, 'Best coach ever!!!')],
    warn: 1,
  },
];
const dcAvg = c => c.reviews.reduce((s, r) => s + r.stars, 0) / c.reviews.length;
const dcChecks = c => [
  ['Identity checked', c.ck.id],
  ['Qualifications confirmed with the awarding body', c.ck.q],
  ['Insurance in date', c.ck.ins],
  ['First aid in date', c.ck.aid],
];
const SAMPLE_PILL = '<span class="pill">Sample</span>';
let CAT = { spec: '', ver: false };
A.catalogue = () => {
  openSheet(`${sh('Coach catalogue')}<div class="sheet-b" id="catBody"></div>`, true);
  renderCat();
};
function renderCat() {
  const b = $('#catBody');
  if (!b) return;
  const owner = Store.owner !== false,
    demo = CO.demo !== false && owner;
  const specs = [...new Set(DEMO_COACHES.flatMap(c => c.spec))].sort();
  const list = demo
    ? DEMO_COACHES.filter(
        c => (!CAT.spec || c.spec.includes(CAT.spec)) && (!CAT.ver || dcChecks(c).every(x => x[1])),
      ).sort(
        (a, b2) => dcChecks(b2).filter(x => x[1]).length - dcChecks(a).filter(x => x[1]).length || dcAvg(b2) - dcAvg(a),
      )
    : [];
  const pf = coachProfile(),
    tc = trustChecks(pf);
  b.innerHTML = `${demo ? `<div class="banner">${ic('alert')}<span>Demo catalogue. Every coach, price, qualification and review below is invented to show how this works, and is marked Sample. <button class="link" data-act="coDropSamples">Remove demo data</button></span></div>` : ''}
    ${owner ? `<button class="crow card" data-act="catMe" style="padding:14px"><span class="av">${esc(initials(pf.name || 'You'))}</span><span class="grow"><span class="row" style="gap:6px"><b class="ell">${esc(pf.name || 'Your profile')}</b><span class="pill gold">You</span></span><span class="small muted" style="display:block">${tc.filter(t => t[1]).length} of ${tc.length} trust checks · ${REVIEWS.length} real review${REVIEWS.length === 1 ? '' : 's'}</span></span>${ic('chev-r')}</button>` : ''}
    ${
      demo
        ? `<div class="grid2"><select class="inp" id="catSpec" data-on="cat" aria-label="Specialism"><option value="">All specialisms</option>${specs.map(s => `<option ${CAT.spec === s ? 'selected' : ''}>${s}</option>`).join('')}</select><button class="btn ghost" data-act="catVer" aria-pressed="${CAT.ver}" style="height:46px">${ic(CAT.ver ? 'check' : 'shield')} ${CAT.ver ? 'Fully checked only' : 'Show all'}</button></div>
    ${
      list
        .map(c => {
          const ok = dcChecks(c).filter(x => x[1]).length;
          return `<button class="card ccard" data-act="catCoach" data-id="${c.id}"><span class="crow" style="border:0;padding:0"><span class="av">${esc(initials(c.name))}</span><span class="grow"><span class="row" style="gap:6px"><b class="ell">${esc(c.name)}</b>${SAMPLE_PILL}</span><span class="small muted ell" style="display:block">${esc(c.tag)} · ${esc(c.loc)}</span></span></span>
      <span class="between" style="margin-top:10px"><span class="row" style="gap:6px">${stars(Math.round(dcAvg(c)))}<b>${r1(dcAvg(c))}</b><span class="muted small">${c.reviews.length} review${c.reviews.length === 1 ? '' : 's'}</span></span><span class="pill ${ok === 4 ? 'good' : ok ? 'gold' : 'bad'}">${ic(ok === 4 ? 'check' : 'alert')} ${ok} of 4 checks</span></span>
      <span class="between small" style="margin-top:8px"><span class="muted">${c.spec.join(' · ')}</span><b>from ${esc(c.plans[0][1])}</b></span></button>`;
        })
        .join('') || `<p class="empty">No sample coach matches that filter.</p>`
    }`
        : `<p class="small muted">The catalogue is empty with demo data off. In the full product this lists every coach who has passed the checks.</p><button class="link" data-act="coDemoOn" style="align-self:flex-start">Show demo data</button>`
    }`;
}
I.cat = el => {
  CAT.spec = el.value;
  renderCat();
};
A.catVer = () => {
  CAT.ver = !CAT.ver;
  renderCat();
};
A.catMe = () =>
  openSheet(
    `${sh('How clients see you')}<div class="sheet-b">${profileCard(coachProfile())}<button class="btn ghost" data-act="coProfile">${ic('edit')} Edit my profile</button></div>`,
    true,
  );
A.catCoach = ({ id }) => {
  const c = DEMO_COACHES.find(x => x.id === id),
    ch = dcChecks(c),
    ok = ch.filter(x => x[1]).length;
  openSheet(
    `${sh(c.name)}<div class="sheet-b"><div class="banner">${ic('alert')}<span>Sample coach. This person, their qualifications, prices and reviews are invented.</span></div>
    <section class="card stack"><div class="crow" style="cursor:default;border:0;padding:0"><span class="av lg">${esc(initials(c.name))}</span><span class="grow"><b style="font-size:17px">${esc(c.name)}</b><span class="small muted" style="display:block">${esc(c.tag)} · ${esc(c.loc)}</span></span></div><p class="small">${esc(c.bio)}</p>
      <div class="ms">${c.spec.map(s => `<span>${esc(s)}</span>`).join('')}</div><div class="row small muted" style="gap:14px"><span>${c.yrs} year${c.yrs === 1 ? '' : 's'} coaching</span><span>${c.n} clients on Ember</span></div></section>
    ${c.warn ? `<div class="banner" style="background:var(--ember-soft)">${ic('alert')}<span>None of this coach's claims could be checked, and their one review is not from a client they coached here. This is what a spoofer looks like in the catalogue.</span></div>` : ''}
    <section class="card stack"><div class="between"><h2>Trust checks</h2><span class="pill ${ok === 4 ? 'good' : ok ? 'gold' : 'bad'}">${ok} of 4</span></div>${ch.map(t => `<div class="task ${t[1] ? 'on' : ''}" style="border:0;padding:4px 0;margin:0"><span class="tb">${t[1] ? ic('check') : ''}</span><span>${t[0]}</span></div>`).join('')}</section>
    <section class="card"><h2>Qualifications</h2>${c.quals.map(q => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal">${esc(q[0])}</span><span class="k"><span class="pill ${c.ck.q ? 'good' : 'bad'}">${c.ck.q ? 'Confirmed' : 'Not confirmed'}</span></span><span class="s">Sample awarding body · ${q[1]}</span></div>`).join('')}</section>
    <section class="card"><h2>Plans</h2>${c.plans.map(p => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal">${esc(p[0])}</span><span class="k">${esc(p[1])}</span><span class="s" style="white-space:normal">${esc(p[2])}</span></div>`).join('')}</section>
    <section class="card"><div class="between"><h2>Reviews</h2><span class="row" style="gap:6px">${stars(Math.round(dcAvg(c)))}<b>${r1(dcAvg(c))}</b></span></div>
      ${c.reviews.map(r => `<div class="entry" style="cursor:default"><span class="n" style="white-space:normal;font-weight:500">${esc(r.t)}</span><span class="k">${stars(r.stars)}</span><span class="s">${SAMPLE_PILL}<span>${esc(r.name)} · ${c.warn ? 'not a verified client' : 'verified client'} · ${r.mo ? r.mo + ' month' + (r.mo === 1 ? '' : 's') + ' ago' : 'this month'}</span></span></div>`).join('')}</section></div>
    <div class="sheet-f"><button class="btn ember" data-act="catJoin">Ask to work with ${esc(c.name.split(' ')[0])}</button></div>`,
    true,
  );
};
A.catJoin = () => toast('This is a sample coach, so there is nobody to ask. Requests go live with the standalone app.');

/* ---------- plans a coach offers, on their own profile ---------- */
const EX_PLANS = () => [
  { n: 'Online coaching', price: '€140 a month', about: 'Program, weekly review and messaging', ex: 1 },
  { n: '12-week Hyrox block', price: '€299', about: 'Four sessions a week with a simulation every third week', ex: 1 },
];
function plansOf(pf) {
  if (pf.plans === undefined && Store.owner !== false && CO.demo !== false) pf.plans = EX_PLANS();
  return pf.plans || [];
}
function plansHtml(pf, edit) {
  const ps = plansOf(pf);
  if (!ps.length && !edit) return '';
  return `<div>${ps.map((p, i) => `<${edit ? 'button data-act="cpPlanDel" data-i="' + i + '"' : 'div style="cursor:default"'} class="entry"><span class="n" style="white-space:normal">${esc(p.n)}</span><span class="k">${esc(p.price)}</span><span class="s" style="white-space:normal">${p.ex ? '<span class="pill">Example</span>' : ''}<span>${esc(p.about || '')}${edit ? ' · tap to remove' : ''}</span></span></${edit ? 'button' : 'div'}>`).join('') || `<p class="empty">None added.</p>`}</div>`;
}
A.cpPlan = () => {
  openSheet(
    `${sh('Add a plan')}<div class="sheet-b"><label class="f">Name<input class="inp" id="cplN" placeholder="Online coaching" autocomplete="off"></label><label class="f">Price<input class="inp" id="cplP" placeholder="€140 a month" autocomplete="off"></label><label class="f">What is included<input class="inp" id="cplA" placeholder="Program, weekly review and messaging" autocomplete="off"></label></div><div class="sheet-f"><button class="btn" data-act="cpPlanSave">Add</button></div>`,
  );
};
A.cpPlanSave = () => {
  const n = $('#cplN').value.trim();
  if (!n) return toast('Name the plan.');
  const pf = coachProfile();
  pf.plans = plansOf(pf)
    .filter(p => !p.ex)
    .concat([
      { n: n.slice(0, 60), price: $('#cplP').value.trim().slice(0, 30), about: $('#cplA').value.trim().slice(0, 120) },
    ]);
  closeSheet();
  renderProfile();
};
A.cpPlanDel = ({ i }) => {
  const pf = coachProfile();
  pf.plans = plansOf(pf).slice();
  pf.plans.splice(+i, 1);
  renderProfile();
};

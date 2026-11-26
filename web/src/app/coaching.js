// @ts-check
// Coaching on Supabase: a coach and a client as two accounts. The database holds the rules
// (supabase/migrations/…_coaching.sql); this file is the calls, and the one piece of logic that must not be
// wrong: cutting what a client's app sends down to what the client has chosen to share.

export const SHARE_AREAS = /** @type {const} */ (['food', 'training', 'weight', 'recovery']);
export const SHARE_LABEL = {
  food: ['Food', 'What you eat and drink, your targets and your calorie averages'],
  training: ['Training', 'Sessions, your programme, records and rehab'],
  weight: ['Weight', 'Weigh-ins, your trend and your goal weight'],
  recovery: ['Recovery', 'Daily check-ins, sleep and recovery scores'],
};

/* which part of a client's summary belongs to which area; anything not listed here is never sent */
const STATUS_ALWAYS = ['upd', 'streak', 'tasksDone', 'tasksTot'];
const STATUS_BY_AREA = {
  food: ['kcalAvg', 'kcalT', 'protAvg', 'protT', 'logged7'],
  training: [
    'sess7',
    'plan7',
    'lastSess',
    'progN',
    'progWk',
    'progWeeks',
    'prs14',
    'rehabN',
    'rehabPh',
    'pain',
    'painPrev',
  ],
  weight: ['kg', 'kg30'],
  recovery: ['ready'],
};
const EVENT_AREA = { dumbbell: 'training', trophy: 'training', pulse: 'training', scale: 'weight', alert: 'recovery' };
/* the fields of a day's history line, by area */
const HIST_BY_AREA = {
  food: ['k', 'p', 'c', 'f', 'n', 'w', 'm3', 'cf', 'd', 'zn', 'im'],
  training: ['ex', 'xm', 'ts'],
  recovery: ['rd', 'sl', 'hv', 'rh', 'sn', 'bk', 'st', 'ab'],
};
const pick = (from, keys) => {
  const out = {};
  for (const k of keys) if (from && from[k] !== undefined) out[k] = from[k];
  return out;
};
const clean = share => Object.fromEntries(SHARE_AREAS.map(a => [a, !!(share && share[a])]));

/**
 * What a client's app sends to their coach, cut down to what the client shares. Everything a coach can ever
 * see about a client passes through here, on the client's own device, before it leaves.
 *
 * @param {{ name?: string, goal?: string, st?: object, ev?: { d: string, k: string, s: string }[], msgs?: any[],
 *   profile?: any, days?: Record<string, any>, train?: any, progs?: Record<string, any> }} full
 * @param {Partial<Record<'food' | 'training' | 'weight' | 'recovery', boolean>>} share
 */
export function sharedCopy(full, share) {
  const on = clean(share);
  const st = pick(full.st, STATUS_ALWAYS);
  for (const a of SHARE_AREAS) if (on[a]) Object.assign(st, pick(full.st, STATUS_BY_AREA[a]));
  const out = {
    name: String(full.name || '').slice(0, 40),
    goal: on.weight ? String(full.goal || '') : '',
    share: on,
    st,
    ev: (full.ev || []).filter(e => on[EVENT_AREA[e.k]]).slice(0, 12),
    msgs: (full.msgs || []).slice(-30),
    v: Date.now(),
  };
  // the copy of the app itself, for "see what the client sees"
  const p = full.profile;
  if (p) {
    const hist = {};
    for (const [date, h] of Object.entries(p.hist || {})
      .sort()
      .slice(-60)) {
      const line = {};
      for (const a of /** @type {const} */ (['food', 'training', 'recovery']))
        if (on[a]) Object.assign(line, pick(h, HIST_BY_AREA[a]));
      if (Object.keys(line).length) hist[date] = line;
    }
    const profile = {
      ...pick(p, ['coachName', 'xp', 'gems', 'fr', 'best', 'ach', 'lg', 'st', 'created', 'theme', 'brks', 'onboarded']),
      hist,
      ...(on.food ? pick(p, ['t', 'goal', 'rate', 'exAdd', 'usual', 'fast']) : {}),
      ...(on.weight
        ? {
            ...pick(p, ['kg', 'goalKg', 'sex', 'age', 'cm', 'act']),
            wts: (p.wts || []).slice(-120),
            meas: (p.meas || []).slice(-40),
          }
        : {}),
      ...(on.training ? pick(p, ['prog', 'tasks', 'plan']) : {}),
    };
    const days = {};
    for (const [date, d] of Object.entries(full.days || {})
      .sort()
      .slice(-14)) {
      const day = { date };
      if (on.food) Object.assign(day, pick(d, ['e', 'w', 'cf', 'done', 'zone']));
      if (on.training) Object.assign(day, pick(d, ['x']));
      days[date] = day;
    }
    const t = full.train || {};
    const train = {
      ...(on.training
        ? { ...pick(t, ['lifts', 'rehab', 'rplans', 'rlog', 'cx']), sess: (t.sess || []).slice(0, 30) }
        : {}),
      ...(on.recovery ? pick(t, ['ready']) : {}),
    };
    out.view = { profile, days, train, progs: on.training ? full.progs || {} : {} };
  }
  return out;
}

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x, dp = 0) => (x == null ? null : Math.round(x * 10 ** dp) / 10 ** dp);
const utc = key => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));
const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
const plusDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number),
    t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/**
 * One week of a person's own data as a handful of averages, cut to what they share. Written by the client's
 * app for their coach, so a coach's phases and trends have history without the diary ever being read.
 * @param {{ week: string, hist: Record<string, any>, wts: { d: string, kg: number }[], sess: { d: string, kind?: string }[], planned?: number }} own
 *   week is the Monday; planned is how many sessions the programme asks for in a week
 * @param {Partial<Record<'food' | 'training' | 'weight' | 'recovery', boolean>>} share
 */
export function weekSummary(own, share) {
  const on = clean(share),
    days = Array.from({ length: 7 }, (x, i) => plusDays(own.week, i)),
    end = days[6],
    lines = days.map(d => own.hist[d]).filter(Boolean),
    logged = lines.filter(h => h.n > 0 && !h.im),
    out = { week: own.week };
  if (on.food) {
    out.days = logged.length;
    out.kcal = round(mean(logged.map(h => h.k || 0)));
    out.prot = round(mean(logged.map(h => h.p || 0)));
    out.fibre = round(mean(logged.filter(h => h.fi != null).map(h => h.fi)));
  }
  if (on.weight) {
    const ws = (own.wts || []).filter(w => w.d >= own.week && w.d <= end).map(w => w.kg);
    out.kg = round(mean(ws), 1);
    out.weighs = ws.length;
  }
  if (on.training) {
    out.sess = (own.sess || []).filter(s => s.d >= own.week && s.d <= end && s.kind !== 'rehab').length;
    out.plan = own.planned || 0;
  }
  if (on.recovery || on.training) {
    const steps = lines.filter(h => h.st > 0).map(h => h.st);
    if (steps.length) out.steps = round(mean(steps));
  }
  return out;
}

/**
 * How engaged a client is, from what they share. Each part is a share of what was asked for; a part the
 * client does not share, or that the coach has not asked for, is left out and does not count against them.
 * Nothing from before they became a client counts either: `since` is the day the link was accepted.
 * @param {{ share: any, st: any, weeks: { week: string, data: any }[], checkins: { week: string, kind: string }[],
 *   schedule?: { every?: number } | null, thisWeek: string, since?: string, today?: string }} c
 * @returns {{ score: number | null, state: 'On track' | 'Slipping' | 'Behind' | 'Not enough yet', parts: { key: string, label: string, done: number, of: number }[] }}
 */
export function engagement(c) {
  const on = clean(c.share),
    st = c.st || {},
    parts = [],
    since = c.since || '0000-00-00';
  // the last four finished weeks they were a client for the whole of
  const last4 = Array.from({ length: 4 }, (x, i) => plusDays(c.thisWeek, -7 * (i + 1))).filter(w => w >= since);
  if (c.schedule) {
    const every = c.schedule.every || 1,
      inWeek = /** @type {Set<string>} */ (
        new Set((c.checkins || []).filter(k => k.kind === 'checkin').map(k => k.week))
      ),
      early = inWeek.has(c.thisWeek) ? 1 : 0, // this week's is already in: it counts, and so does its week
      due = Math.floor((last4.length + early) / every),
      got = last4.filter(w => inWeek.has(w)).length + early;
    if (due > 0)
      parts.push({
        key: 'checkins',
        label: 'Check-ins, last ' + (last4.length + early) + ' week' + (last4.length + early === 1 ? '' : 's'),
        done: Math.min(got, due),
        of: due,
      });
  }
  if (on.food && st.logged7 != null) {
    // someone who joined three days ago is judged on three days
    const days = c.since && c.today ? Math.min(7, Math.max(1, daysBetween(since, c.today) + 1)) : 7;
    parts.push({
      key: 'food',
      label: 'Food logged, last ' + (days === 7 ? '7 days' : days + ' day' + (days === 1 ? '' : 's')),
      done: Math.min(st.logged7, days),
      of: days,
    });
  }
  if (on.training && st.plan7 > 0)
    parts.push({
      key: 'training',
      label: 'Sessions, last 7 days',
      done: Math.min(st.sess7 || 0, st.plan7),
      of: st.plan7,
    });
  if (on.weight && last4.length) {
    const weeks = (c.weeks || []).filter(w => last4.includes(w.week));
    if (weeks.length)
      parts.push({
        key: 'weight',
        label: 'Weeks with a weigh-in, last ' + last4.length,
        done: weeks.filter(w => w.data.weighs > 0).length,
        of: last4.length,
      });
  }
  if (!parts.length) return { score: null, state: 'Not enough yet', parts };
  const score = Math.round(mean(parts.map(p => p.done / p.of)) * 100);
  return { score, state: score >= 80 ? 'On track' : score >= 50 ? 'Slipping' : 'Behind', parts };
}

const REASONS = [
  'not_found',
  'own_invite',
  'already_coached',
  'too_many_clients',
  'no_coach',
  'too_large',
  'not_allowed',
  'already_answered',
  'own_page',
  'closed',
  'too_many',
  'ended',
  'not_signed_in',
];
const fail = error => {
  const text = String((error && error.message) || '');
  throw { code: REASONS.find(r => text.includes(r)) || 'failed', message: text };
};

/**
 * @param {any} client a signed-in Supabase client
 * @param {string} userId
 */
export function coachingApi(client, userId) {
  const rpc = async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) fail(error);
    return data;
  };
  return {
    /** Every link this person is on: `clients` where they are the coach, `coach` where they are the client. */
    async links() {
      const { data, error } = await client
        .from('coach_links')
        .select('id, coach_id, client_id, code, status, coach_name, client_name, share, created_at, accepted_at')
        .neq('status', 'ended')
        .order('created_at');
      if (error) fail(error);
      return {
        clients: data.filter(l => l.coach_id === userId),
        coach: data.find(l => l.client_id === userId) || null,
      };
    },
    /** Make an invitation. Returns { id, code }. */
    async invite(coachName, clientName, email) {
      const out = await rpc('coach_invite', {
        p_coach_name: coachName,
        p_client_name: clientName || '',
        p_email: email || null,
      });
      return Array.isArray(out) ? out[0] : out;
    },
    /** Invitations waiting for this person's own email address: [{ code, coach_name }]. */
    invitesForMe: () => rpc('coach_invites_for_me', {}),
    /** Who an invitation is from: { coach_name, own }. */
    inviteInfo: code => rpc('coach_invite_info', { p_code: code }),
    /** Accept an invitation. Returns the link's id. */
    accept: (code, name, share) => rpc('coach_accept', { p_code: code, p_name: name || '', p_share: clean(share) }),
    setShare: (linkId, share) => rpc('coach_link_update', { p_link: linkId, p_action: 'share', p_share: clean(share) }),
    pause: linkId => rpc('coach_link_update', { p_link: linkId, p_action: 'pause' }),
    resume: linkId => rpc('coach_link_update', { p_link: linkId, p_action: 'resume' }),
    end: linkId => rpc('coach_link_update', { p_link: linkId, p_action: 'end' }),
    /** Client: send the shared copy to the coach. */
    publish: copy => rpc('coach_publish', { p_data: copy }),
    /** Coach: what each active client has sent, by link id. */
    async statuses() {
      const { data, error } = await client.from('coach_status').select('link_id, data, updated_at');
      if (error) fail(error);
      return Object.fromEntries(data.map(r => [r.link_id, r]));
    },
    /** What has been set on a link (the client reads their own; the coach reads what they set). */
    async assigned(linkId) {
      const { data, error } = await client.from('coach_assign').select('data').eq('link_id', linkId).maybeSingle();
      if (error) fail(error);
      return data ? data.data : null;
    },
    /** Coach: set one part of what a client has been given. */
    assign: (linkId, part, value) => rpc('coach_assign_put', { p_link: linkId, p_part: part, p_val: value }),
    /** Messages on a link after a given id, oldest first. */
    async messages(linkId, afterId = 0) {
      const { data, error } = await client
        .from('coach_messages')
        .select('id, sender, body, created_at')
        .eq('link_id', linkId)
        .gt('id', afterId)
        .order('id')
        .limit(200);
      if (error) fail(error);
      return data.map(m => ({ ...m, mine: m.sender === userId }));
    },
    /** Messages on every link this person is on, after a given id, oldest first. */
    async messagesAll(afterId = 0) {
      const { data, error } = await client
        .from('coach_messages')
        .select('id, link_id, sender, body, created_at')
        .gt('id', afterId)
        .order('id')
        .limit(500);
      if (error) fail(error);
      return data.map(m => ({ ...m, mine: m.sender === userId }));
    },
    async send(linkId, body) {
      const { error } = await client.from('coach_messages').insert({ link_id: linkId, body });
      if (error) fail(error);
    },
    /* ----- check-ins ----- */
    /** Client: send this week's check-in. Returns its id. */
    checkinSend: (week, answers, figures, kind = 'checkin', title = '') =>
      rpc('coach_checkin_send', { p_week: week, p_answers: answers, p_figures: figures, p_kind: kind, p_title: title }),
    /** Coach: reply to a check-in. */
    checkinReply: (id, feedback) => rpc('coach_checkin_reply', { p_id: id, p_feedback: feedback }),
    /** The check-ins on a link, newest first. */
    async checkins(linkId, limit = 12) {
      const { data, error } = await client
        .from('coach_checkins')
        .select('id, week, kind, title, answers, figures, feedback, created_at, feedback_at')
        .eq('link_id', linkId)
        .order('week', { ascending: false })
        .limit(limit);
      if (error) fail(error);
      return data;
    },
    /** Coach: every form answer from every client, newest first (for the inbox). */
    async inbox(limit = 200) {
      const { data, error } = await client
        .from('coach_checkins')
        .select('id, link_id, week, kind, title, answers, figures, feedback, created_at, feedback_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) fail(error);
      return data;
    },
    /* ----- weekly summaries ----- */
    /** Client: write a week's summary (already cut to what is shared). */
    weekPut: (week, data) => rpc('coach_week_put', { p_week: week, p_data: data }),
    /** The weekly summaries on a link, oldest first. */
    async weeks(linkId, limit = 60) {
      const { data, error } = await client
        .from('coach_weeks')
        .select('week, data')
        .eq('link_id', linkId)
        .order('week', { ascending: false })
        .limit(limit);
      if (error) fail(error);
      return data.reverse();
    },
    /* ----- a coach's page and applications ----- */
    /** The coach's own page, or null. */
    async myPage() {
      const { data, error } = await client.from('coach_pages').select('*').eq('coach_id', userId).maybeSingle();
      if (error) fail(error);
      return data;
    },
    /** Create or change the coach's own page. Rejects with code 'taken' when the address is in use. */
    async savePage(page) {
      const row = {
        coach_id: userId,
        slug: String(page.slug || '').toLowerCase(),
        name: page.name,
        about: page.about || '',
        offers: page.offers || '',
        open: page.open !== false,
        brand: page.brand || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await client.from('coach_pages').upsert(row, { onConflict: 'coach_id' });
      if (error)
        throw {
          code: error.code === '23505' ? 'taken' : error.code === '23514' ? 'bad_page' : 'failed',
          message: error.message,
        };
    },
    /** A coach's page by its address: { slug, name, about, offers, open, own, applied } or null. */
    page: slug => rpc('coach_page', { p_slug: slug }),
    apply: (slug, name, note) => rpc('coach_apply', { p_slug: slug, p_name: name, p_note: note || '' }),
    /** Applications: those sent to this coach (`inbox`) and those this person has made (`mine`). */
    async applications() {
      const { data, error } = await client
        .from('coach_applications')
        .select('id, coach_id, user_id, name, note, status, code, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) fail(error);
      return { inbox: data.filter(a => a.coach_id === userId), mine: data.filter(a => a.user_id === userId) };
    },
    answerApplication: (id, accept) => rpc('coach_application_answer', { p_id: id, p_accept: !!accept }),
  };
}

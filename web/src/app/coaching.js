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
      ...(on.weight ? { ...pick(p, ['kg', 'goalKg', 'sex', 'age', 'cm', 'act']), wts: (p.wts || []).slice(-120) } : {}),
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

const REASONS = [
  'not_found',
  'own_invite',
  'already_coached',
  'too_many_clients',
  'no_coach',
  'too_large',
  'not_allowed',
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
    async invite(coachName, clientName) {
      const out = await rpc('coach_invite', { p_coach_name: coachName, p_client_name: clientName || '' });
      return Array.isArray(out) ? out[0] : out;
    },
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
    async send(linkId, body) {
      const { error } = await client.from('coach_messages').insert({ link_id: linkId, body });
      if (error) fail(error);
    },
  };
}

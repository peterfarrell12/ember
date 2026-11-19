// The `ai` server function: the only way the app reaches Claude.
//
// A signed-in person asks for one named task (../_shared/ai-tasks.js) and gives its values and photos.
// The function builds the prompt itself, checks the day's spending ceiling, calls Claude, records what the
// call cost, and returns the text (streamed for the tasks that stream). It never accepts a prompt.
//
// Everything it needs from outside is passed in, so it runs unchanged in the tests with stand-ins:
//   whoIs(token)            -> { id } for a valid session, or null
//   spentToday(day)         -> US dollars everyone has spent that day
//   record(userId, day, u)  -> stores { input, output, searches, cost } for that call
//   claude                  -> an Anthropic SDK client
import { TASKS } from '../_shared/ai-tasks.js';

/** Which model runs each tier, and its price in US dollars per million tokens. */
export const MODELS = {
  quick: { id: 'claude-haiku-5-5', input: 0.1, output: 0.5 },
  default: { id: 'claude-sonnet-5-5', input: 2, output: 10 },
};
const PRICES = Object.fromEntries(Object.values(MODELS).map(m => [m.id, m]));

/** The most everyone together may spend in one day (UTC), in US dollars. The owner's decision. */
export const DAILY_CEILING_USD = 10;

const MAX_VALUE_CHARS = 60000; // the longest single value a task takes (a fortnight of wearable data)
const MAX_TOTAL_CHARS = 120000;
const MAX_IMAGE_BASE64 = 3_000_000; // about 2.2 MB; the app resizes photos to well under this
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_OUTPUT_TOKENS = 8000;

/** What a call cost, from the token counts Claude reports. */
export function costOf(model, usage) {
  const p = PRICES[model] || MODELS.default;
  const input =
    (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  const output = usage.output_tokens || 0;
  return { input, output, searches: 0, cost: (input * p.input + output * p.output) / 1e6 };
}

const fail = (status, code, message) => ({ status, body: { error: { code, message } } });

/* ----- product lookup on the web ----- */
export const SEARCH_PRICE_USD = 0.01; // per web search, on top of tokens
export const SEARCHES_PER_PERSON_PER_DAY = 20;
const RECHECK_MISS_DAYS = 30; // a product that was not found is searched for again after this long
const productKey = (brand, name) => (brand + '|' + name).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
const host = u => {
  try {
    const h = new URL(u);
    return /^https?:$/.test(h.protocol) ? h.hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
};
const numOrNull = x => (typeof x === 'number' && isFinite(x) && x >= 0 ? x : null);

/**
 * Decide whether a web lookup's answer can be trusted, and tidy it. Returns the product or null.
 * The figures must be plausible per 100 g, and the page they are said to come from must be one the
 * search actually returned, so a made-up address is never shown to anyone as a source.
 * @param {any} ans the model's parsed reply
 * @param {string[]} seenUrls the addresses in the search results
 */
export function checkProduct(ans, seenUrls) {
  if (!ans || ans.found !== true) return null;
  const k = numOrNull(ans.kcal),
    p = numOrNull(ans.p),
    c = numOrNull(ans.c),
    f = numOrNull(ans.f);
  if (k === null || p === null || c === null || f === null) return null;
  if (k > 900 || p > 100 || c > 100 || f > 100 || p + c + f > 105) return null;
  // macros cannot account for much more energy than the label states (less is fine: alcohol, fibre)
  if (4 * p + 4 * c + 9 * f > k * 1.25 + 25) return null;
  const from = host(ans.url);
  if (!from || !seenUrls.some(u => host(u) === from)) return null;
  return {
    found: true,
    name: String(ans.name || '').slice(0, 80),
    brand: String(ans.brand || '').slice(0, 40),
    kcal: k,
    p,
    c,
    f,
    sf: numOrNull(ans.sf),
    su: numOrNull(ans.su),
    fi: numOrNull(ans.fi),
    salt: numOrNull(ans.salt),
    serving_g: numOrNull(ans.serving_g),
    url: String(ans.url).slice(0, 500),
  };
}
const PRODUCT_FIELDS = ['found', 'name', 'brand', 'kcal', 'p', 'c', 'f', 'sf', 'su', 'fi', 'salt', 'serving_g', 'url'];
const firstJson = text => {
  const a = text.indexOf('{'),
    b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
};

/** Check a request body and turn it into the task and the content to send. Returns { error } or { task, messages }. */
export function readRequest(body) {
  if (!body || typeof body !== 'object') return { error: fail(400, 'bad_request', 'Expected a JSON object.') };
  const task = Object.hasOwn(TASKS, body.task) ? TASKS[body.task] : null;
  // coach tasks are switched off with the coach feature
  if (!task || task.feature) return { error: fail(400, 'bad_request', 'Unknown task.') };
  const given = body.vars && typeof body.vars === 'object' && !Array.isArray(body.vars) ? body.vars : {};
  const vars = {};
  let total = 0;
  for (const name of Object.keys(given)) {
    if (!task.vars.includes(name)) return { error: fail(400, 'bad_request', 'Unexpected value: ' + name) };
  }
  for (const name of task.vars) {
    const v = given[name];
    if (typeof v !== 'string') return { error: fail(400, 'bad_request', 'Missing value: ' + name) };
    if (v.length > MAX_VALUE_CHARS) return { error: fail(413, 'bad_request', 'Value too long: ' + name) };
    total += v.length;
    vars[name] = v;
  }
  if (total > MAX_TOTAL_CHARS) return { error: fail(413, 'bad_request', 'Request too long.') };
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > (task.images || 0)) return { error: fail(400, 'bad_request', 'Too many photos for this task.') };
  for (const im of images) {
    if (
      !im ||
      !IMAGE_TYPES.includes(im.media_type) ||
      typeof im.data !== 'string' ||
      !/^[A-Za-z0-9+/]+=*$/.test(im.data)
    )
      return { error: fail(400, 'image_rejected', 'A photo could not be read.') };
    if (im.data.length > MAX_IMAGE_BASE64) return { error: fail(413, 'image_rejected', 'A photo is too large.') };
  }
  const built = task.build(vars);
  const turns = typeof built === 'string' ? [{ role: 'user', content: built }] : built;
  // photos go before the text of the first turn
  const messages = turns.map((t, i) =>
    i === 0 && images.length
      ? {
          role: t.role,
          content: [
            ...images.map(im => ({
              type: 'image',
              source: { type: 'base64', media_type: im.media_type, data: im.data },
            })),
            { type: 'text', text: t.content },
          ],
        }
      : t,
  );
  return { task, name: body.task, messages };
}

/** Claude's failures, as the codes the app already has wording for. */
function claudeError(e) {
  const status = e && e.status;
  if (status === 429 || status === 529) return fail(429, 'rate_limited', 'Claude is busy.');
  if (status === 400 || status === 413)
    return fail(
      400,
      /image/i.test(String(e && e.message)) ? 'image_rejected' : 'upstream_error',
      'Claude could not take that request.',
    );
  return fail(502, 'upstream_error', 'Claude could not be reached.');
}

/**
 * @param {{ whoIs: Function, spentToday: Function, record: Function, claude: any, now?: () => Date, ceiling?: number }} deps
 * @returns {(req: { token: string, body: any, onText?: (delta: string) => void }) => Promise<{ status: number, body: any }>}
 */
export function createHandler({
  whoIs,
  spentToday,
  record,
  claude,
  products = null,
  searchesToday = async () => 0,
  now = () => new Date(),
  ceiling = DAILY_CEILING_USD,
}) {
  /* Look a product up: from what an earlier search saved if there is one, otherwise with one paid web search. */
  async function lookup(user, req, vars, day) {
    // `why` says why nothing came back (a limit, a failed search, an answer that did not pass the checks);
    // the app ignores it, but it is what makes a failing lookup diagnosable from outside
    const reply = (product, why) => ({
      status: 200,
      body: { text: JSON.stringify(product || { found: false, ...(why ? { why } : {}) }) },
    });
    if (!products) return reply(null, 'off');
    const key = productKey(vars.brand, vars.name);
    const saved = await products.get(key).catch(() => null);
    if (saved && (saved.found || now() - new Date(saved.checked_at) < RECHECK_MISS_DAYS * 864e5))
      return reply(
        saved.found
          ? Object.fromEntries(PRODUCT_FIELDS.map(k => [k, saved[k] ?? (k === 'found' ? true : null)]))
          : null,
      );
    if ((await spentToday(day)) >= ceiling) return reply(null, 'daily_limit');
    if ((await searchesToday(user.id, day)) >= SEARCHES_PER_PERSON_PER_DAY) return reply(null, 'lookup_limit');
    let message;
    try {
      message = await claude.messages
        .stream({
          model: MODELS.quick.id,
          max_tokens: 4000,
          output_config: { effort: 'low' },
          messages: req.messages,
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search',
              max_uses: 2,
              // no country here: the API rejects 'IE' ("Country code IE is not supported"), and the
              // prompt already asks for products sold in Ireland or the UK
              user_location: { type: 'approximate', timezone: 'Europe/Dublin' },
            },
          ],
        })
        .finalMessage();
    } catch (e) {
      // a lookup that fails just leaves the estimate in place
      return reply(
        null,
        'search_failed: ' + String((e && e.status) || '') + ' ' + String((e && e.message) || e).slice(0, 240),
      );
    }
    const blocks = message.content || [];
    const used = costOf(message.model || MODELS.quick.id, message.usage || {});
    used.searches = ((message.usage || {}).server_tool_use || {}).web_search_requests || 0;
    used.cost += used.searches * SEARCH_PRICE_USD;
    await record(user.id, day, used).catch(() => {});
    const seen = blocks
      .filter(b => b.type === 'web_search_tool_result' && Array.isArray(b.content))
      .flatMap(b => b.content.map(r => r && r.url).filter(Boolean));
    const text = blocks
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');
    const product = message.stop_reason === 'end_turn' ? checkProduct(firstJson(text), seen) : null;
    await products
      .put({ key, found: !!product, ...(product || { name: vars.name, brand: vars.brand }) })
      .catch(() => {});
    return reply(
      product,
      product ? undefined : message.stop_reason === 'end_turn' ? 'not_trusted' : 'stopped: ' + message.stop_reason,
    );
  }
  return async function handle({ token, body, onText }) {
    const user = token ? await whoIs(token) : null;
    if (!user) return fail(401, 'session_expired', 'Sign in again.');
    const req = readRequest(body);
    if (req.error) return req.error;
    const day = now().toISOString().slice(0, 10);
    if (req.task.search) return lookup(user, req, body.vars, day);
    if ((await spentToday(day)) >= ceiling)
      return fail(429, 'daily_limit', 'Today`s allowance is used up. It starts again at midnight UTC.');
    const model = MODELS[req.task.tier] || MODELS.default;
    let message;
    try {
      const params = {
        model: model.id,
        max_tokens: MAX_OUTPUT_TOKENS,
        output_config: { effort: 'low' },
        messages: req.messages,
      };
      // On the mid model, if its safety check declines a request the API retries it on a fallback model
      // within the same call, instead of the person getting a refusal for an ordinary food photo.
      const stream =
        req.task.tier === 'quick'
          ? claude.messages.stream(params)
          : claude.beta.messages.stream({
              ...params,
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default',
            });
      if (onText) stream.on('text', delta => onText(delta));
      message = await stream.finalMessage();
    } catch (e) {
      return claudeError(e);
    }
    const used = costOf(message.model || model.id, message.usage || {});
    await record(user.id, day, used).catch(() => {}); // a failed note of the cost must not lose the answer
    if (message.stop_reason === 'refusal') return fail(422, 'refused', 'Claude could not work with that.');
    const text = (message.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');
    return { status: 200, body: { text, truncated: message.stop_reason === 'max_tokens' } };
  };
}

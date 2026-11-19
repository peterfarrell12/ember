// The `product` server function: look a barcode up when it is in none of the lists shipped with the app.
//
// Order: the products this function has already saved (free and instant), then Open Food Facts, the
// open database the bundled lists were built from. Whatever comes back, found or not, is saved, so
// each barcode costs one outside request for everyone. No Claude involved, so no cost.
//
// Open Food Facts asks apps to identify themselves and to stay under 15 product reads a minute from
// one address; saving every answer is what keeps a busy day inside that.

export const OFF_AGENT = 'Ember/0.1 (https://ember.peterfarrell2712.workers.dev)';
const RECHECK_MISS_DAYS = 7; // a barcode that was not found is asked for again after this long
const FIELDS = 'code,product_name,brands,nutriments,serving_quantity,product_quantity';
const num = x =>
  typeof x === 'number' && isFinite(x) && x >= 0
    ? x
    : typeof x === 'string' && x.trim() !== '' && isFinite(Number(x)) && Number(x) >= 0
      ? Number(x)
      : null;

/** Barcodes are 8 to 14 digits. Anything else is refused before any lookup. */
export const cleanCode = code => {
  const c = String(code || '').replace(/\D/g, '');
  return c.length >= 8 && c.length <= 14 ? c : '';
};

/**
 * Turn an Open Food Facts product into the app's per-100 figures, or null when it lacks the basics
 * (a name and energy, protein, carbohydrate and fat per 100) or the figures cannot be right.
 * The same sanity rule the bundled lists were built with: calories must roughly agree with the macros.
 */
export function fromOpenFoodFacts(p) {
  if (!p || typeof p !== 'object') return null;
  const n = p.nutriments || {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === null && num(n['energy-kj_100g']) !== null) kcal = Math.round(num(n['energy-kj_100g']) / 4.184);
  const pr = num(n.proteins_100g),
    c = num(n.carbohydrates_100g),
    f = num(n.fat_100g);
  const name = String(p.product_name || '').trim();
  if (!name || kcal === null || pr === null || c === null || f === null) return null;
  if (kcal > 900 || pr > 100 || c > 100 || f > 100 || pr + c + f > 105) return null;
  const macros = 4 * pr + 4 * c + 9 * f;
  if (
    macros > kcal * 1.25 + 25 ||
    (kcal > 50 && macros < kcal * 0.5 && !/beer|wine|cider|stout|lager|spirit|vodka|whisk|gin\b/i.test(name))
  )
    return null;
  const serving = num(p.serving_quantity),
    pack = num(p.product_quantity);
  return {
    found: true,
    name: name.slice(0, 80),
    brand: String(p.brands || '')
      .split(',')
      .pop()
      .trim()
      .slice(0, 40),
    kcal,
    p: pr,
    c,
    f,
    sf: num(n['saturated-fat_100g']),
    su: num(n.sugars_100g),
    fi: num(n.fiber_100g),
    salt: num(n.salt_100g),
    serving_g: serving && serving <= 2000 ? serving : null,
    pack_g: pack && pack <= 5000 ? pack : null,
  };
}

const fail = (status, code, message) => ({ status, body: { error: { code, message } } });

/**
 * @param {{ whoIs: Function, products: { byBarcode: Function, put: Function }, fetch: typeof fetch, now?: () => Date }} deps
 */
export function createHandler({ whoIs, products, fetch: send, now = () => new Date() }) {
  return async function handle({ token, body }) {
    const user = token ? await whoIs(token) : null;
    if (!user) return fail(401, 'session_expired', 'Sign in again.');
    const code = cleanCode(body && body.barcode);
    if (!code) return fail(400, 'bad_request', 'Not a barcode.');
    const reply = product => ({
      status: 200,
      body: product ? { ...product, barcode: code } : { found: false, barcode: code },
    });
    const saved = await products.byBarcode(code).catch(() => null);
    if (saved && (saved.found || now() - new Date(saved.checked_at) < RECHECK_MISS_DAYS * 864e5)) {
      const { checked_at, ...product } = saved;
      return reply(saved.found ? product : null);
    }
    let res;
    try {
      res = await send(`https://world.openfoodfacts.org/api/v2/product/${code}?fields=${FIELDS}`, {
        headers: { 'User-Agent': OFF_AGENT, Accept: 'application/json' },
      });
    } catch (e) {
      return fail(502, 'upstream_error', 'The product database could not be reached.');
    }
    // 429 and 5xx mean "not now": say so and save nothing, so it is tried again next time
    if (res.status === 429 || res.status >= 500) return fail(502, 'upstream_error', 'The product database is busy.');
    const data = await res.json().catch(() => null);
    const product = data && data.status === 1 ? fromOpenFoodFacts(data.product) : null;
    await products.put({ barcode: code, found: !!product, ...(product || {}) }).catch(() => {});
    return reply(product);
  };
}

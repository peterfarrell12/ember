// The `recipe` server function: read the recipe on a web page so its ingredients can be brought into the app.
//
// Most recipe sites publish the recipe as structured data for search engines (schema.org Recipe). This
// function fetches the page, reads that, and hands back the name, how many it serves and the list of
// ingredients. Nothing else from the page is returned: not the method, not the pictures, not the page itself.
// The app then matches the ingredients to its own food data in the usual way, with the person checking them.
//
// A function that fetches addresses it is given has to be careful about which addresses:
// - https only, a public DNS name only (no IP addresses, no local or internal names), the standard port;
// - every redirect is checked the same way, and only a few are followed;
// - the page must be HTML, and only the first part of a large page is read;
// - each read counts as one of the person's daily uses, so this cannot be used to fetch pages in bulk.
// No Claude involved here, so no cost.

export const AGENT =
  "Ember/0.1 (https://ember.peterfarrell2712.workers.dev; reads a recipe a person asked for)";
export const MAX_BYTES = 1_500_000;
export const DAILY_USES = 40; // the same allowance Claude calls count against (CALLS_PER_PERSON_PER_DAY in ai/handler.js; a test holds them equal)
const MAX_HOPS = 4;
const NOT_PUBLIC =
  /(^|\.)(localhost|local|internal|intranet|lan|home|corp|arpa|test|example|invalid|onion)$/;

/**
 * The address as a URL if it is one this function is willing to fetch, or null.
 * @param {unknown} raw
 * @param {string} [base] for a redirect's Location, which may be relative
 */
export function publicUrl(raw, base) {
  let text = String(raw == null ? "" : raw).trim();
  if (!text || text.length > 600) return null;
  if (!base && !/^[a-z][a-z0-9+.-]*:/i.test(text)) text = "https://" + text;
  let u;
  try {
    u = new URL(text, base);
  } catch (e) {
    return null;
  }
  if (u.protocol === "http:") u.protocol = "https:";
  const host = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    return null;
  // a name with at least one dot whose last part is letters: this rules out IP addresses in every spelling
  if (
    !/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host) ||
    NOT_PUBLIC.test(host)
  )
    return null;
  u.hash = "";
  return u;
}

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  deg: "°",
  times: "×",
  ndash: "–",
  mdash: "—",
  eacute: "é",
  egrave: "è",
};
/** Plain text from a string that may hold HTML entities and tags. */
export function plain(s, max = 160) {
  return String(s == null ? "" : s)
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16) || 32),
    )
    .replace(/&#(\d{1,7});/g, (_, d) => String.fromCodePoint(+d || 32))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const isRecipe = (node) => {
  const t = node && node["@type"];
  return t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"));
};
/** The first schema.org Recipe anywhere in a piece of structured data. */
function findRecipe(node, depth = 0) {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (isRecipe(node)) return node;
  return (
    findRecipe(node["@graph"], depth + 1) ||
    findRecipe(node.mainEntity, depth + 1)
  );
}
/** How many it serves, from "4", "Serves 4", "4-6 servings", 4 or ["4", "4 servings"]. Null when it does not say. */
export function servingsFrom(y) {
  for (const v of Array.isArray(y) ? y : [y]) {
    const m = String(v == null ? "" : v).match(/\d+(\.\d+)?/);
    if (m && +m[0] >= 1 && +m[0] <= 100) return Math.round(+m[0]);
  }
  return null;
}

/**
 * The recipe on a page: its name, servings and ingredients, or null when the page does not publish one.
 * @param {string} html
 * @returns {{ name: string, servings: number | null, ingredients: string[] } | null}
 */
export function recipeFrom(html) {
  let name = "",
    servings = null,
    list = [];
  const blocks = html.matchAll(
    /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const b of blocks) {
    let data;
    try {
      data = JSON.parse(
        b[1]
          .replace(/^\s*(<!--|\/\/<!\[CDATA\[|<!\[CDATA\[)/, "")
          .replace(/(-->|\/\/\]\]>|\]\]>)\s*$/, ""),
      );
    } catch (e) {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    const ing = r.recipeIngredient || r.ingredients;
    if (!Array.isArray(ing)) continue;
    name = plain(r.name, 80);
    servings = servingsFrom(r.recipeYield);
    list = ing;
    break;
  }
  if (!list.length) {
    // older pages mark the ingredients up in the HTML itself
    list = [
      ...html.matchAll(
        /itemprop\s*=\s*["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]{1,400}?)<\/(?:li|span|p|div)>/gi,
      ),
    ].map((m) => m[1]);
    if (list.length) {
      const t =
        html.match(/itemprop\s*=\s*["']name["'][^>]*>([\s\S]{1,200}?)<\//i) ||
        html.match(/<title[^>]*>([\s\S]{1,200}?)<\/title>/i);
      name = plain(t ? t[1] : "", 80);
      const y = html.match(
        /itemprop\s*=\s*["']recipeYield["'][^>]*>([\s\S]{1,80}?)<\//i,
      );
      servings = servingsFrom(y ? plain(y[1]) : null);
    }
  }
  const ingredients = list
    .map((i) => plain(i))
    .filter(Boolean)
    .slice(0, 60);
  return ingredients.length >= 2 ? { name, servings, ingredients } : null;
}

/** The start of a response as text: at most MAX_BYTES, so a huge page cannot hold the function up. */
async function readStart(res) {
  if (!res.body || !res.body.getReader)
    return (await res.text()).slice(0, MAX_BYTES);
  const reader = res.body.getReader(),
    parts = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  const all = new Uint8Array(Math.min(size, MAX_BYTES));
  let at = 0;
  for (const p of parts) {
    const take = p.subarray(0, all.length - at);
    all.set(take, at);
    at += take.length;
  }
  return new TextDecoder().decode(all);
}

const fail = (status, code, message) => ({
  status,
  body: { error: { code, message } },
});

/**
 * @param {{ whoIs: Function, fetch: typeof fetch, callsToday: Function, record: Function, limit: number, today?: () => string }} deps
 */
export function createHandler({
  whoIs,
  fetch: send,
  callsToday,
  record,
  limit,
  today = () => new Date().toISOString().slice(0, 10),
}) {
  return async function handle({ token, body }) {
    const user = token ? await whoIs(token) : null;
    if (!user) return fail(401, "session_expired", "Sign in again.");
    let url = publicUrl(body && body.url);
    if (!url)
      return fail(
        400,
        "not_a_link",
        "That is not a web address this can read.",
      );
    const day = today();
    if ((await callsToday(user.id, day)) >= limit)
      return fail(429, "personal_limit", "Daily allowance reached.");
    await record(user.id, day); // counted before the page is asked for, whatever comes back
    let res;
    try {
      for (let hop = 0; ; hop++) {
        res = await send(url.href, {
          redirect: "manual",
          headers: {
            "User-Agent": AGENT,
            Accept: "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(9000),
        });
        if (res.status < 300 || res.status >= 400) break;
        const next = publicUrl(res.headers.get("location"), url.href);
        if (res.body) res.body.cancel().catch(() => {});
        if (!next || hop >= MAX_HOPS)
          return fail(502, "page_unreachable", "That page could not be read.");
        url = next;
      }
    } catch (e) {
      return fail(502, "page_unreachable", "That page could not be reached.");
    }
    if (res.status === 401 || res.status === 403 || res.status === 429)
      return fail(
        502,
        "page_refused",
        "That site does not allow its pages to be read this way.",
      );
    if (res.status !== 200)
      return fail(502, "page_unreachable", "That page could not be read.");
    if (!/html/i.test(res.headers.get("content-type") || ""))
      return { status: 200, body: { found: false } };
    const recipe = recipeFrom(await readStart(res).catch(() => ""));
    return {
      status: 200,
      body: recipe
        ? { found: true, ...recipe, site: url.hostname.replace(/^www\./, "") }
        : { found: false },
    };
  };
}

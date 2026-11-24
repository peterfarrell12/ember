// @ts-check
// The app's side of the `recipe` server function: read the recipe on a web page. The server fetches the page
// and returns the recipe's name, how many it serves and its ingredients as text; nothing else.

/**
 * @typedef {{ found: true, name: string, servings: number | null, ingredients: string[], site: string } | { found: false }} RecipeRead
 * @param {{ url: string, key: string, token: () => Promise<string | undefined>, fetch?: typeof fetch }} access
 * @param {string} link the page's address
 * @returns {Promise<RecipeRead>} Rejects with { code } when the page could not be read:
 *   not_a_link, page_unreachable, page_refused, personal_limit, session_expired or unreachable.
 */
export async function readRecipe(access, link) {
  const send = access.fetch || ((...a) => fetch(...a));
  let res, out;
  try {
    const token = await access.token();
    if (!token) throw 0;
    res = await send(access.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, apikey: access.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link }),
    });
    out = await res.json().catch(() => null);
  } catch (e) {
    throw { code: 'unreachable' };
  }
  if (res.ok && out && out.found === true && Array.isArray(out.ingredients)) return out;
  if (res.ok && out && out.found === false) return { found: false };
  throw { code: (out && out.error && out.error.code) || 'unreachable' };
}

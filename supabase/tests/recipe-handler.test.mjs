// Tests for the `recipe` server function (read a recipe from a web page), with stand-ins for the session
// check, the usage count and the web. No network.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createHandler,
  publicUrl,
  recipeFrom,
  servingsFrom,
  plain,
  AGENT,
  MAX_BYTES,
  DAILY_USES,
} from "../functions/recipe/handler.js";
import { CALLS_PER_PERSON_PER_DAY } from "../functions/ai/handler.js";

const page = (ld) => `<!doctype html><html><head><title>Stew</title>
<script type="application/ld+json">${JSON.stringify(ld)}</script></head><body><h1>Stew</h1></body></html>`;
const stew = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Irish stew &amp; dumplings",
  recipeYield: ["6", "6 servings"],
  recipeIngredient: [
    "1 kg lamb neck",
    "3 carrots, <b>chopped</b>",
    "2 onions",
    "&frac12; tsp salt",
    "   ",
  ],
  recipeInstructions: [{ "@type": "HowToStep", text: "Brown the lamb." }],
  image: "https://example.org/stew.jpg",
};
const html = (
  body,
  headers = { "content-type": "text/html; charset=utf-8" },
  status = 200,
) => new Response(body, { status, headers });

function setup({ pages = {}, calls = 0 } = {}) {
  const asked = [],
    recorded = [];
  const handle = createHandler({
    whoIs: async (t) => (t === "good" ? { id: "u1" } : null),
    callsToday: async () => calls,
    record: async (id, day) => recorded.push([id, day]),
    limit: DAILY_USES,
    today: () => "2026-11-24",
    fetch: async (url, init) => {
      asked.push([url, init]);
      const p = pages[url];
      if (!p) throw new Error("no route to host");
      return typeof p === "function" ? p() : p;
    },
  });
  return { handle, asked, recorded };
}

test("the allowance is the same one Claude calls count against", () => {
  assert.equal(DAILY_USES, CALLS_PER_PERSON_PER_DAY);
});

test("addresses: public https names only", () => {
  const ok = (u) => publicUrl(u) && publicUrl(u).href;
  assert.equal(
    ok("https://www.bbcgoodfood.com/recipes/irish-stew"),
    "https://www.bbcgoodfood.com/recipes/irish-stew",
  );
  assert.equal(
    ok("bbcgoodfood.com/recipes/irish-stew#method"),
    "https://bbcgoodfood.com/recipes/irish-stew",
  );
  assert.equal(
    ok("http://example-recipes.ie/a?b=1"),
    "https://example-recipes.ie/a?b=1",
  );
  for (const bad of [
    "",
    "not a link",
    "ftp://example.com/x",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://2130706433/x",
    "https://0x7f.0.0.1/x",
    "https://[::1]/x",
    "https://[fd00::1]/x",
    "https://169.254.169.254/latest/meta-data",
    "https://intranet/x",
    "https://db.internal/x",
    "https://printer.local/x",
    "https://user:pw@example.com/x",
    "https://example.com:8443/x",
    "https://example.com./x",
    "https://" + "a".repeat(700) + ".com",
  ])
    assert.equal(publicUrl(bad), null, bad);
  assert.equal(
    publicUrl("/login", "https://example.com/a").href,
    "https://example.com/login",
  );
  assert.equal(publicUrl("https://10.0.0.5/", "https://example.com/a"), null);
});

test("reading a page: name, servings and ingredients as plain text, and nothing else", () => {
  assert.deepEqual(recipeFrom(page(stew)), {
    name: "Irish stew & dumplings",
    servings: 6,
    ingredients: [
      "1 kg lamb neck",
      "3 carrots, chopped",
      "2 onions",
      "½ tsp salt",
    ],
  });
});

test("reading a page: a recipe inside @graph, among other blocks, with a type list and a broken block before it", () => {
  const h =
    '<script type="application/ld+json">{ broken</script>' +
    `<script type='application/ld+json'>${JSON.stringify({ "@type": "WebSite", name: "Site" })}</script>` +
    `<script data-x="1" type="application/ld+json">${JSON.stringify({
      "@graph": [
        { "@type": "Article", name: "Post" },
        {
          "@type": ["Recipe", "NewsArticle"],
          name: "Soda bread",
          recipeYield: "Makes 1 loaf",
          recipeIngredient: ["450 g flour", "400 ml buttermilk"],
        },
      ],
    })}</script>`;
  assert.deepEqual(recipeFrom(h), {
    name: "Soda bread",
    servings: 1,
    ingredients: ["450 g flour", "400 ml buttermilk"],
  });
});

test("reading a page: older HTML markup is read when there is no structured block; a page with no recipe gives null", () => {
  const h = `<h1 itemprop="name">Colcannon</h1><span itemprop="recipeYield">Serves 4</span>
    <ul><li itemprop="recipeIngredient">1 kg potatoes</li><li itemprop="recipeIngredient">250 g <a href="/kale">kale</a></li></ul>`;
  assert.deepEqual(recipeFrom(h), {
    name: "Colcannon",
    servings: 4,
    ingredients: ["1 kg potatoes", "250 g kale"],
  });
  assert.equal(recipeFrom("<html><body><p>Hello</p></body></html>"), null);
  assert.equal(
    recipeFrom(
      page({
        "@type": "Recipe",
        name: "One thing",
        recipeIngredient: ["salt"],
      }),
    ),
    null,
  );
});

test("servings and text", () => {
  assert.equal(servingsFrom("4-6 servings"), 4);
  assert.equal(servingsFrom(8), 8);
  assert.equal(servingsFrom("a crowd"), null);
  assert.equal(servingsFrom(undefined), null);
  assert.equal(
    plain("  2&nbsp;tbsp <i>olive</i>\n oil &#8211; extra &#x27;virgin&#x27; "),
    "2 tbsp olive oil – extra 'virgin'",
  );
  assert.equal(plain("x".repeat(500)).length, 160);
});

test("not signed in, not a link, or over the allowance: refused before any page is asked for", async () => {
  const a = setup();
  assert.equal(
    (await a.handle({ token: "", body: { url: "https://example.org/r" } }))
      .status,
    401,
  );
  assert.equal(
    (await a.handle({ token: "bad", body: { url: "https://example.org/r" } }))
      .status,
    401,
  );
  assert.equal(
    (await a.handle({ token: "good", body: { url: "https://192.168.1.1/" } }))
      .body.error.code,
    "not_a_link",
  );
  assert.equal(
    (await a.handle({ token: "good", body: null })).body.error.code,
    "not_a_link",
  );
  const b = setup({ calls: DAILY_USES });
  const over = await b.handle({
    token: "good",
    body: { url: "https://example.org/r" },
  });
  assert.equal(over.status, 429);
  assert.equal(over.body.error.code, "personal_limit");
  assert.deepEqual(
    [a.asked, b.asked, a.recorded, b.recorded],
    [[], [], [], []],
  );
});

test("a recipe page: fetched as Ember, without following redirects blindly; the answer names the site; the read is counted", async () => {
  const s = setup({
    pages: { "https://www.example.org/stew": html(page(stew)) },
  });
  const out = await s.handle({
    token: "good",
    body: { url: "www.example.org/stew" },
  });
  assert.deepEqual(out, {
    status: 200,
    body: {
      found: true,
      name: "Irish stew & dumplings",
      servings: 6,
      ingredients: [
        "1 kg lamb neck",
        "3 carrots, chopped",
        "2 onions",
        "½ tsp salt",
      ],
      site: "example.org",
    },
  });
  assert.equal(s.asked[0][1].redirect, "manual");
  assert.equal(s.asked[0][1].headers["User-Agent"], AGENT);
  assert.deepEqual(s.recorded, [["u1", "2026-11-24"]]);
});

test("redirects: followed to public addresses, refused to private ones, and not for ever", async () => {
  const to = (loc) => () =>
    new Response(null, { status: 301, headers: { location: loc } });
  const s = setup({
    pages: {
      "https://example.org/old": to("/new"),
      "https://example.org/new": to("https://www.example.org/stew"),
      "https://www.example.org/stew": html(page(stew)),
      "https://example.org/inside": to(
        "http://169.254.169.254/latest/meta-data/",
      ),
      "https://example.org/loop": to("https://example.org/loop"),
    },
  });
  const ok = await s.handle({
    token: "good",
    body: { url: "https://example.org/old" },
  });
  assert.equal(ok.body.found, true);
  assert.equal(ok.body.site, "example.org");
  const inside = await s.handle({
    token: "good",
    body: { url: "https://example.org/inside" },
  });
  assert.equal(inside.body.error.code, "page_unreachable");
  assert.equal(
    s.asked.filter((a) => /169\.254/.test(a[0])).length,
    0,
    "the private address was never asked for",
  );
  const before = s.asked.length;
  const loop = await s.handle({
    token: "good",
    body: { url: "https://example.org/loop" },
  });
  assert.equal(loop.body.error.code, "page_unreachable");
  assert.ok(s.asked.length - before <= 5);
});

test("pages that cannot be used: unreachable, refused, missing, not HTML, no recipe, too large", async () => {
  const big = "<p>" + "x".repeat(MAX_BYTES) + "</p>" + page(stew);
  const s = setup({
    pages: {
      "https://example.org/403": html("no", undefined, 403),
      "https://example.org/404": html("no", undefined, 404),
      "https://example.org/pdf": html("%PDF", {
        "content-type": "application/pdf",
      }),
      "https://example.org/blog": html(
        "<html><body>Just a story</body></html>",
      ),
      "https://example.org/big": html(big),
    },
  });
  const ask = async (path) =>
    (
      await s.handle({
        token: "good",
        body: { url: "https://example.org/" + path },
      })
    ).body;
  assert.equal((await ask("down")).error.code, "page_unreachable");
  assert.equal((await ask("403")).error.code, "page_refused");
  assert.equal((await ask("404")).error.code, "page_unreachable");
  assert.deepEqual(await ask("pdf"), { found: false });
  assert.deepEqual(await ask("blog"), { found: false });
  assert.deepEqual(
    await ask("big"),
    { found: false },
    "only the start of a very large page is read",
  );
  assert.equal(s.recorded.length, 6, "every read is counted, found or not");
});

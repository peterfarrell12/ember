// The app's side of reading a recipe from a link.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readRecipe } from '../src/app/recipe-server.js';

const access = reply => {
  const sent = [];
  return {
    sent,
    url: 'https://x.supabase.co/functions/v1/recipe',
    key: 'public-key',
    token: async () => 'session-token',
    fetch: async (url, init) => {
      sent.push([url, init]);
      return reply();
    },
  };
};
const json = (status, body) => new Response(JSON.stringify(body), { status });

test('sends the link with the session, and returns the recipe', async () => {
  const recipe = {
    found: true,
    name: 'Stew',
    servings: 6,
    ingredients: ['1 kg lamb', '3 carrots'],
    site: 'example.org',
  };
  const a = access(() => json(200, recipe));
  assert.deepEqual(await readRecipe(a, 'example.org/stew'), recipe);
  assert.equal(a.sent[0][0], a.url);
  assert.equal(a.sent[0][1].headers.Authorization, 'Bearer session-token');
  assert.equal(a.sent[0][1].headers.apikey, 'public-key');
  assert.deepEqual(JSON.parse(a.sent[0][1].body), { url: 'example.org/stew' });
});

test('a page with no recipe is an answer, not an error', async () => {
  assert.deepEqual(
    await readRecipe(
      access(() => json(200, { found: false })),
      'example.org/blog',
    ),
    { found: false },
  );
});

test("the server's reason is passed on; anything else is 'unreachable'", async () => {
  const why = async reply =>
    readRecipe(access(reply), 'example.org').then(
      () => 'no error',
      e => e.code,
    );
  assert.equal(await why(() => json(429, { error: { code: 'personal_limit' } })), 'personal_limit');
  assert.equal(await why(() => json(502, { error: { code: 'page_refused' } })), 'page_refused');
  assert.equal(await why(() => json(400, { error: { code: 'not_a_link' } })), 'not_a_link');
  assert.equal(await why(() => new Response('<html>gateway</html>', { status: 502 })), 'unreachable');
  assert.equal(await why(() => json(200, { found: true })), 'unreachable');
  assert.equal(
    await why(() => {
      throw new Error('offline');
    }),
    'unreachable',
  );
  const signedOut = { ...access(() => json(200, {})), token: async () => undefined };
  assert.equal(
    await readRecipe(signedOut, 'example.org').then(
      () => 'no error',
      e => e.code,
    ),
    'unreachable',
  );
});

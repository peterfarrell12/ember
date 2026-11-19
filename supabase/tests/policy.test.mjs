// Proves that one account cannot read or write another account's rows.
// Runs against the LOCAL Supabase only (npm run start in this folder); it creates and deletes test users,
// so it refuses to run against anything that is not on this machine.
//   cd supabase && npm run start && npm test
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { supabaseBackend } from '../../web/src/app/backend-supabase.js';

const env = Object.fromEntries(
  execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' })
    .split('\n')
    .map(l => l.match(/^(\w+)="?(.*?)"?$/))
    .filter(Boolean)
    .map(m => [m[1], m[2]]),
);
const url = env.API_URL;
assert.match(url || '', /^http:\/\/(127\.0\.0\.1|localhost):/, 'policy test only runs against a local Supabase');

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, env.SERVICE_ROLE_KEY, opts);
const results = [];
const check = async (name, run) => {
  try {
    await run();
    results.push(['ok  ', name]);
  } catch (e) {
    results.push(['FAIL', name + '\n      ' + String(e && e.message).split('\n')[0]]);
  }
};

async function person(tag) {
  const email = `policy-${tag}-${Date.now()}@example.test`;
  const password = 'pw-' + Math.random().toString(36).slice(2) + '-Aa1';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient(url, env.ANON_KEY, opts);
  const s = await client.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { id: data.user.id, client, store: supabaseBackend(client, data.user.id) };
}

const a = await person('a');
const b = await person('b');
const visitor = createClient(url, env.ANON_KEY, opts);

try {
  await a.store.set('profile', undefined, { name: 'A', kg: 86 });
  await a.store.set('days', '2026-11-19', { date: '2026-11-19', e: [{ n: 'Porridge', k: 300 }] });

  await check('the owner reads back their own documents', async () => {
    assert.deepEqual(await a.store.get('profile'), { name: 'A', kg: 86 });
    assert.equal((await a.store.list('days')).length, 1);
  });
  await check('a second account reads nothing through the app`s own calls', async () => {
    assert.equal(await b.store.get('profile'), null);
    assert.equal(await b.store.get('days', '2026-11-19'), null);
    assert.deepEqual(await b.store.list('days'), []);
  });
  await check('a second account sees no rows even when it asks for the whole table', async () => {
    const { data, error } = await b.client.from('user_docs').select('user_id, kind, id');
    assert.equal(error, null);
    assert.deepEqual(data, []);
  });
  await check('a second account sees no rows when it asks for the first account by id', async () => {
    const { data } = await b.client.from('user_docs').select('*').eq('user_id', a.id);
    assert.deepEqual(data, []);
  });
  await check('a second account cannot write a row in the first account`s name', async () => {
    const { error } = await b.client
      .from('user_docs')
      .insert({ user_id: a.id, kind: 'days', id: '2026-11-20', data: { hacked: true } });
    assert.ok(error, 'the insert should be refused');
    const { error: e2 } = await b.client
      .from('user_docs')
      .upsert({ user_id: a.id, kind: 'profile', id: '', data: { hacked: true } }, { onConflict: 'user_id,kind,id' });
    assert.ok(e2, 'the upsert should be refused');
  });
  await check('a second account cannot change or delete the first account`s rows', async () => {
    await b.client
      .from('user_docs')
      .update({ data: { hacked: true } })
      .eq('user_id', a.id);
    await b.client.from('user_docs').delete().eq('user_id', a.id);
    await b.client.from('user_docs').update({ user_id: b.id }).eq('user_id', a.id);
    assert.deepEqual(await a.store.get('profile'), { name: 'A', kg: 86 });
    assert.equal((await a.store.list('days')).length, 1);
  });
  await check('a second account cannot hand one of its own rows to the first account', async () => {
    await b.store.set('foods', 'mine', { n: 'B food' });
    const { error } = await b.client.from('user_docs').update({ user_id: a.id }).eq('kind', 'foods').eq('id', 'mine');
    assert.ok(error, 'the move should be refused');
    assert.deepEqual(await a.store.list('foods'), []);
  });
  await check('a visitor who is not signed in can read and write nothing', async () => {
    const r = await visitor.from('user_docs').select('*');
    assert.ok(r.error || r.data.length === 0);
    const w = await visitor.from('user_docs').insert({ user_id: a.id, kind: 'days', id: 'x', data: {} });
    assert.ok(w.error, 'the insert should be refused');
  });
  await check('the database, not the client, sets updated_at', async () => {
    await a.client
      .from('user_docs')
      .upsert({ user_id: a.id, kind: 'meta', id: 't', data: {}, updated_at: '2001-01-01T00:00:00Z' });
    const { data } = await a.client.from('user_docs').select('updated_at').eq('kind', 'meta').eq('id', 't').single();
    assert.ok(new Date(data.updated_at).getFullYear() > 2001);
  });
  // Claude usage: written only by the server, readable only by its owner
  const day = new Date().toISOString().slice(0, 10);
  await check('only the server can record Claude usage; a person can read their own and nobody else`s', async () => {
    const rec = { p_user: a.id, p_day: day, p_input: 1000, p_output: 200, p_searches: 0, p_cost: 0.004 };
    assert.equal((await admin.rpc('record_ai_usage', rec)).error, null);
    assert.equal((await admin.rpc('record_ai_usage', rec)).error, null);
    const mine = await a.client.from('ai_usage').select('calls, input_tokens, cost_usd');
    assert.deepEqual(mine.data, [{ calls: 2, input_tokens: 2000, cost_usd: 0.008 }]);
    assert.deepEqual((await b.client.from('ai_usage').select('*')).data, []);
    assert.equal(Number((await admin.rpc('ai_spend_on', { p_day: day })).data), 0.008);
  });
  await check('nobody can lower or invent their own usage, or see the total spent', async () => {
    assert.ok(
      (
        await a.client.rpc('record_ai_usage', {
          p_user: a.id,
          p_day: day,
          p_input: 0,
          p_output: 0,
          p_searches: 0,
          p_cost: -1,
        })
      ).error,
    );
    assert.ok((await a.client.from('ai_usage').update({ cost_usd: 0 }).eq('user_id', a.id)).error);
    assert.ok((await a.client.from('ai_usage').delete().eq('user_id', a.id)).error);
    assert.ok((await a.client.from('ai_usage').insert({ user_id: a.id, day: '2020-01-01' })).error);
    assert.ok((await a.client.rpc('ai_spend_on', { p_day: day })).error);
    assert.ok((await visitor.rpc('ai_spend_on', { p_day: day })).error);
    assert.equal((await a.client.from('ai_usage').select('calls')).data[0].calls, 2);
  });
  // progress photos: private storage, one folder per person
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
  const path = a.id + '/policy.jpg';
  await check('the owner can store, list and sign a link to their own photo', async () => {
    assert.equal((await a.client.storage.from('photos').upload(path, jpeg, { contentType: 'image/jpeg' })).error, null);
    assert.equal((await a.client.storage.from('photos').list(a.id)).data.length, 1);
    assert.ok((await a.client.storage.from('photos').createSignedUrl(path, 60)).data.signedUrl);
  });
  await check(
    'a second account cannot list, download, link to, replace or remove the first account`s photo',
    async () => {
      const st = b.client.storage.from('photos');
      assert.deepEqual((await st.list(a.id)).data, []);
      assert.ok((await st.download(path)).error, 'download refused');
      assert.ok((await st.createSignedUrl(path, 60)).error, 'signed link refused');
      assert.ok((await st.upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })).error, 'replace refused');
      assert.ok(
        (await st.upload(a.id + '/planted.jpg', jpeg, { contentType: 'image/jpeg' })).error,
        'adding to the folder refused',
      );
      await st.remove([path]);
      assert.equal((await a.client.storage.from('photos').list(a.id)).data.length, 1, 'still there');
    },
  );
  await check('a photo is not reachable by anyone without a signed link', async () => {
    assert.notEqual((await fetch(`${url}/storage/v1/object/public/photos/${path}`)).status, 200);
    assert.ok((await visitor.storage.from('photos').download(path)).error);
    assert.ok((await visitor.storage.from('photos').upload('x/y.jpg', jpeg, { contentType: 'image/jpeg' })).error);
  });
  await check('one account cannot delete another: the delete function only ever removes the caller', async () => {
    assert.ok((await visitor.rpc('delete_my_account')).error, 'a visitor is refused');
    const refused = await a.client.rpc('delete_my_account');
    assert.ok(
      refused.error && /photos must be removed first/.test(refused.error.message),
      'refused while photos remain',
    );
    await a.client.storage.from('photos').remove([path]);
    await b.store.set('profile', undefined, { name: 'B' });
    assert.equal((await b.client.rpc('delete_my_account')).error, null);
    assert.ok((await admin.auth.admin.getUserById(b.id)).error, 'B is gone');
    assert.equal((await admin.from('user_docs').select('kind').eq('user_id', b.id)).data.length, 0, 'with B`s rows');
    assert.deepEqual(await a.store.get('profile'), { name: 'A', kg: 86 }, 'A is untouched');
  });
  await check('deleting an account removes its rows', async () => {
    const { error } = await admin.auth.admin.deleteUser(a.id);
    assert.equal(error, null);
    const { data } = await admin.from('user_docs').select('kind').eq('user_id', a.id);
    assert.deepEqual(data, []);
  });
} finally {
  await admin.auth.admin.deleteUser(a.id).catch(() => {});
  await admin.auth.admin.deleteUser(b.id).catch(() => {});
}

for (const [s, n] of results) console.log(s, n);
const failed = results.filter(r => r[0] === 'FAIL').length;
console.log(failed ? `${failed} of ${results.length} checks failed` : `all ${results.length} checks passed`);
process.exit(failed ? 1 : 0);

// Unit tests for the Supabase Store backend, against a stand-in client. No network.
//   node --test web/test
import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseBackend, storeError } from '../src/app/backend-supabase.js';

/** A tiny in-memory user_docs that understands the handful of query-builder calls the backend makes. */
function fakeClient({ fail } = {}) {
  const rows = [];
  const calls = [];
  const from = table => {
    assert.equal(table, 'user_docs');
    const q = { op: 'select', filters: {}, cols: '', row: null, single: false, max: Infinity };
    const run = async () => {
      calls.push({ op: q.op, ...q.filters });
      if (fail) return fail(q);
      const match = r => Object.entries(q.filters).every(([k, v]) => r[k] === v);
      if (q.op === 'upsert') {
        const i = rows.findIndex(r => r.user_id === q.row.user_id && r.kind === q.row.kind && r.id === q.row.id);
        if (i >= 0) rows[i] = q.row;
        else rows.push(q.row);
        return { data: null, error: null };
      }
      if (q.op === 'delete') {
        for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i])) rows.splice(i, 1);
        return { data: null, error: null };
      }
      const found = rows.filter(match).slice(0, q.max);
      return { data: q.single ? found[0] || null : found, error: null };
    };
    const b = {
      select: cols => ((q.cols = cols), b),
      upsert: row => ((q.op = 'upsert'), (q.row = structuredClone(row)), b),
      delete: () => ((q.op = 'delete'), b),
      eq: (k, v) => ((q.filters[k] = v), b),
      limit: n => ((q.max = n), b),
      maybeSingle: () => ((q.single = true), b),
      then: (ok, bad) => run().then(ok, bad),
    };
    return b;
  };
  return { from, rows, calls };
}

test('a document round-trips, and the profile uses the empty id', async () => {
  const c = fakeClient();
  const b = supabaseBackend(c, 'u1');
  assert.equal(await b.get('profile'), null);
  await b.set('profile', undefined, { xp: 10 });
  assert.deepEqual(c.rows[0], { user_id: 'u1', kind: 'profile', id: '', data: { xp: 10 } });
  assert.deepEqual(await b.get('profile'), { xp: 10 });
});

test('set replaces the same document rather than adding another', async () => {
  const c = fakeClient();
  const b = supabaseBackend(c, 'u1');
  await b.set('days', '2026-11-19', { w: 500 });
  await b.set('days', '2026-11-19', { w: 750 });
  assert.equal(c.rows.length, 1);
  assert.deepEqual(await b.get('days', '2026-11-19'), { w: 750 });
});

test('list returns only that kind, each with its id', async () => {
  const c = fakeClient();
  const b = supabaseBackend(c, 'u1');
  await b.set('foods', 'a', { n: 'Soda bread' });
  await b.set('foods', 'b', { n: 'Brown sauce' });
  await b.set('recipes', 'r', { n: 'Stew' });
  assert.deepEqual(
    (await b.list('foods')).sort((x, y) => x.id.localeCompare(y.id)),
    [
      { n: 'Soda bread', id: 'a' },
      { n: 'Brown sauce', id: 'b' },
    ],
  );
});

test('remove deletes one document and is harmless when it is already gone', async () => {
  const c = fakeClient();
  const b = supabaseBackend(c, 'u1');
  await b.set('foods', 'a', { n: 'Soda bread' });
  await b.remove('foods', 'a');
  await b.remove('foods', 'a');
  assert.equal(await b.get('foods', 'a'), null);
});

test('nothing filters by user in the query: that is the database policy`s job', async () => {
  const c = fakeClient();
  const b = supabaseBackend(c, 'u1');
  await b.get('days', '2026-11-19');
  assert.deepEqual(c.calls[0], { op: 'select', kind: 'days', id: '2026-11-19' });
});

test('a dropped connection is reported as "unavailable" so Store retries', async () => {
  const thrown = supabaseBackend(fakeClient({ fail: () => Promise.reject(new TypeError('Failed to fetch')) }), 'u1');
  await assert.rejects(thrown.set('days', 'd', {}), e => e.code === 'unavailable');
  const busy = supabaseBackend(
    fakeClient({ fail: async () => ({ data: null, error: { message: 'busy', status: 503 } }) }),
    'u1',
  );
  await assert.rejects(busy.get('days', 'd'), e => e.code === 'unavailable');
});

test('a refusal is final, not retried', async () => {
  const denied = supabaseBackend(
    fakeClient({
      fail: async () => ({ data: null, error: { message: 'new row violates row-level security policy', status: 403 } }),
    }),
    'u1',
  );
  await assert.rejects(denied.set('days', 'd', {}), e => e.code === 'failed' && e.status === 403);
  assert.equal(storeError({ status: 401, message: 'JWT expired' }).code, 'failed');
  assert.equal(storeError({ status: 400, message: 'bad request' }).code, 'failed');
});

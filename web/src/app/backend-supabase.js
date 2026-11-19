// @ts-check
// Store backend for a signed-in person: their documents are rows of the user_docs table
// (supabase/migrations). Row-level security means a session can only ever touch its own rows, so
// nothing here filters by user: the database does.
//
// The client is passed in, so the tests can hand over a stand-in and nothing here needs the network.

/**
 * Supabase and network failures, reduced to the codes Store understands.
 * 'unavailable' means "try again later" (offline, timeout, server busy); anything else is final.
 * @param {any} error what supabase-js returned or threw
 */
export function storeError(error) {
  const status = Number(error && error.status) || 0;
  const text = String((error && (error.message || error.code)) || error || '');
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const retry =
    offline ||
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    /fetch|network|timeout|abort/i.test(text);
  return { code: retry && status !== 401 && status !== 403 ? 'unavailable' : 'failed', status, message: text };
}

/**
 * @param {{ from: (table: string) => any }} client a supabase-js client with a signed-in session
 * @param {string} userId the signed-in person's id
 */
export function supabaseBackend(client, userId) {
  const docs = () => client.from('user_docs');
  const done = ({ data, error }) => {
    if (error) throw storeError(error);
    return data;
  };
  const guard = async run => {
    try {
      return done(await run());
    } catch (e) {
      throw e && e.code && 'status' in e ? e : storeError(e);
    }
  };
  return {
    /** Read one document, or null when there is none. */
    async get(kind, id) {
      const row = await guard(() =>
        docs()
          .select('data')
          .eq('kind', kind)
          .eq('id', id || '')
          .maybeSingle(),
      );
      return row ? row.data : null;
    },
    /** Read every document of a kind (at most 500), each with its id. */
    async list(kind) {
      const rows = await guard(() => docs().select('id, data').eq('kind', kind).limit(500));
      return (rows || []).map(r => ({ ...r.data, id: r.id }));
    },
    /** Create or replace a document. */
    async set(kind, id, data) {
      await guard(() =>
        docs().upsert({ user_id: userId, kind, id: id || '', data }, { onConflict: 'user_id,kind,id' }),
      );
    },
    /** Delete a document. Deleting one that is not there is not an error. */
    async remove(kind, id) {
      await guard(() =>
        docs()
          .delete()
          .eq('kind', kind)
          .eq('id', id || ''),
      );
    },
  };
}

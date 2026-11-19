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

/**
 * Progress photo files for a signed-in person: a private bucket, one folder per person, shown through
 * short-lived signed links. Policies in supabase/migrations keep each person to their own folder.
 * @param {{ storage: { from: (bucket: string) => any } }} client
 * @param {string} userId
 */
export function supabasePhotos(client, userId) {
  const bucket = () => client.storage.from('photos');
  const done = ({ data, error }) => {
    if (error) throw storeError(error);
    return data;
  };
  return {
    /** Store a JPEG. Returns { id }, where id is the file's path, kept on the photo's record. */
    async upload(blob) {
      const id = userId + '/' + crypto.randomUUID() + '.jpg';
      done(await bucket().upload(id, blob, { contentType: 'image/jpeg', upsert: false }));
      return { id };
    },
    async delete(id) {
      done(await bucket().remove([id]));
    },
    /** Signed links for a list of files, as { path: link }. Links last six hours. */
    async urls(ids) {
      if (!ids.length) return {};
      const rows = done(await bucket().createSignedUrls(ids, 6 * 3600)) || [];
      return Object.fromEntries(rows.filter(r => r.signedUrl).map(r => [r.path, r.signedUrl]));
    },
    /** Remove every file the person has. Used when they delete their account. */
    async removeAll() {
      for (;;) {
        const files = done(await bucket().list(userId, { limit: 100 })) || [];
        if (!files.length) return;
        done(await bucket().remove(files.map(f => userId + '/' + f.name)));
      }
    },
  };
}

/** Delete the signed-in person's account and every row they own. Their photo files must already be gone. */
export async function deleteAccount(client) {
  const { error } = await client.rpc('delete_my_account');
  if (error) throw storeError(error);
}

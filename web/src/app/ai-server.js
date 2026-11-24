// @ts-check
// The app's side of the `ai` server function (supabase/functions/ai). It has the same shape as the
// Claude the prototype's host page provided, so the forty-odd call sites did not have to change:
//   sample([task, values], { images, onText })  ->  { text }
//   sample.json(...)                            ->  the reply parsed as JSON
// It sends the task's name, its values and any photos. It never sends a prompt.

/** Turn a reply that should be JSON into a value, tolerating a code fence or a sentence around it. */
export function looseJson(text) {
  const s = String(text || '').trim();
  const tries = [s, s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')];
  const a = s.search(/[[{]/);
  if (a >= 0) {
    const close = s[a] === '[' ? ']' : '}';
    const b = s.lastIndexOf(close);
    if (b > a) tries.push(s.slice(a, b + 1));
  }
  for (const t of tries) {
    try {
      return JSON.parse(t);
    } catch (e) {}
  }
  // near misses a model makes now and then: a number written 080, a comma before a closing bracket
  for (const t of tries) {
    try {
      return JSON.parse(mend(t));
    } catch (e) {}
  }
  throw { code: 'invalid_json', message: 'The reply was not valid JSON.', text: s };
}

/** Repair the small slips that make otherwise good JSON unreadable, touching nothing inside a string. */
export function mend(text) {
  let out = '',
    inString = false,
    escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    // a leading zero on a number: 080 becomes 80 (0.5 and a lone 0 are left alone)
    if (c === '0' && /\d/.test(text[i + 1] || '') && /[\s:,[-]/.test(out.slice(-1) || ':')) continue;
    // a comma with nothing after it before the bracket closes
    if (c === ',' && /^\s*[}\]]/.test(text.slice(i + 1))) continue;
    out += c;
  }
  return out;
}

/** Split a server-sent event stream into its JSON events as the bytes arrive. Returns a feed(chunk) function. */
export function eventReader(onEvent) {
  let buf = '';
  return chunk => {
    buf += chunk;
    for (let i; (i = buf.indexOf('\n\n')) >= 0;) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block
        .split('\n')
        .filter(l => l.startsWith('data:'))
        .map(l => l.slice(5).trim())
        .join('');
      if (data)
        try {
          onEvent(JSON.parse(data));
        } catch (e) {}
    }
  };
}

const base64 = blob =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1]);
    fr.onerror = () => rej({ code: 'image_rejected', message: 'That image could not be read.' });
    fr.readAsDataURL(blob);
  });

/**
 * @param {{ url: string, key: string, token: () => Promise<string | undefined>, fetch?: typeof fetch }} access
 */
export function serverSample(access) {
  const send = access.fetch || ((...a) => fetch(...a));
  /** @param {[string, Record<string, any>]} input @param {{ images?: Blob[], onText?: (p: { text: string }) => void }} [o] */
  const sample = async (input, o = {}) => {
    const [task, values] = input;
    const vars = Object.fromEntries(Object.entries(values || {}).map(([k, v]) => [k, String(v)]));
    const images = await Promise.all(
      (o.images || []).map(async f => ({ media_type: f.type || 'image/jpeg', data: await base64(f) })),
    );
    const token = await access.token();
    if (!token) throw { code: 'session_expired', message: 'Sign in again.' };
    let res;
    try {
      res = await send(access.url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, apikey: access.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, vars, images, stream: !!o.onText }),
      });
    } catch (e) {
      throw { code: 'upstream_error', message: 'Could not reach the server.' };
    }
    if (!o.onText || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
      const out = await res.json().catch(() => null);
      if (!res.ok || !out || out.error)
        throw (out && out.error) || { code: res.status === 401 ? 'session_expired' : 'upstream_error', message: '' };
      if (o.onText) o.onText({ text: out.text });
      return { text: out.text };
    }
    // streamed: pass on the reply so far each time more arrives
    let text = '',
      end = null;
    const feed = eventReader(ev => {
      if (typeof ev.text === 'string' && !ev.done) {
        text += ev.text;
        o.onText({ text });
      } else end = ev;
    });
    const reader = res.body.getReader(),
      dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      feed(dec.decode(value, { stream: true }));
    }
    if (!end || end.error) throw { ...((end && end.error) || { code: 'upstream_error', message: '' }), text };
    return { text: end.text };
  };
  sample.json = async (input, o) => looseJson((await sample(input, o)).text);
  /** Look a branded product up on the web. Returns its per-100 figures and source page, or null. Never throws. */
  sample.lookup = async (brand, name) => {
    try {
      const r = await sample.json(['find_product', { brand, name }]);
      return r && r.found === true ? r : null;
    } catch (e) {
      return null;
    }
  };
  sample.limits = async () => ({ images: { maxCount: 4, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] } });
  return sample;
}

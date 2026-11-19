// @ts-check
// Error reporting that cannot carry diary contents or photos.
//
// When the app hits an error it did not expect, a short report goes to the project's own database
// (table client_errors), never to an outside service. Before it is sent:
//  - anything in quotes in the message is removed, and so are numbers, because that is where a food
//    name, a weight or a note could appear ("Cannot read 'porridge'" becomes "Cannot read '…'")
//  - the stack keeps only function names, file names and line numbers, which are about the code
// Nothing else is collected: no page contents, no stored data, no address beyond the screen's name.

/** @param {string} s */
const dropData = s =>
  s
    .replace(/"[^"\n]*"|'[^'\n]*'|`[^`\n]*`|“[^”\n]*”/g, m => m[0] + '…' + (m[0] === '“' ? '”' : m[0]))
    .replace(/\d+(?:[.,]\d+)*/g, '#');

/**
 * Reduce an error to what is safe and useful to send.
 * @param {any} err
 * @returns {{ name: string, message: string, stack: string } | null} null for things that are not code faults
 */
export function describeError(err) {
  // the app signals expected failures (no connection, limit reached) with plain { code } objects: not faults
  if (!err || typeof err !== 'object' || !(err instanceof Error || typeof err.stack === 'string')) return null;
  const name = String(err.name || 'Error').slice(0, 60);
  const message = dropData(String(err.message || '')).slice(0, 300);
  const stack = String(err.stack || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^at |@/.test(l))
    .map(l => {
      // "at fn (https://site/assets/index-abc.js:12:345)" or "fn@https://site/assets/index-abc.js:12:345"
      const where = l.match(/([\w.-]+\.m?js):(\d+):(\d+)/);
      if (!where) return ''; // a line with no code location (eval, native) says nothing useful and may carry an address
      const fn = (l.match(/^at (?:async )?([\w$.<>]+) \(/) || l.match(/^([\w$.<>]+)@/) || [])[1] || '';
      return (fn ? fn + ' ' : '') + where[1] + ':' + where[2] + ':' + where[3];
    })
    .filter(Boolean)
    .slice(0, 12)
    .join('\n')
    .slice(0, 2000);
  return { name, message, stack };
}

/**
 * Report unexpected errors. At most five per visit, and the same error only once.
 * @param {{ send: (row: object) => Promise<any>, version: string, screen: () => string }} opts
 */
export function reportErrors({ send, version, screen }) {
  const seen = new Set();
  const report = err => {
    const d = describeError(err);
    if (!d || seen.size >= 5) return;
    const key = d.name + d.message + d.stack.split('\n')[0];
    if (seen.has(key)) return;
    seen.add(key);
    Promise.resolve()
      .then(() =>
        send({
          ...d,
          version: version.slice(0, 40),
          screen: String(screen() || '').slice(0, 40),
          agent: navigator.userAgent.slice(0, 300),
        }),
      )
      .catch(() => {}); // reporting must never cause a second error
  };
  window.addEventListener('error', e => report(e.error));
  window.addEventListener('unhandledrejection', e => report(e.reason));
  return report;
}

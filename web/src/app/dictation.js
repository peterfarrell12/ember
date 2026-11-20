// @ts-check
// Speech to text through the browser's own speech recognition, where it has one (Chrome, Edge, Safari).
// It has the same shape as the dictation the prototype's host page provided, so the code that uses it did
// not change: start(), stop(), onPartial, onFinal, onState. Where the browser has none this returns null
// and the app hides the microphone. Note that browsers send the audio to Google or Apple to transcribe it.
//
// Browsers differ, and this is where the differences are absorbed:
// - Safari often never marks words as final. Whatever was heard but not made final is passed on as final
//   when listening ends, so nothing that was said is lost.
// - A second start can arrive before the last session has finished closing. It waits for that to end.
// - Not every engine knows en-IE. If the language is refused it tries again in en-GB.
// - start({ once: true }) listens for one utterance and lets the engine decide when the person has
//   finished, which is what a short spoken command wants. Without it, listening carries on through pauses.

/**
 * @param {any} [Recognition] the browser's SpeechRecognition constructor; passed in by the tests
 * @param {string} [lang]
 */
export function browserDictation(Recognition, lang = 'en-IE') {
  const Rec =
    Recognition ||
    (typeof window !== 'undefined' && (window['SpeechRecognition'] || window['webkitSpeechRecognition']));
  if (!Rec) return null;
  const cbs = { partial: null, final: null, state: null };
  const say = (kind, payload) => cbs[kind] && cbs[kind](payload);
  let rec = null,
    ended = Promise.resolve(), // settles when the session before this one has fully closed
    useLang = lang;
  const open = (once, retried) =>
    new Promise((resolve, reject) => {
      let started = false,
        pending = '', // heard but not yet made final
        why = 'stopped',
        done;
      ended = new Promise(r => (done = r));
      const r = (rec = new Rec());
      r.lang = useLang;
      r.continuous = !once;
      r.interimResults = true;
      r.onstart = () => {
        started = true;
        say('state', { state: 'listening' });
        resolve(undefined);
      };
      r.onresult = ev => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i],
            text = String(res[0].transcript || '').trim();
          if (res.isFinal) {
            if (text) say('final', { text });
          } else interim += (interim ? ' ' : '') + text;
        }
        pending = interim;
        if (interim) say('partial', { text: interim });
      };
      r.onerror = ev => {
        why = String(ev.error || 'failed');
        const denied = ev.error === 'not-allowed' || ev.error === 'service-not-allowed';
        if (!started && !(ev.error === 'language-not-supported' && !retried))
          reject({ code: denied ? 'not_granted' : 'failed', message: why });
      };
      r.onend = () => {
        if (rec === r) rec = null;
        done();
        if (started) {
          if (pending) say('final', { text: pending });
          say('state', { state: 'idle', reason: why });
        } else if (why === 'language-not-supported' && !retried && useLang !== 'en-GB') {
          useLang = 'en-GB';
          open(once, true).then(resolve, reject);
        } else reject({ code: 'failed', message: why === 'stopped' ? 'ended before it started' : why });
      };
      try {
        r.start();
      } catch (e) {
        if (rec === r) rec = null;
        done();
        reject({ code: 'failed', message: String(e) });
      }
    });
  return {
    onPartial: f => void (cbs.partial = f),
    onFinal: f => void (cbs.final = f),
    onState: f => void (cbs.state = f),
    /**
     * Start listening. Rejects with { code: 'not_granted' } when the person or the browser says no.
     * @param {{ once?: boolean }} [opts] once: stop by itself at the end of one utterance
     */
    async start(opts = {}) {
      if (rec && rec._closing) await ended; // the last session is still closing: let it finish first
      if (rec) return undefined;
      return open(!!opts.once, false);
    },
    async stop() {
      if (rec) {
        rec._closing = true;
        rec.stop();
      }
    },
  };
}

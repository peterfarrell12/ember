// @ts-check
// Speech to text through the browser's own speech recognition, where it has one (Chrome, Edge, Safari).
// It has the same shape as the dictation the prototype's host page provided, so the code that uses it did
// not change: start(), stop(), onPartial, onFinal, onState. Where the browser has none this returns null
// and the app hides the microphone. Note that browsers send the audio to Google or Apple to transcribe it.

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
  let rec = null;
  return {
    onPartial: f => void (cbs.partial = f),
    onFinal: f => void (cbs.final = f),
    onState: f => void (cbs.state = f),
    /** Start listening. Rejects with { code: 'not_granted' } when the person or the browser says no. */
    start() {
      return new Promise((resolve, reject) => {
        if (rec) return resolve(undefined);
        let started = false;
        const r = (rec = new Rec());
        r.lang = lang;
        r.continuous = true;
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
          if (interim) say('partial', { text: interim });
        };
        r.onerror = ev => {
          const denied = ev.error === 'not-allowed' || ev.error === 'service-not-allowed';
          if (!started) reject({ code: denied ? 'not_granted' : 'failed', message: String(ev.error) });
        };
        r.onend = () => {
          rec = null;
          if (started) say('state', { state: 'idle', reason: 'stopped' });
          else reject({ code: 'failed', message: 'ended before it started' });
        };
        try {
          r.start();
        } catch (e) {
          rec = null;
          reject({ code: 'failed', message: String(e) });
        }
      });
    },
    async stop() {
      if (rec) rec.stop();
    },
  };
}

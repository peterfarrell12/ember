// @ts-check
// Speech to text in the phone app, through the phone's own recogniser (Apple's on iPhone, Google's on
// Android). A phone app's web view has no speech recognition of its own, so without this the microphone
// would be hidden there. It has the same shape as browserDictation: start(), stop(), onPartial, onFinal,
// onState.
//
// The two phones behave differently, and this is where that is absorbed:
// - Words arrive as "partial results", each one the whole phrase so far. There is no separate final result:
//   the last one before listening ends is the phrase.
// - Both say "stopped" a moment BEFORE the last words arrive, so the end waits briefly for them.
// - iPhone never decides by itself that the person has finished; Android does. With once: true this stops
//   after a pause in speech, so a spoken command ends by itself on both.
// - When nothing is said, Android reports an error and iPhone reports nothing at all, so a start with no
//   words also gives up by itself after a few seconds.
// The plugin is @capgo/capacitor-speech-recognition, chosen because it installs through Swift Package
// Manager, which is how the iPhone project takes its plugins.

/**
 * @param {any} [plugin] the SpeechRecognition plugin; passed in by the tests
 * @param {{ lang?: string, settle?: number, pause?: number, silence?: number }} [opts]
 *   settle: how long to wait for the last words after "stopped"; pause: quiet after speech that ends a
 *   once-only listen; silence: how long to wait for a first word
 */
export function nativeDictation(plugin, opts = {}) {
  const { settle = 700, pause = 1800, silence = 8000 } = opts;
  let lang = opts.lang || 'en-IE';
  const cbs = { partial: null, final: null, state: null };
  const say = (kind, payload) => cbs[kind] && cbs[kind](payload);
  let sr = plugin || null,
    wired = false,
    listening = false,
    once = false,
    heard = '',
    reason = 'stopped',
    ending = 0,
    quiet = 0;
  const load = async () => sr || (sr = (await import('@capgo/capacitor-speech-recognition')).SpeechRecognition);
  const finish = () => {
    clearTimeout(ending);
    clearTimeout(quiet);
    ending = 0;
    if (!listening) return;
    listening = false;
    if (heard) say('final', { text: heard });
    heard = '';
    say('state', { state: 'idle', reason });
  };
  /** Listening is over or about to be: give the last words a moment to arrive, then report. */
  const endSoon = () => {
    if (!listening || ending) return;
    clearTimeout(quiet);
    ending = setTimeout(finish, settle);
  };
  const halt = why => {
    if (!listening || ending) return;
    reason = why;
    sr.stop().catch(() => {});
    endSoon();
  };
  const wire = async () => {
    if (wired) return;
    wired = true;
    await sr.addListener('partialResults', data => {
      const text = String((data && data.matches && data.matches[0]) || '').trim();
      if (!listening || !text) return;
      heard = text;
      say('partial', { text });
      if (ending) return;
      clearTimeout(quiet);
      if (once) quiet = setTimeout(() => halt('stopped'), pause);
    });
    await sr.addListener('listeningState', data => {
      if (data && (data.status === 'stopped' || data.state === 'stopped')) endSoon();
    });
    await sr.addListener('error', data => {
      if (!listening || ending) return;
      const code = String((data && data.code) || 'failed').toLowerCase();
      reason = /no.?match|no.?speech|speech.?timeout|silence/.test(code) ? 'no-speech' : code;
      endSoon();
    });
  };
  const begin = async retried => {
    try {
      // with partial results the call returns as soon as listening has started; the words come as events
      await sr.start({ language: lang, partialResults: true, popup: false, maxResults: 1 });
    } catch (e) {
      if (!retried && lang !== 'en-GB') {
        lang = 'en-GB'; // not every phone has Irish English
        return begin(true);
      }
      throw { code: 'failed', message: String((e && e.message) || e) };
    }
  };
  return {
    onPartial: f => void (cbs.partial = f),
    onFinal: f => void (cbs.final = f),
    onState: f => void (cbs.state = f),
    /**
     * Start listening. Rejects with { code: 'not_granted' } when the person has said no to the microphone
     * or to speech recognition, and { code: 'failed' } when the phone cannot do it.
     * @param {{ once?: boolean }} [o] once: stop by itself after a pause in speech
     */
    async start(o = {}) {
      if (ending) finish(); // the last listen was still settling: close it first
      if (listening) return undefined;
      await load();
      const can = await sr.available().catch(() => ({ available: false }));
      if (!can.available) throw { code: 'failed', message: 'speech recognition is not available on this phone' };
      let perm = await sr.checkPermissions();
      if (perm.speechRecognition !== 'granted') perm = await sr.requestPermissions();
      if (perm.speechRecognition !== 'granted') throw { code: 'not_granted', message: 'not allowed' };
      await wire();
      await begin(false);
      listening = true;
      once = !!o.once;
      heard = '';
      reason = 'stopped';
      say('state', { state: 'listening' });
      quiet = setTimeout(() => halt('no-speech'), silence);
      return undefined;
    },
    async stop() {
      halt('stopped');
    },
  };
}

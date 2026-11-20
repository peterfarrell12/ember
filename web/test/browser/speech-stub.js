// Scripted speech for the voice panel test. Loaded after prototype/test/mock.js, it replaces that file's
// dictation with one that "hears" the next phrase in window.__phrases: half of it as a partial result,
// then all of it as a final one. With nothing queued it just listens.
(() => {
  const real = window.claude.use.bind(window.claude);
  const cbs = {};
  let on = false;
  const dictation = {
    start: async () => {
      on = true;
      if (cbs.state) cbs.state({ state: 'listening' });
      const text = (window.__phrases || []).shift();
      if (!text) return;
      const words = text.split(' ');
      setTimeout(
        () => on && cbs.partial && cbs.partial({ text: words.slice(0, Math.ceil(words.length / 2)).join(' ') }),
        150,
      );
      setTimeout(() => on && cbs.final && cbs.final({ text }), 400);
    },
    stop: async () => {
      on = false;
      if (cbs.state) cbs.state({ state: 'idle', reason: 'stopped' });
    },
    onPartial: f => (cbs.partial = f),
    onFinal: f => (cbs.final = f),
    onState: f => (cbs.state = f),
  };
  window.claude.use = name => (name === 'dictation' ? Promise.resolve(dictation) : real(name));
})();

// Vite plugin: the app's numbered source files share one scope, exactly as in the prototype.
//
// The prototype joined src/0*.js in name order inside a single function, so every file can use
// what any other file declares. 'virtual:ember-app' is that same join. Files leave this join one
// at a time as they become real ES modules (Phase 0, last step); when the list is empty this
// plugin goes away.
import fs from 'node:fs';
import path from 'node:path';

const ID = 'virtual:ember-app';
const RESOLVED = '\0' + ID;

export default function singleScope({ dir }) {
  const files = () => fs.readdirSync(dir).filter(f => /^0.*\.js$/.test(f)).sort().map(f => path.join(dir, f));
  return {
    name: 'ember-single-scope',
    resolveId(id) { if (id === ID) return RESOLVED; },
    load(id) {
      if (id !== RESOLVED) return;
      const list = files();
      list.forEach(f => this.addWatchFile(f));
      return '(() => {\n' + list.map(f => fs.readFileSync(f, 'utf8')).join('\n') + '\n})();';
    },
    handleHotUpdate({ file, server }) {
      if (path.dirname(file) === path.resolve(dir)) {
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

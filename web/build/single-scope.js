// Vite plugin: serves 'virtual:ember-app', the app's source as one module (see app-source.js).
import path from 'node:path';
import { appSource } from './app-source.js';

const ID = 'virtual:ember-app';
const RESOLVED = '\0' + ID;

export default function singleScope({ dir }) {
  return {
    name: 'ember-single-scope',
    resolveId(id) {
      if (id === ID) return RESOLVED;
    },
    load(id) {
      if (id !== RESOLVED) return;
      const { code, files } = appSource(dir);
      files.forEach(f => this.addWatchFile(f));
      return code;
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

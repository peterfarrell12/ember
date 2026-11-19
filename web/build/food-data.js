// Vite plugin: serve and ship the three food lists from prototype/app without keeping a second
// 12 MB copy in git. Phase 3 of the build plan gives these files a proper home.
import fs from 'node:fs';
import path from 'node:path';

const NAMES = ['foods-generic.json', 'foods-brands.json', 'foods-brands-more.json'];

export default function foodData({ dir }) {
  return {
    name: 'ember-food-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '');
        if (!NAMES.includes(name)) return next();
        res.setHeader('Content-Type', 'application/json');
        fs.createReadStream(path.join(dir, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const name of NAMES) this.emitFile({ type: 'asset', fileName: name, source: fs.readFileSync(path.join(dir, name)) });
    },
  };
}

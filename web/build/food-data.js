// Vite plugin: serve and ship the three food lists from prototype/app without keeping a second
// 12 MB copy in git.
//
// In a build each list is written with a fingerprint of its contents in its name
// (foods-generic.3fa9c1d2.json), so a browser can be told to keep it for a year: the name only
// changes when the list does. The app learns the names through __FOOD_FILES__. The _headers file
// tells the host (Cloudflare) to send those long-cache instructions.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const LISTS = { gen: 'foods-generic.json', br: 'foods-brands.json', more: 'foods-brands-more.json' };
const HEADERS = `/sw.js
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/foods-*.json
  Cache-Control: public, max-age=31536000, immutable
`;

export default function foodData({ dir }) {
  const read = name => fs.readFileSync(path.join(dir, name));
  const stamped = name =>
    name.replace(/\.json$/, '.' + crypto.createHash('sha256').update(read(name)).digest('hex').slice(0, 8) + '.json');
  let names = LISTS; // while developing: the plain names, served straight from prototype/app
  return {
    name: 'ember-food-data',
    config(_, { command }) {
      if (command === 'build') names = Object.fromEntries(Object.entries(LISTS).map(([k, n]) => [k, stamped(n)]));
      return { define: { __FOOD_FILES__: JSON.stringify(names) } };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url || '').split('?')[0].replace(/^\//, '');
        if (!Object.values(LISTS).includes(name)) return next();
        res.setHeader('Content-Type', 'application/json');
        fs.createReadStream(path.join(dir, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const [k, name] of Object.entries(LISTS))
        this.emitFile({ type: 'asset', fileName: names[k], source: read(name) });
      this.emitFile({ type: 'asset', fileName: '_headers', source: HEADERS });
    },
  };
}

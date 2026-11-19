// Writes the joined single-scope source (the same text the Vite plugin serves) to a file, so
// ESLint can check names across all the numbered files at once. Each file is marked with a banner.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/app', import.meta.url));
const out = fileURLToPath(new URL('../.cache/app.joined.js', import.meta.url));
const files = fs
  .readdirSync(dir)
  .filter(f => /^0.*\.js$/.test(f))
  .sort();
const body = files.map(f => `/* ==== ${f} ==== */\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, '(() => {\n' + body + '\n})();\n');
console.log('joined', files.length, 'files');

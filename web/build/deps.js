// Reports, for each numbered app file, which names it declares at the top level and which names it
// uses that another numbered file declares. Used to choose the order in which files become modules:
// a file can become a module once everything it uses comes from files that already are.
//   node build/deps.js            summary per file
//   node build/deps.js 06-traindata.js   the names that file takes from others, and who uses its names
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';

const dir = fileURLToPath(new URL('../src/app', import.meta.url));
const files = fs
  .readdirSync(dir)
  .filter(f => /^0.*\.js$/.test(f))
  .sort();

export function analyse() {
  const info = {};
  for (const f of files) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    const ast = espree.parse(code, { ecmaVersion: 2023, sourceType: 'script', range: true, loc: true });
    const sm = eslintScope.analyze(ast, { ecmaVersion: 2023, sourceType: 'script' });
    const g = sm.globalScope;
    const declares = new Map(); // name -> kind
    for (const v of g.variables) if (v.defs.length) declares.set(v.name, v.defs[0].kind || v.defs[0].type);
    const uses = new Set(),
      writes = new Set();
    for (const r of g.through) {
      uses.add(r.identifier.name);
      if (r.isWrite()) writes.add(r.identifier.name);
    }
    // top-level let/const are in the global scope's variables for scripts only via 'through' resolution; collect them too
    for (const v of g.childScopes.length ? [] : []) void v;
    info[f] = { declares, uses, writes };
  }
  const owner = new Map();
  for (const f of files) for (const n of info[f].declares.keys()) owner.set(n, f);
  for (const f of files) {
    const d = info[f];
    d.from = new Map(); // other file -> names
    d.writesOther = [];
    for (const n of d.uses) {
      const o = owner.get(n);
      if (o && o !== f && !d.declares.has(n)) {
        if (!d.from.has(o)) d.from.set(o, []);
        d.from.get(o).push(n);
        if (d.writes.has(n)) d.writesOther.push(n);
      }
    }
  }
  return { files, info, owner };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { info } = analyse();
  const one = process.argv[2];
  if (one) {
    const d = info[one];
    console.log('declares', d.declares.size, 'names');
    for (const [o, names] of d.from) console.log('uses from', o + ':', names.sort().join(' '));
    for (const f of files)
      if (f !== one && info[f].from.has(one)) console.log('used by', f + ':', info[f].from.get(one).sort().join(' '));
  } else
    for (const f of files) {
      const d = info[f];
      const n = [...d.from.values()].reduce((s, a) => s + a.length, 0);
      console.log(
        f.padEnd(20),
        'declares',
        String(d.declares.size).padStart(3),
        ' uses',
        String(n).padStart(3),
        'names from',
        String(d.from.size).padStart(2),
        'files',
        d.writesOther.length ? ' reassigns: ' + d.writesOther.join(' ') : '',
      );
    }
}

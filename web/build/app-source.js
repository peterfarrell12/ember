// Builds the source of the app as one module.
//
// Two kinds of file live in src/app:
//  - real ES modules (the names in MODULES). They import only from each other.
//  - the numbered files, which still share one scope, exactly as in the prototype: they are joined
//    in name order inside a single function, so every file can use what any other declares.
// The joined code gets the modules' exports as ordinary imports. A numbered file leaves the join by
// becoming a module and being added to MODULES; when no numbered files are left, this file goes away.
import fs from 'node:fs';
import path from 'node:path';
import * as espree from 'espree';

export const MODULES = [
  'util.js',
  'features.js',
  'traindata.js',
  'backend-supabase.js',
  'auth.js',
  'ai-tasks.js',
  'ai-server.js',
  'dictation.js',
  'scanner.js',
  'product-server.js',
  'errors.js',
  'native.js',
  'reminders.js',
  'squads.js',
  'importer.js',
  'roadmap.js',
  'recipe-server.js',
  'native-dictation.js',
  'coaching.js',
];

export const numbered = dir =>
  fs
    .readdirSync(dir)
    .filter(f => /^0.*\.js$/.test(f))
    .sort();

/** The names a module file exports. */
export function exportsOf(file) {
  const ast = espree.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 2023, sourceType: 'module' });
  const names = [];
  for (const node of ast.body) {
    if (node.type !== 'ExportNamedDeclaration') continue;
    const d = node.declaration;
    if (d && d.declarations) for (const v of d.declarations) names.push(v.id.name);
    else if (d && d.id) names.push(d.id.name);
    for (const s of node.specifiers || []) names.push(s.exported.name);
  }
  return names;
}

/**
 * @param {string} dir src/app
 * @param {{ banners?: boolean, importPath?: (file: string) => string }} [opts]
 */
export function appSource(dir, opts = {}) {
  const files = numbered(dir);
  const body = files
    .map(f => (opts.banners ? `/* ==== ${f} ==== */\n` : '') + fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
  const imports = MODULES.map(m => {
    const file = path.join(dir, m);
    // only the names the joined code uses, so the lint pass does not report the rest as unused
    const names = exportsOf(file).filter(n =>
      new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])').test(body),
    );
    return `import { ${names.join(', ')} } from ${JSON.stringify(opts.importPath ? opts.importPath(file) : file)};`;
  }).join('\n');
  return { code: imports + '\n(() => {\n' + body + '\n})();\n', files: files.map(f => path.join(dir, f)) };
}

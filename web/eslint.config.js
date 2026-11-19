// A light rule set. Two passes, because the numbered app files still share one scope:
//  1. each file on its own: mistakes that show within a file (duplicate keys, unreachable code ...)
//  2. the joined source: names that are used but never declared, or declared but never used,
//     which can only be judged across all the files together.
// As files become real modules they move from pass 2 to the ordinary rules.
import js from '@eslint/js';
import globals from 'globals';

// 'AI' is the app's own wrapper around Claude calls; the browser list also names an experimental built-in AI.
const shared = { ecmaVersion: 2023, globals: { ...globals.browser, AI: 'off' } };

export default [
  { ignores: ['dist/**'] },
  // a directive needed in the joined pass looks unused in the per-file pass
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  {
    files: ['src/app/**/*.js'],
    languageOptions: { ...shared, sourceType: 'script' },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off', // judged in the joined pass
      'no-unused-vars': 'off', // judged in the joined pass
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'off', // style only
      'no-useless-assignment': 'off', // style only
      'no-dupe-keys': 'warn', // four real ones in the portion table of 02-foods.js, reported to the owner, not yet decided
    },
  },
  {
    files: ['.cache/app.joined.js'],
    languageOptions: { ...shared, sourceType: 'script' },
    rules: {
      'no-undef': 'error',
      'no-redeclare': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['src/main.js', 'vite.config.js', 'eslint.config.js', 'build/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: js.configs.recommended.rules,
  },
];

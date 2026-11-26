// Every screen's actions share one table (A.name), and the numbered files share one scope, so a second file
// that reuses a name silently replaces the first. That has broken a screen before (the phase editor took
// the progress photos' "add" action). This test fails when a name is defined twice without being listed here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../src/app/', import.meta.url);
// later files that replace an earlier action on purpose
const KNOWN = ['addExercise', 'delExercise', 'modeGo', 'modeMenu', 'photo', 'saveExercise', 'saveWeight'];

test('no action name is defined twice by accident', () => {
  const seen = {};
  for (const f of readdirSync(dir)
    .filter(n => /^0.*\.js$/.test(n))
    .sort())
    for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/^\s*A\.([A-Za-z0-9_]+) = /gm))
      (seen[m[1]] = seen[m[1]] || []).push(f);
  const twice = Object.keys(seen)
    .filter(k => seen[k].length > 1)
    .sort();
  assert.deepEqual(
    twice.filter(k => !KNOWN.includes(k)).map(k => k + ': ' + seen[k].join(', ')),
    [],
    'an action is defined in two places; rename the newer one',
  );
});

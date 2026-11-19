// Unit tests for error reporting: what is sent must not be able to carry diary contents.
import test from 'node:test';
import assert from 'node:assert/strict';
import { describeError } from '../src/app/errors.js';

test('anything quoted and every number is removed from the message', () => {
  const e = new SyntaxError(`Unexpected token 'p', "porridge with honey, 86.4 kg" is not valid JSON`);
  const d = describeError(e);
  assert.equal(d.name, 'SyntaxError');
  assert.equal(d.message, `Unexpected token '…', "…" is not valid JSON`);
  for (const secret of ['porridge', 'honey', '86', 'kg']) assert.ok(!JSON.stringify(d).includes(secret), secret);
  assert.equal(
    describeError(new TypeError("Cannot read properties of undefined (reading 'Peter weighed 91')")).message,
    "Cannot read properties of undefined (reading '…')",
  );
  assert.equal(describeError(new Error('day 2026-11-19 has 14 entries')).message, 'day #-#-# has # entries');
});

test('the stack keeps function names, file names and line numbers, and nothing from the address', () => {
  const e = new TypeError('x');
  e.stack = [
    'TypeError: note said "two eggs"',
    '    at commitDay (https://ember.example/assets/index-CVzL4nFD.js:12:3456)',
    '    at async A.saveEntry (https://ember.example/assets/index-CVzL4nFD.js:99:10)',
    '    at https://ember.example/assets/index-CVzL4nFD.js:1:1',
    'render@https://ember.example/assets/index-CVzL4nFD.js:40:7', // the form Safari and Firefox use
    '    at eval (eval at <anonymous> (https://ember.example/?email=peter@example.com#access_token=SECRET), <anonymous>:1:1)',
  ].join('\n');
  const d = describeError(e);
  assert.deepEqual(d.stack.split('\n'), [
    'commitDay index-CVzL4nFD.js:12:3456',
    'A.saveEntry index-CVzL4nFD.js:99:10',
    'index-CVzL4nFD.js:1:1',
    'render index-CVzL4nFD.js:40:7',
  ]);
  for (const secret of ['two eggs', 'ember.example', 'peter@', 'SECRET', 'access_token'])
    assert.ok(!JSON.stringify(d).includes(secret), secret);
});

test('expected failures are not reported: only real code faults', () => {
  assert.equal(describeError({ code: 'unavailable', message: 'offline' }), null);
  assert.equal(describeError({ code: 'daily_limit' }), null);
  assert.equal(describeError('a string'), null);
  assert.equal(describeError(null), null);
  assert.ok(describeError(new RangeError('boom')));
});

test('long messages and stacks are cut to the sizes the database accepts', () => {
  const e = new Error('x '.repeat(1000));
  e.stack = Array.from({ length: 100 }, (_, i) => `    at fn${i} (https://x/assets/a.js:${i}:1)`).join('\n');
  const d = describeError(e);
  assert.ok(d.message.length <= 300 && d.stack.length <= 2000 && d.stack.split('\n').length <= 12);
});

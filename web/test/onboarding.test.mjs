// Unit tests for the rules of the first run: ages, calorie floors, the healthy-weight check, the order of
// steps, what an older consent record allows, and which programme comes first.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dobFrom,
  ageOn,
  MIN_AGE,
  kcalFloor,
  bmiOf,
  lowestHealthyKg,
  canLose,
  goalWeightOk,
  furthest,
  consentOf,
  rankTemplates,
} from '../src/app/onboarding.js';
import { TEMPLATES } from '../src/app/traindata.js';

test('a date of birth is only taken when it is a real date', () => {
  assert.equal(dobFrom('3', '3', '1990'), '1990-03-03');
  assert.equal(dobFrom('29', '02', '2000'), '2000-02-29');
  assert.equal(dobFrom('29', '2', '2001'), '');
  assert.equal(dobFrom('31', '4', '1990'), '');
  assert.equal(dobFrom('', '', ''), '');
  assert.equal(dobFrom('1', '13', '1990'), '');
  assert.equal(dobFrom('1', '1', '90'), '');
});

test('age counts whole years, turning over on the birthday', () => {
  assert.equal(ageOn('2008-11-27', '2026-11-26'), 17);
  assert.equal(ageOn('2008-11-27', '2026-11-27'), 18);
  assert.equal(ageOn('1990-03-03', '2026-11-27'), 36);
  assert.ok(Number.isNaN(ageOn('2030-01-01', '2026-11-27')));
  assert.ok(Number.isNaN(ageOn('', '2026-11-27')));
  assert.equal(MIN_AGE, 18);
});

test('the calorie floor is 1,200 for women and 1,500 for men', () => {
  assert.equal(kcalFloor('f'), 1200);
  assert.equal(kcalFloor('m'), 1500);
});

test('weight loss is not offered at or under a body mass index of 18.5', () => {
  assert.ok(Math.abs(bmiOf(74, 168) - 26.2) < 0.05);
  assert.equal(canLose(74, 168), true);
  assert.equal(canLose(52, 170), false); // 18.0
  assert.equal(canLose(53.5, 170), true); // 18.51
  assert.equal(lowestHealthyKg(170), 53.5);
  assert.equal(goalWeightOk(53.5, 170), true);
  assert.equal(goalWeightOk(53.4, 170), false);
  assert.equal(goalWeightOk(50, 0), true); // no height on record: nothing to check against
});

test('the furthest step never goes backwards', () => {
  assert.equal(furthest('', 'account'), 'account');
  assert.equal(furthest('targets', 'consent'), 'targets');
  assert.equal(furthest('targets', 'first_log'), 'first_log');
  assert.equal(furthest('reminder', 'first_log'), 'reminder');
});

test('a consent given on the older single tick covers health information and AI', () => {
  assert.deepEqual(consentOf(null), { health: false, ai: null });
  assert.deepEqual(consentOf({ v: '2026-11-19', at: 'x' }), { health: true, ai: true });
  assert.deepEqual(consentOf({ v: '2026-11-27', at: 'x', health: true }), { health: true, ai: null });
  assert.deepEqual(consentOf({ v: '2026-11-27', health: true, ai: false }), { health: true, ai: false });
  assert.deepEqual(consentOf({ v: '2026-11-27', health: true, ai: true }), { health: true, ai: true });
});

test('three answers put the programme that fits first, and none is left out', () => {
  const first = want => rankTemplates(TEMPLATES, want)[0].id;
  assert.equal(first({ goal: 'strength', kit: 'gym', days: 3 }), 't-full3');
  assert.equal(first({ goal: 'strength', kit: 'gym', days: 4 }), 't-ul4');
  assert.equal(first({ goal: 'home', kit: 'db', days: 3 }), 't-home3');
  assert.equal(first({ goal: 'start', kit: 'none', days: 3 }), 't-bw3');
  assert.equal(first({ goal: 'hyrox', kit: 'gym', days: 4 }), 't-hyrox');
  assert.equal(first({ goal: 'field', kit: 'gym', days: 2 }), 't-field2');
  assert.equal(first({ goal: 'racket', kit: 'gym', days: 2 }), 't-padel2');
  // no kit: nothing that needs a gym comes first, whatever the goal
  assert.equal(first({ goal: 'strength', kit: 'none', days: 3 }), 't-bw3');
  assert.equal(rankTemplates(TEMPLATES, { goal: 'hyrox', kit: 'gym', days: 4 }).length, TEMPLATES.length);
});

// The reader for diary exports from other calorie apps.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { parseCsv, dateReader, cellNum, mealOf, readDiary, mergeDiaries, csvFilesInZip } from '../src/app/importer.js';

const food = text => {
  const r = readDiary(parseCsv(text));
  assert.equal(r.kind, 'food');
  return /** @type {any} */ (r);
};

test('CSV: quoted cells, doubled quotes, both line endings, a byte-order mark, semicolons', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\n\n1,2\n'), [
    ['a', 'b'],
    ['x, y', 'he said "hi"'],
    ['1', '2'],
  ]);
  assert.deepEqual(parseCsv('Date;Calories\n01.02.2026;1,5'), [
    ['Date', 'Calories'],
    ['01.02.2026', '1,5'],
  ]);
});

test('dates: a number above 12 anywhere in the column settles which comes first', () => {
  const uk = dateReader(['03/04/2026', '25/04/2026']);
  assert.equal(uk.read('03/04/2026'), '2026-04-03');
  assert.equal(uk.unsure, false);
  const us = dateReader(['03/04/2026', '04/25/2026']);
  assert.equal(us.read('03/04/2026'), '2026-03-04');
  const none = dateReader(['03/04/2026', '05/06/2026']);
  assert.equal(none.read('03/04/2026'), '2026-04-03'); // day first, as Irish and UK files are
  assert.equal(none.unsure, true);
});

test('dates: ISO, written months, two-digit years, and nonsense', () => {
  const r = dateReader([]).read;
  assert.equal(r('2026-11-24'), '2026-11-24');
  assert.equal(r('2026-11-24 08:15'), '2026-11-24');
  assert.equal(r('24 Nov 2026'), '2026-11-24');
  assert.equal(r('24-Nov-2026'), '2026-11-24');
  assert.equal(r('Nov 24, 2026'), '2026-11-24');
  assert.equal(r('Tuesday, November 24, 2026'), '2026-11-24');
  assert.equal(r('24/11/26'), '2026-11-24');
  assert.equal(r('31/02/2026'), '');
  assert.equal(r('total'), '');
});

test('numbers and meals', () => {
  assert.equal(cellNum('1,234.5'), 1234.5);
  assert.equal(cellNum('12,5'), 12.5);
  assert.equal(cellNum('87 g'), 87);
  assert.equal(cellNum(''), 0);
  assert.equal(mealOf('Breakfast'), 'b');
  assert.equal(mealOf('Lunch'), 'l');
  assert.equal(mealOf('Evening meal'), 'd');
  assert.equal(mealOf('Snacks'), 's');
  assert.equal(mealOf('Meal 5'), 's');
});

test('a MyFitnessPal nutrition summary: totals for each meal, no food names', () => {
  const r = food(
    'Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note\n' +
      '2026-11-20,Breakfast,412,14.2,5,,,,,380,,48.5,6,12,22.1,,,,,\n' +
      '2026-11-20,Dinner,"1,020",40,12,,,,,900,,110,9,20,55,,,,,\n',
  );
  assert.equal(r.app, 'MyFitnessPal');
  assert.equal(r.detail, 1);
  assert.equal(r.entries.length, 2);
  assert.deepEqual(r.entries[0], {
    d: '2026-11-20',
    m: 'b',
    n: 'Breakfast total',
    b: '',
    u: '',
    k: 412,
    p: 22.1,
    c: 48.5,
    f: 14.2,
    fi: 6,
    su: 12,
    sf: 5,
    na: 380,
  });
  assert.equal(r.entries[1].k, 1020);
});

test('a Cronometer servings file: each food, with its amount', () => {
  const r = food(
    'Day,Time,Group,Food Name,Amount,Energy (kcal),Alcohol (g),Carbs (g),Fiber (g),Sugars (g),Fat (g),Saturated (g),Protein (g),Sodium (mg)\n' +
      '2026-11-21,,Breakfast,"Porridge, made with water",250.00 g,115.0,0,20.1,2.3,0.2,2.0,0.4,3.5,5\n' +
      '2026-11-21,,Snacks,Banana,1.00 medium,105.0,0,27.0,3.1,14.4,0.4,0.1,1.3,1\n',
  );
  assert.equal(r.app, 'Cronometer');
  assert.equal(r.detail, 2);
  assert.equal(r.entries[0].n, 'Porridge, made with water');
  assert.equal(r.entries[0].u, '250.00 g');
  assert.equal(r.entries[0].sf, 0.4);
  assert.equal(r.entries[1].m, 's');
});

test('a Lose It! food log: quantity and units make the amount, American dates are recognised', () => {
  const r = food(
    'Date,Name,Type,Quantity,Units,Calories,Fat (g),Protein (g),Carbohydrates (g),Saturated Fat (g),Sugars (g),Fiber (g),Cholesterol (mg),Sodium (mg)\n' +
      '11/21/2026,Greek Yogurt,Breakfast,1,Cup,150,4,20,9,2.5,7,0,15,70\n' +
      '11/05/2026,Chicken Breast,Dinner,6,Ounces,280,6,52,0,1.5,0,0,140,120\n',
  );
  assert.equal(r.app, 'Lose It!');
  assert.equal(r.entries[0].d, '2026-11-21');
  assert.equal(r.entries[1].d, '2026-11-05');
  assert.equal(r.entries[0].u, '1 Cup');
  assert.equal(r.unsure, false);
});

test("Ember's own diary export reads back, salt turned back into sodium", () => {
  const r = food(
    'Date,Meal,Food,Brand,Amount,Grams,kcal,Protein g,Carbohydrate g,Fat g,Fibre g,Sugars g,Saturates g,Salt g,Source\n' +
      '2026-11-22,Lunch,Brown soda bread,McCambridge,2 slices,76,170,6.1,31,1.9,4.2,2.1,0.4,0.95,Label\n',
  );
  assert.equal(r.app, 'Ember');
  assert.equal(r.entries[0].b, 'McCambridge');
  assert.equal(r.entries[0].u, '2 slices');
  assert.equal(r.entries[0].na, 380);
});

test('a weight file or an exercise file is not a food diary; rows with nothing in them are skipped', () => {
  assert.equal(readDiary(parseCsv('Date,Weight\n2026-11-20,82.4\n')).kind, 'other');
  assert.equal(
    readDiary(parseCsv('Date,Exercise,Exercise Calories,Exercise Minutes\n2026-11-20,Run,300,30\n')).kind,
    'other',
  );
  assert.equal(readDiary(parseCsv('Date,Calories,Protein (g)\n')).kind, 'empty');
  const r = food('Date,Calories,Protein (g)\n2026-11-20,500,30\nTotals,900,60\n2026-11-21,0,0\n');
  assert.equal(r.entries.length, 1);
  assert.equal(r.skipped, 2);
  assert.equal(r.detail, 0);
  assert.equal(r.entries[0].n, 'Day total');
});

test('several files: the most detailed file wins a day, the future is dropped, only the newest days are kept', () => {
  const totals = food('Date,Calories,Protein (g)\n2026-11-19,2000,100\n2026-11-20,2100,110\n2026-12-25,9,9\n');
  const foods = food('Date,Food Name,Energy (kcal),Protein (g)\n2026-11-20,Eggs,150,12\n2026-11-20,Toast,90,3\n');
  const m = mergeDiaries([totals, foods], { today: '2026-11-24' });
  assert.deepEqual(
    m.days.map(d => [d.date, d.entries.length]),
    [
      ['2026-11-19', 1],
      ['2026-11-20', 2],
    ],
  );
  assert.equal(m.entries, 3);
  assert.equal(m.from, '2026-11-19');
  assert.equal(m.to, '2026-11-20');
  assert.equal(m.totalsOnly, false);
  const one = mergeDiaries([totals, foods], { today: '2026-11-24', maxDays: 1 });
  assert.equal(one.days.length, 1);
  assert.equal(one.older, 1);
  assert.equal(one.from, '2026-11-20');
});

// a zip file with one stored and one deflated entry, built by hand so the reader is tested against the format
function zip(files) {
  const parts = [],
    central = [];
  let at = 0;
  for (const [name, text, deflate] of files) {
    const raw = Buffer.from(text),
      data = deflate ? zlib.deflateRawSync(raw) : raw,
      nm = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nm.length, 26);
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(deflate ? 8 : 0, 10);
    head.writeUInt32LE(data.length, 20);
    head.writeUInt32LE(raw.length, 24);
    head.writeUInt16LE(nm.length, 28);
    head.writeUInt32LE(at, 42);
    parts.push(local, nm, data);
    central.push(head, nm);
    at += 30 + nm.length + data.length;
  }
  const dir = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(at, 16);
  const all = Buffer.concat([...parts, dir, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length);
}

test('zip: the CSV files come out as text, whether stored or deflated; other files are passed over', async () => {
  const big = 'Date,Calories,Protein (g)\n' + '2026-11-20,500,30\n'.repeat(400);
  const files = await csvFilesInZip(
    zip([
      ['export/Nutrition-Summary.csv', big, true],
      ['Measurement-Summary.csv', 'Date,Weight\n2026-11-20,82.4\n', false],
      ['readme.txt', 'hello', false],
      ['__MACOSX/._Nutrition-Summary.csv', 'junk', false],
    ]),
  );
  assert.deepEqual(
    files.map(f => f.name),
    ['Nutrition-Summary.csv', 'Measurement-Summary.csv'],
  );
  assert.equal(files[0].text, big);
  await assert.rejects(() => csvFilesInZip(new TextEncoder().encode('Date,Weight\n1,2\n').buffer), { code: 'not_zip' });
});

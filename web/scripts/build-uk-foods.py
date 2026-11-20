#!/usr/bin/env python3
"""Builds web/data/foods-uk.json from the UK government's food composition dataset.

Source: McCance and Widdowson's Composition of Foods Integrated Dataset 2021 (Public Health England),
https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
Contains public sector information licensed under the Open Government Licence v3.0.

    pip install openpyxl
    python3 web/scripts/build-uk-foods.py path/to/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx

Each row: [name, kcal, protein, carbohydrate, fat, fibre, sugars, saturates, sodium mg, portions, 'M', food code]
per 100 g, the same shape as the generic list with the dataset's food code added. A figure the dataset does
not give is null (the app shows "not listed"); a trace is 0. The dataset has no portion sizes, so the
everyday measures below are added by name: a rasher, a slice, a medium potato. They are typical weights,
there so that nobody has to weigh a slice of toast; every food can still be entered in grams.
"""
import json
import os
import re
import sys

import openpyxl

# First rule that matches the lower-case name wins. The first portion listed is the one a food opens at.
PORTIONS = [
    (r'^bacon rashers, (back|middle)', [['1 rasher', 25], ['2 rashers', 50]]),
    (r'^bacon rashers, streaky', [['1 rasher', 10], ['2 rashers', 20]]),
    (r'^sausages?, .*(grilled|fried)', [['1 sausage', 40], ['2 sausages', 80], ['1 cocktail sausage', 10]]),
    (r'^sausages?, .*raw', [['1 sausage', 57]]),
    (r'^sausage roll', [['1 sausage roll', 60], ['1 mini sausage roll', 15]]),
    (r'^(black|white) pudding', [['1 slice', 30], ['2 slices', 60]]),
    (r'^eggs, chicken, whole, (fried|poached|boiled)', [['1 egg', 50], ['2 eggs', 100]]),
    (r'^eggs, chicken, .*scrambled', [['2 eggs, scrambled', 120], ['1 egg, scrambled', 60]]),
    (r'^eggs, chicken, whole, raw', [['1 egg', 50]]),
    (r'^omelette', [['2 egg omelette', 120], ['3 egg omelette', 180]]),
    (r'^bread, .*(toasted|fried)', [['1 slice', 31], ['2 slices', 62]]),
    (r'^bread, (white|brown|wholemeal|granary|malt|rye|wheatgerm|seeded|multiseed)', [['1 slice', 36], ['2 slices', 72], ['1 thick slice', 44]]),
    (r'^bread, soda', [['1 slice', 40], ['2 slices', 80]]),
    (r'^bread rolls', [['1 roll', 50]]),
    (r'^bagels', [['1 bagel', 85]]),
    (r'^(pitta|pita) bread', [['1 pitta', 60]]),
    (r'^(tortillas?|wraps?)\b', [['1 wrap', 60]]),
    (r'^naan', [['1 naan', 130], ['half a naan', 65]]),
    (r'^croissants', [['1 croissant', 60]]),
    (r'^crumpets', [['1 crumpet', 50]]),
    (r'^scones', [['1 scone', 70]]),
    (r'^(hot cross buns|teacakes|currant buns)', [['1 bun', 60]]),
    (r'^pancakes', [['1 pancake', 60]]),
    (r'^butter\b|^spread|^margarine|^fat spread', [['1 thin spread, for a slice', 7], ['1 thick spread', 12], ['1 teaspoon', 5], ['1 tablespoon', 15]]),
    (r'^cheese, (cottage|cream|soft|spreadable|ricotta|quark)|^cheese spread', [['1 tablespoon', 30], ['1 small pot', 150]]),
    (r'^cheese', [['1 matchbox piece', 30], ['1 slice', 20], ['grated, 1 tablespoon', 10]]),
    (r'^milk, .*(dried|condensed|evaporated)', []),
    (r'^cream, ', [['1 tablespoon', 15], ['1 small pot', 150]]),
    (r'^yogurt|^fromage frais', [['1 pot', 125], ['1 large pot', 150], ['1 tablespoon', 40]]),
    (r'^ice cream', [['1 scoop', 60], ['2 scoops', 120]]),
    (r'^porridge, made', [['1 bowl', 260], ['1 small bowl', 180]]),
    (r'^porridge oats|^oats|^oatmeal', [['1 portion, dry', 40], ['1 tablespoon', 15]]),
    (r'^breakfast cereal, .*(weetabix|wheat biscuits)', [['2 biscuits', 38], ['1 biscuit', 19]]),
    (r'^breakfast cereal, .*(muesli|granola|clusters)', [['1 bowl', 50]]),
    (r'^breakfast cereal', [['1 bowl', 30], ['1 large bowl', 45]]),
    (r'^chips|^potato chips|^potatoes, .*chips', [['1 portion', 165], ['1 small portion', 100], ['1 chip shop portion', 300]]),
    (r'^potatoes, .*mashed', [['1 portion', 180], ['1 scoop', 60]]),
    (r'^potatoes, .*roast', [['1 portion, 4 potatoes', 200], ['1 roast potato', 50]]),
    (r'^potatoes, .*baked', [['1 medium baked potato', 180], ['1 large baked potato', 300]]),
    (r'^potatoes, new', [['1 portion', 175], ['1 new potato', 40]]),
    (r'^potatoes, .*boiled', [['1 portion', 175], ['1 medium potato', 80]]),
    (r'^potato (waffles|wedges|croquettes)|^hash browns', [['1 portion', 100], ['1 piece', 45]]),
    (r'^potato crisps|^crisps|^corn snacks|^tortilla chips', [['1 bag', 25], ['1 large bag', 40]]),
    (r'^rice, .*(boiled|cooked|re-heated|takeaway|homemade)', [['1 portion', 180], ['1 tablespoon', 30]]),
    (r'^rice, .*raw', [['1 portion, raw', 75]]),
    (r'^(pasta|spaghetti|macaroni|noodles), .*(boiled|cooked)', [['1 portion', 220], ['1 small portion', 150]]),
    (r'^(pasta|spaghetti|macaroni|noodles), .*(raw|dried)', [['1 portion, dry', 75]]),
    (r'^baked beans', [['half a tin', 200], ['1 tin', 415], ['1 tablespoon', 40]]),
    (r'^soup', [['1 bowl', 300], ['1 mug', 250], ['1 tin', 400]]),
    (r'^chicken, breast', [['1 breast', 130], ['half a breast', 65]]),
    (r'^chicken, (drumsticks?|leg)', [['1 drumstick', 50]]),
    (r'^chicken, (thigh)', [['1 thigh', 60]]),
    (r'^chicken (nuggets|goujons)|^chicken, .*(nuggets|goujons)', [['1 nugget', 16], ['6 nuggets', 96]]),
    (r'^fish fingers', [['1 fish finger', 28], ['3 fish fingers', 84]]),
    (r'^(cod|haddock|plaice), .*(batter|breadcrumbs)', [['1 fillet', 180], ['1 small fillet', 120]]),
    (r'^(salmon|cod|haddock|trout|mackerel|sea bass|plaice), .*(grilled|baked|steamed|poached|fried|smoked)', [['1 fillet', 130]]),
    (r'^tuna, .*canned', [['1 small tin, drained', 100], ['half a tin', 50]]),
    (r'^beef, .*(steak)', [['1 steak', 180], ['1 small steak', 120]]),
    (r'^beef, mince|^lamb, mince|^pork, mince', [['1 portion', 140]]),
    (r'^(beefburgers?|burgers?)\b', [['1 burger', 90], ['1 quarter pounder', 110]]),
    (r'^ham\b', [['1 slice', 25], ['2 slices', 50]]),
    (r'^(turkey|chicken), .*(slices|roll|sliced)', [['1 slice', 25]]),
    (r'^(lamb|pork), .*chops?', [['1 chop', 90]]),
    (r'^pizza', [['1 slice', 110], ['half a pizza', 200], ['1 whole pizza', 400]]),
    (r'^(lasagne|shepherd|cottage pie|moussaka|chilli con carne|curry, |stew|casserole|spaghetti bolognese|bolognese)', [['1 portion', 350], ['1 small portion', 250]]),
    (r'^bananas', [['1 banana', 100], ['1 small banana', 80], ['1 large banana', 120]]),
    (r'^apples, eating', [['1 apple', 130], ['1 small apple', 100]]),
    (r'^(oranges|pears|peaches|nectarines)', [['1 fruit', 150]]),
    (r'^(satsumas|clementines|mandarin|tangerines|kiwi|plums)', [['1 fruit', 70]]),
    (r'^grapes', [['1 handful', 80]]),
    (r'^(strawberries|raspberries|blueberries|blackberries)', [['1 handful', 80]]),
    (r'^avocado', [['half an avocado', 75], ['1 avocado', 150]]),
    (r'^tomatoes, (standard|raw|cherry)', [['1 tomato', 85], ['1 cherry tomato', 15]]),
    (r'^(peas|sweetcorn|carrots|broccoli|cabbage|green beans|cauliflower|spinach|swede|turnip|parsnip|mushrooms|onions|peppers|courgette|kale|leeks|sprouts|brussels)', [['1 portion', 80], ['1 tablespoon', 30]]),
    (r'^(lettuce|cucumber|salad)', [['1 portion', 80]]),
    (r'^biscuits, digestive.*chocolate', [['1 biscuit', 17], ['2 biscuits', 34]]),
    (r'^biscuits, digestive', [['1 biscuit', 15], ['2 biscuits', 30]]),
    (r'^biscuits', [['1 biscuit', 12], ['2 biscuits', 24]]),
    (r'^(cream crackers|crackers|oatcakes|crispbread|rice cakes)', [['1 cracker', 8], ['2 crackers', 16]]),
    (r'^cake|^fruit cake|^sponge|^muffins|^brownies|^flapjack|^doughnuts', [['1 slice or piece', 60]]),
    (r'^chocolate, (milk|plain|white|dark)', [['1 bar', 45], ['1 square', 7], ['1 large bar', 100]]),
    (r'^chocolate covered|^chocolate.*bar', [['1 bar', 45]]),
    (r'^(sweets|boiled sweets|fruit gums|pastilles|jellies|toffees|fudge)', [['1 small bag', 50], ['1 sweet', 6]]),
    (r'^(jam|marmalade|honey|chocolate spread|chocolate nut spread|lemon curd|syrup)', [['1 teaspoon', 8], ['1 tablespoon', 20]]),
    (r'^peanut butter', [['1 teaspoon', 8], ['1 tablespoon', 16], ['thickly spread on a slice', 20]]),
    (r'^sugar', [['1 teaspoon', 4], ['1 heaped teaspoon', 6]]),
    (r'^(mayonnaise|salad cream|ketchup|tomato ketchup|brown sauce|mustard|pickle|chutney|relish|hummus|houmous)', [['1 tablespoon', 15], ['1 teaspoon', 5]]),
    (r'^(oil|olive oil|rapeseed oil|sunflower oil|vegetable oil)', [['1 teaspoon', 5], ['1 tablespoon', 11]]),
    (r'^(almonds|peanuts|cashew|walnuts|hazelnuts|pistachio|mixed nuts|brazil nuts|pecan)', [['1 handful', 30]]),
    (r'^(raisins|sultanas|currants|dates|apricots, dried)', [['1 tablespoon', 30]]),
    (r'^pie|pie\b.*(individual|retail)|^pasties|^cornish past', [['1 individual pie', 150], ['1 slice', 110]]),
    (r'^quiche', [['1 slice', 140]]),
]


def val(v, none_ok=False):
    """A cell as a number: 'Tr' (trace) is 0; 'N' (not known) and blanks are None."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 1)
    s = str(v).strip()
    if s.lower() in ('tr', 'trace'):
        return 0
    try:
        return round(float(s), 1)
    except ValueError:
        return None


def portions(name):
    low = name.lower()
    for pat, ports in PORTIONS:
        if re.search(pat, low):
            return ports
    return []


def main(src, out):
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    sodium = {}
    for r in wb['1.4 Inorganics'].iter_rows(values_only=True, min_row=4):
        if r[0]:
            sodium[str(r[0]).strip()] = val(r[7])
    rows, seen = [], set()
    for r in wb['1.3 Proximates'].iter_rows(values_only=True, min_row=4):
        code, name = r[0], r[1]
        if not code or not name:
            continue
        code, name = str(code).strip(), re.sub(r'\s+', ' ', str(name)).strip().replace('`', "'")
        kcal, p, f, c = val(r[12]), val(r[9]), val(r[10]), val(r[11])
        if kcal is None or p is None or f is None or c is None:
            continue  # without energy and the three macros a food cannot be logged
        if 'weighed with' in name.lower() or name in seen:
            continue  # the same food per 100 g including its bone, shell or skin: only confusing in a diary
        seen.add(name)
        fibre = val(r[25])
        if fibre is None:
            fibre = val(r[24])
        na = sodium.get(code)
        rows.append([name, round(kcal), p, c, f, fibre, val(r[16]), val(r[27]), None if na is None else round(na),
                     portions(name), 'M', code])
    rows.sort(key=lambda r: r[0].lower())
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(rows, fh, ensure_ascii=False, separators=(',', ':'))
    with_ports = sum(1 for r in rows if r[9])
    print(f'{len(rows)} foods, {with_ports} with everyday portions, {os.path.getsize(out) // 1024} KB -> {out}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'data', 'foods-uk.json'))

// Every request the app makes to Claude, as a named task.
//
// This file is the single home of the prompts. The server function (../ai) builds each prompt here
// from the task's name and a set of short text values, so the app can never send a prompt of its
// own choosing: it can only ask for one of these tasks. The web app imports the same file for the
// browser tests, which run against a stand-in for Claude.
//
// Each task: tier ('quick' = the small model, 'default' = the mid model), whether the reply is JSON,
// how many photos it may carry, whether the reply streams, and build(v), which returns the prompt.
// The wording is the prototype's, moved here unchanged.

export const ITEM_FORMAT = `Reply with only a JSON array, no other text. One object per distinct food or drink:
{"name": short plain food name usable as a database search phrase, including cooking state where it matters (e.g. "white rice, cooked", "chicken breast, grilled"),
 "brand": brand name exactly as printed on the pack, or "" for unbranded food,
 "packaged": true if this is a branded or packaged product, else false,
 "known": true only if kcal100, p100, c100 and f100 are the maker's published figures for this exact product and you are sure of them, false if they are your estimate,
 "grams": your best estimate of the total grams (or ml) eaten of this item, as a number,
 "amount": the amount as the person would say it (e.g. "2 eggs", "1 bowl"),
 "kcal100": kcal per 100 g, "p100": protein g per 100 g, "c100": carbohydrate g per 100 g, "f100": fat g per 100 g,
 "meal": "b", "l", "d" or "s" if the text says breakfast, lunch, dinner or snack, else ""}
For a branded or packaged product, "name" is the product name with every variant word printed on it (flavour, zero, 0.0, light, protein, the cut or the range) and without the brand, the pack size or slogans, e.g. brand "Guinness", name "Draught 0.0 alcohol free stout"; "grams" is the amount eaten, using the printed net quantity (ml counts as grams) when a whole pack, can or bottle was had.
Use typical Irish and UK portion sizes unless amounts are given. Split a dish into parts only when the parts are named. Count cooking fats and sauces that are mentioned.`;

export const COACH_RULES =
  'You are the coach inside a calorie tracking app called Ember. Be specific and use the numbers given. Plain, direct language, no hype, no emoji, no markdown. You are not a doctor: no medical advice, and never suggest eating below the bottom of the calorie zone.';

export const IDEA_FORMAT = `Reply with only a JSON array of exactly 3 options, no other text: {"title": short name, "why": one short sentence with the kcal and protein and why it fits, "items": [ up to 4 foods ]} where each food is {"name": short database-style name, "grams": number, "amount": the amount in words, "kcal100": kcal per 100 g, "p100": protein g per 100 g, "c100": carbs g per 100 g, "f100": fat g per 100 g}. Keep each option at or under the calories left.`;

export const TASKS = {
  // New in the web app (not from the prototype): look a branded product up on the web when it is in none
  // of the lists. Runs with the web search tool; the server checks the answer before trusting it.
  find_product: {
    tier: 'quick',
    json: true,
    search: true,
    vars: ['brand', 'name'],
    build: v =>
      `Find the nutrition information for this packaged food or drink sold in Ireland or the UK: brand "${v.brand}", product "${v.name}".
Search for the maker's own page or a major retailer's product page (for example Tesco, Dunnes Stores, SuperValu, Sainsbury's) that prints the nutrition table. Use only figures printed on such a page for this exact product and variant. Do not estimate, and do not use figures for a similar product.
Reply with only JSON, no other text: {"found": true, "name": product name as printed, "brand": brand, "kcal": kcal per 100 g or 100 ml, "p": protein g per 100, "c": carbohydrate g per 100, "f": fat g per 100, "sf": saturates g per 100 or null, "su": sugars g per 100 or null, "fi": fibre g per 100 or null, "salt": salt g per 100 or null, "serving_g": the serving or pack size in g or ml if printed else null, "url": the address of the page the figures came from}
If you cannot find a page that prints the figures for this exact product, reply {"found": false}. If energy is only in kJ, divide by 4.184.`,
  },
  read_barcode: {
    tier: 'quick',
    images: 1,
    vars: [],
    build: v =>
      'Read the number printed under the barcode in this photo. Reply with only the digits, no spaces. If no barcode number is readable reply NONE.',
  },
  coach_ask: {
    tier: 'default',
    stream: true,
    vars: ['context', 'question'],
    // two turns from the person: what the coach knows about them, then their question
    build: v => [
      { role: 'user', content: COACH_RULES + ' Answer in under 130 words.\n\n' + v.context },
      { role: 'user', content: v.question },
    ],
  },
  parse_text: {
    tier: 'default',
    json: true,
    vars: ['text'],
    build: v =>
      `You turn a spoken or typed food diary note into structured items for a calorie tracker.\n${ITEM_FORMAT}\n\nNote: """${v.text}"""`,
  },
  parse_photo: {
    tier: 'default',
    json: true,
    images: 4,
    vars: ['intro', 'note'],
    build: v =>
      `${v.intro} someone is logging in a calorie tracker. Identify each distinct food and how much of it was eaten, judging scale from plates, cutlery, hands and packaging.
Read every word on any packaging before anything else: the brand and the exact product and variant matter more than how the food looks, because the tracker looks the product up in a database of 115,000 labelled products.
If a photo shows packaging, a shelf ticket, a menu board or a nutrition panel instead of, or as well as, the food itself, trust the print over your own estimate: use the product name and brand exactly as printed, set "label": true on that item, and give "kcal", "protein", "carbs", "fat" for the whole portion eaten as printed, per pack, per sandwich or per item (null for a figure that is not printed). Still give "grams": the printed weight if shown, otherwise your estimate. A ticket that shows only calories is enough.${v.note}
${ITEM_FORMAT}`,
  },
  read_label: {
    tier: 'default',
    json: true,
    images: 1,
    vars: [],
    build: v =>
      `This photo shows a nutrition label, a shelf ticket or packaging with nutrition figures, usually in EU format. Read it exactly; do not estimate values that are not printed. Reply with only JSON:
{"name": product name if visible else "", "brand": brand if visible else "", "basis": "100" if the figures you give are per 100 g or 100 ml, "serving" if they are per serving, pack, sandwich or item, "kcal": number, "p": protein g, "c": carbohydrate g, "f": fat g, "sf": saturates g or null, "su": sugars g or null, "fi": fibre g or null, "salt": salt g or null, "serving_g": the serving or pack size in g or ml if printed else null, "readable": true or false}
Prefer per 100 when the label prints both. If it prints figures only per serving, pack or item, which is common on sandwiches and menu tickets, give those with basis "serving". A figure that is not printed is null; a label that shows only calories is still readable. If energy is only in kJ, divide by 4.184.`,
  },
  pick_product: {
    tier: 'quick',
    json: true,
    vars: ['products', 'count', 'plural'],
    build: v =>
      `A calorie tracker is matching products to its database of labelled products. For each product below, choose the database entry that is the same product: same brand and same variant (zero or regular, light, flavour, cut). Pack size does not matter. Answer -1 when no entry is the same product; a different flavour or variant is not the same product.
${v.products}
Reply with only a JSON array of ${v.count} number${v.plural}, one per product, in order.`,
  },
  wearable_convert: {
    tier: 'default',
    json: true,
    vars: ['start', 'end', 'daily', 'lists'],
    build: v =>
      `Below is JSON from a fitness data service for one person, for ${v.start} to ${v.end}. Convert it for a calorie tracker. Reply with only JSON:
{"days":[{"date":"YYYY-MM-DD","weightKg":number or null,"steps":number or null,"activeKcal":number or null,"burnKcal":number or null,"recovery":number 0-100 or null,"sleepHours":number or null,"hrvMs":number or null,"restingHr":number or null,"strain":number or null}],
 "workouts":[{"date":"YYYY-MM-DD","name":"short activity name","minutes":number,"kcal":number or null,"km":number or null}]}
Rules: use only values that are present; null when absent; never invent or estimate. Skip a weight whose source is whoop_profile, because it is typed in, not weighed. burnKcal is total daily energy burned, activeKcal the active part. recovery is the wearable's own recovery or readiness score, not one calculated by the service. strain is the wearable's own day strain or load score for that day, as the wearable reports it. The same session can appear in more than one workout list: return each real session once. Energy given in kJ becomes kcal by dividing by 4.184. Skip sessions shorter than 10 minutes. Dates are the person's local calendar day.

### get_daily_metrics
${v.daily}${v.lists}`,
  },
  coach_review: {
    tier: 'default',
    json: true,
    vars: ['context'],
    build: v =>
      `${COACH_RULES}\nReview this person's last two weeks. Reply with only JSON: {"headline": one sentence summing up the fortnight, "wins": up to 3 short specific observations of what is going well, "watch": up to 3 short specific patterns to watch (for example weekends, low protein days, gaps in logging), "next": exactly 3 concrete actions for the coming week}. Each string under 25 words.\n\n${v.context}`,
  },
  chef_ideas: {
    tier: 'default',
    stream: true,
    vars: [
      'kind',
      'mood',
      'brief',
      'kcalLow',
      'kcal',
      'protein',
      'snackNote',
      'leftKcal',
      'leftProtein',
      'leftCarbs',
      'leftFat',
      'eaten',
      'usual',
      'recipes',
      'avoid',
      'seen',
    ],
    build: v =>
      `You are a personal chef cooking for one person in Ireland who tracks calories. Suggest 3 ${v.kind} they would look forward to eating: real dishes with proper names, the kind a good cook would be pleased to serve, not lists of plain ingredients. Make the three clearly different from each other in cuisine, main protein and cooking method. Season boldly: herbs, spices, acid, texture.
${v.mood}${v.brief}Size: each dish must come to between ${v.kcalLow} and ${v.kcal} kcal in total, never more, with ${v.protein} g of protein or more where the dish allows. Add up your own ingredient figures and adjust the amounts until each dish fits before you answer.${v.snackNote} For the whole day they have ${v.leftKcal} kcal, ${v.leftProtein} g protein, ${v.leftCarbs} g carbs and ${v.leftFat} g fat left, so lean away from whichever of carbs or fat is nearly used up. Count the oil, butter, sauces and cheese honestly.
Already eaten today: ${v.eaten}. Do not build a dish around any of these again; balance against them instead, for example with vegetables or fibre if there has been little.
${v.usual}${v.recipes}${v.avoid}${v.seen}Use ingredients an ordinary Irish supermarket stocks.
Reply with only a JSON array of exactly 3 options, no other text: {"title": the dish name, "why": one appetising sentence that says what makes it good, "mins": minutes to make, "items": [ up to 6 ingredients, the ones that carry the calories ]} where each ingredient is {"name": short database-style name, "grams": number, "amount": the amount in words, "kcal100": kcal per 100 g, "p100": protein g per 100 g, "c100": carbs g per 100 g, "f100": fat g per 100 g}.`,
  },
  menu_ideas: {
    tier: 'default',
    stream: true,
    images: 4,
    vars: ['leftKcal', 'leftProtein', 'leftCarbs', 'leftFat'],
    build: v =>
      `${COACH_RULES}\nThis photo is a restaurant, cafe or takeaway menu. Pick the 3 best orders on it for someone with ${v.leftKcal} kcal, ${v.leftProtein} g of protein, ${v.leftCarbs} g carbs and ${v.leftFat} g fat left today, favouring protein. If nothing on the menu fits, pick the closest and say in the "why" sentence what to leave off or share. Use dish names as printed. Estimate typical restaurant portions honestly, including oils and sauces.\n${IDEA_FORMAT}`,
  },
  chef_method: {
    tier: 'default',
    stream: true,
    vars: ['title', 'ingredients'],
    build: v =>
      `You are a personal chef. Write the method for one serving of "${v.title}" using these ingredients: ${v.ingredients}. Add seasoning, herbs and spices as a good cook would, but no other ingredient with meaningful calories. At most 6 numbered steps, one or two short sentences each, with heat levels and timings. Then one line starting "Tip:" with a swap or a serving idea. Plain text only: no markdown, no headings, no ingredient list.`,
  },
  fix_items: {
    tier: 'default',
    json: true,
    vars: ['items', 'fix'],
    build: v =>
      `A calorie tracker has this list of foods for one meal:\n${v.items}\n\nThe person says this correction: """${v.fix}"""\nApply it and return the whole corrected list. Keep items the correction does not mention exactly as they are.\n${ITEM_FORMAT}`,
  },
  build_program: {
    tier: 'default',
    json: true,
    vars: ['ask', 'catalog'],
    build: v =>
      `You are a strength and conditioning coach writing a training program for a tracking app. ${v.ask}
Use ONLY exercises from this catalog, by id. Order each session from the most demanding lift to the least. Give a rep range for strength work, seconds like "30s" for holds, and distances like "500 m" for conditioning. Rest is in seconds. If the person gave something to work around, choose exercises that respect it and do not diagnose.
Reply with only JSON: {"name": short program name, "about": one sentence on how it is organised, "weeks": number, "days": [{"name": short session name, "focus": a few words, "items": [{"ex": catalog id, "sets": number, "reps": "8-10", "rest": seconds, "note": optional short cue}]}]}
Catalog:
${v.catalog}`,
  },
  read_rehab_plan: {
    tier: 'default',
    json: true,
    images: 4,
    vars: ['intro', 'catalog', 'plan'],
    build: v =>
      `${v.intro} a rehab or exercise plan given to a patient by their physiotherapist. Lay it out for a tracking app exactly as written: do not add, remove, reorder or change any exercise, set, rep or hold, and do not give advice. If there are no phases or stages, use one phase.
For each exercise use the catalog id when it is clearly the same movement, otherwise leave "ex" empty and give "name" as written.
Reply with only JSON: {"name": short plan name, "phases": [{"name": phase name, "goal": its aim if stated else "", "items": [{"ex": catalog id or "", "name": exercise name as written, "sets": number, "reps": "10" or "30s", "note": side, tempo or other instruction if stated}]}]}
Catalog:
${v.catalog}${v.plan}`,
  },
  coach_draft: {
    tier: 'default',
    json: true,
    feature: 'coach',
    vars: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15'],
    build: v =>
      `You help a coach write to their clients. Draft a short message from the coach to this client about their last week: two to four sentences, specific to the numbers, warm but direct, ending with one clear focus for the coming week. No medical advice, no emoji, no markdown. Write it as the coach, addressed to the client by first name.
Reply with only JSON: {"text": the message}
Client: ${v.p0}. Goal: ${v.p1}.
Sessions this week: ${v.p2} of ${v.p3} planned on "${v.p4}". Personal records in 14 days: ${v.p5}.
Food: logged ${v.p6} of 7 days, averaging ${v.p7} kcal against ${v.p8}, protein ${v.p9} g against ${v.p10} g.
Weight trend: ${v.p11} kg, ${v.p12} kg change in 30 days. Recovery score today: ${v.p13}.
${v.p14}
Flags: ${v.p15}.`,
  },
  chat_draft: {
    tier: 'default',
    json: true,
    feature: 'coach',
    vars: ['name', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'],
    build: v =>
      `You help a coach write to a client. Draft the coach's next message: two to four sentences, specific to the numbers, warm but direct, with one clear focus. If the client's last message asked something, answer it first. No medical advice, no emoji, no markdown. Address the client by first name.
Reply with only JSON: {"text": the message}
Client: ${v.name}. Goal: ${v.p1}. Sessions in the last 7 days: ${v.p2} of ${v.p3} planned on "${v.p4}". Food logged ${v.p5} of 7 days, averaging ${v.p6} kcal against ${v.p7}. Weight trend ${v.p8} kg. Recovery score ${v.p9}. Flags: ${v.p10}.
Recent messages, oldest first:\n${v.p11}`,
  },
  // New in the web app: a week of meals to the person's own targets, with a shopping list.
  meal_plan: {
    tier: 'default',
    json: true,
    vars: ['kcal', 'protein', 'meals', 'likes', 'usual'],
    build: v =>
      `You plan a week of meals for someone in Ireland who tracks their food in an app called Ember. Use everyday food from Irish and UK supermarkets, metric amounts, and dishes that are realistic to cook on a weeknight; reuse leftovers and ingredients across the week where it is sensible. No medical advice and no supplements.
Target: about ${v.kcal} kcal and at least ${v.protein} g of protein a day. Each day's meals: ${v.meals}.
What they want or avoid: ${v.likes || 'nothing in particular'}.
Foods they log often, to keep it familiar: ${v.usual || 'not known'}.
Reply with only JSON, no other text: {"days": [exactly 7 objects, Monday first: {"day": "Mon", "meals": [{"m": "b" for breakfast, "l" lunch, "d" dinner or "s" snack, "name": short dish name, "what": the foods and amounts as a person would say them, for example "2 eggs scrambled, 2 slices wholemeal toast, 10 g butter", "kcal": number, "p": grams of protein}], "kcal": the day's total, "p": the day's protein}], "shop": [up to 30 strings: the week's shopping list with amounts, for example "Chicken breast, 1 kg"]}. Every figure is your estimate.`,
  },
  // New in the web app: two or three sentences for the day, from what the diary shows.
  daily_note: {
    tier: 'quick',
    vars: ['tone', 'context'],
    build: v =>
      `${COACH_RULES}\nWrite today's short note for this person: two or three sentences, under 60 words, plain text only. Start from what actually happened yesterday and this week, using the numbers given, then say the one thing most worth doing today. Tone asked for: ${v.tone} ("gentle" means warm and encouraging without gushing; "straight" means brief and direct, no cushioning).\n\n${v.context}`,
  },
  assistant_turn: {
    tier: 'default',
    json: true,
    vars: [
      'p0',
      'p1',
      'p2',
      'tk',
      'p4',
      'p5',
      'p6',
      'p7',
      'p8',
      'p9',
      'lo',
      'hi',
      'p12',
      'p13',
      'p14',
      'p15',
      'p16',
      'p17',
      'p18',
      'p19',
      'p20',
      'p21',
      'p22',
      'diary',
      'planL',
      'p25',
      'p26',
      'p27',
      'pend',
      'p29',
    ],
    build: v =>
      `You are the assistant built into Ember, a food, training and recovery tracker. The person talks to you by voice, so "say" is read aloud: one to three short sentences of plain spoken English, no lists, no markdown, no emoji. Be direct and friendly. The person is in Ireland: use Irish and UK food words and metric units.

Reply with only JSON: {"say": string, "actions": array, "chips": array of up to 3 short things the person might say next}

You never save anything yourself. You ask the app to act by adding to "actions"; the app does it and reports back in a line starting [app]. Never say something is saved unless an [app] line says so. Actions:
- {"do":"food","meal":"b"|"l"|"d"|"s","items":[{"name","brand","grams","amount","kcal100","p100","c100","f100"}]}: foods to log. The app matches each to its database and shows a card to confirm, so say briefly what you have and ask if it is right. "name" is a short database-style name with the cooking state ("pork sausage, fried", "egg, fried"). "grams" is the total grams of that item. One item per component.
- {"do":"remove_food","match": part of the food's name, "meal": optional}
- {"do":"water","ml": number, negative to take some off}
- {"do":"caffeine","drink": one of filter, amer, flat, latte, capp, cort, mocha, chai (chai latte), dchai (dirty chai), matcha, esp, dbl, tea, green, cola, ed250, ed500, pre, tab, gel, "milk": whole|semi|skim|oat|soya|almond|coconut|none, "ml": millilitres of milk, "sugar": teaspoons, "sugar_free": boolean, "with_calories": boolean}: a coffee, tea, cola or energy drink on its own. Counts the caffeine and, unless with_calories is false, the calories.
- {"do":"weight","kg": number}
- {"do":"exercise","name","minutes","effort":"easy"|"moderate"|"hard","kcal": optional}
- {"do":"checkin","sleep_hours","sleep_quality","soreness","energy","stress"}: the recovery check-in; the last four are 1 to 5.
- {"do":"event","title","kind":"match"|"class"|"cardio"|"appt"|"rest"|"other","date":"YYYY-MM-DD","time":"HH:MM" or "","minutes","weekly": boolean}
- {"do":"move_session","from":"YYYY-MM-DD","to":"YYYY-MM-DD"} | {"do":"skip_session","date"} | {"do":"start_session"}
${v.p0}${v.p1}
- {"do":"open","screen":"today"|"train"|"progress"|"quests"|"calendar"|"photos"|"caffeine"${v.p2}}

Food: if what they said is too vague to estimate within about a fifth (a fry, a sandwich, a takeaway, "dinner"), ask before logging. One short question at a time, three at most in the whole exchange: what was in it, how many or how much, how it was cooked. Whenever you ask anything, put two to four likely answers in "chips", most likely first, each a complete answer they could tap as it stands ("Two rashers, two sausages and an egg", "Oat milk, regular size"); the app shows them as choices.
Do not ask when a usual portion will do. One named everyday food or drink (a banana, a slice of toast, a pint of Guinness, a flat white, an americano, a dirty chai latte) is logged at once at its usual size, and you say what you logged. A coffee, tea, cola or energy drink on its own goes straight to the caffeine action with only what they said: leave out milk, ml and sugar unless they named them, and the app uses how they usually take it.
What they say reaches you through speech recognition and can be misheard. If a near-sounding food, drink or request is clearly what was meant, go with it. If the words make no sense, say what you heard and ask them to say it again. Once you can estimate, send the food action. If they do not know, estimate sensibly and say it is an estimate. If a card is waiting and they change something, send a corrected food action; do not send one if they only asked a question. A coffee or tea that is part of a meal goes in the food items.
Questions: answer from the app state below with the actual numbers. No medical advice; for pain or an injury that sounds serious, tell them to see a physio or doctor. If they ask for something the app cannot do, say so plainly.

Now: ${v.tk} ${v.p4}, ${v.p5}:${v.p6}. Meal slot right now: ${v.p7}.
Today: ${v.p8} of ${v.p9} kcal eaten (zone ${v.lo} to ${v.hi}), ${v.p12} left. Protein ${v.p13} of ${v.p14} g, carbs ${v.p15} of ${v.p16} g, fat ${v.p17} of ${v.p18} g. Water ${v.p19} of ${v.p20} ml. Caffeine ${v.p21} mg. Day ${v.p22}.
Diary today:
${v.diary}
Plan for the next 8 days:
${v.planL}
${v.p25}${v.p26}${v.p27}
A card is waiting for: ${v.pend}.

Conversation so far:
${v.p29}`,
  },
};

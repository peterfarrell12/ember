# Coach build plan

The detailed plan for building out coaching in Ember, written 26 November 2026 from Cillian's two walkthroughs (1FIT and Trainerize as a coach; his own MVP as a client app) and what is already in the repo. `docs/COACH_PLAN.md` holds the history and what was built in the first round. This file is the plan from here.

Three rules run through every step:

1. **Both sides, always.** No feature is done until the coach can set it and the client can see and act on it. Each step below has a "Coach" and a "Client" part and neither ships alone.
2. **Each coach makes it their own.** Forms, check-ins, phases, habits, supplement lists, menus and the vault belong to the coach who made them. Ember ships starter templates; a coach copies, edits or replaces them. A business can share its templates with its coaches.
3. **Web and phone from one codebase.** The coach works mainly at a desk, the client mainly on a phone, and both screens come from the same code. Every screen is checked at 320 and 390 px and at desk width, light and dark.

## What Cillian's MVP has, against Ember today

His app is the client's side. Most of it is already in Ember; the gaps are small on food and larger on coaching content.

| In Cillian's MVP | Ember today | To do |
|---|---|---|
| Streak and dashboard at the top | Built | None |
| Calorie box with carbohydrate, fat, protein and fibre boxes | Calories, protein, carbohydrate and fat on Today; fibre only in the day's nutrition sheet | Add fibre to Today with a target (step 13) |
| Breakfast, lunch, dinner, snacks | Built | None |
| Small "mindful eating" habits to tick off | Fixed daily tasks only | Custom habits and a starter set (step 12) |
| Food search with brands, recently added | Built: UK food tables, 110,000 branded products, Recent | None |
| Barcode scan | Built | Test on a phone |
| Estimate a meal from a photo and a few words | Built, 40 AI requests a day | None |
| Eating out: scroll typical chains | A menu can be photographed and read; no list of chains | Chain menus need a data source (step 13) |
| Quick add, my meals | Built | None |
| A drinks section (a pint or bottle of cider) | Drinks exist for caffeine; pints and bottles exist as amounts; no Drinks group | Add a Drinks group to the Add sheet (step 13) |
| "Check in with your relationship with food" | Not built | A self check-in from the forms engine (steps 3 and 12) |
| Weigh-in, trends, weekly averages, week-on-week change | Built (trend, weekly review) | None |
| Weekly calorie average | Built | None |
| "You have stalled for two weeks, drop calories by 100" | The weekly review says whether the target still fits the measured burn; it does not propose a number | Add a suggested change with safeguards (step 9) |
| Hip and waist measurements | Not built | Step 14 |
| Food reports | Built (charts, weekly review, spreadsheet export) | None |
| Recipes by category, added by the coach | Personal recipes only | A coach's recipe book (step 10) |
| AI recipes from what is in the fridge, to a calorie and protein figure | Built ("What can I eat?" takes what to use up and sizes to what is left) | Let the person type the calories and protein they want (step 10) |
| Menu of the week at a chosen calorie level | A personal week's meal plan from Claude | A coach's menu of the week, scaled (step 10) |
| Shopping list | Built for the meal plan | Extend to recipes and menus (step 10) |
| Community group chat | Squads have a board, no chat | Step 18, with moderation |
| Membership portal with educational videos | Not built | Vault (step 17), paid access with payments (step 20) |

## How it fits together

### The two frames

Everything below sits in one of two frames, built first so each feature has a home on both sides.

- **The coach workspace.** A side bar at desk width (Clients, Prospects, Check-ins, Messages, Templates, Library, Forms, Business) and the same sections behind the tab bar on a phone. Opening a client gives a client page with its own menu: Overview, Calendar, Phases, Physique, Training, Nutrition, Habits, Check-ins, Vault, Notes.
- **The client's Coach space.** One place in the client's app, a "Coach" tab that appears when they have a coach, holding everything their coach has set: the current phase and roadmap, this week's targets, habits, the check-in, messages, the meal plan or menu, supplements, and the vault. Today still shows what needs doing now (a check-in due, an offer to accept); the Coach space is where it all lives.

### How data crosses between the two accounts

The rule from round one stays: a coach sees only what the client's app sends, cut to what the client shares, and never writes into the client's diary. Three additions make the new features possible without breaking it.

- **Weekly summaries.** The client's app writes one row per week per link (average weight, calories, protein, steps, sessions done, check-in sent), only for shared areas. Phases, the engagement ledger and trend graphs read these, so a coach has history without reading the diary. Today's copy only covers the recent fortnight.
- **Assignments become typed records.** Round one put everything a coach sets into one bundle. Phases, plans, habit sets, supplement lists and forms become their own tables, each row owned by the coach and readable by the one client it is for.
- **Responses are the client's rows.** Form answers, measurements, shared photos and habit ticks are written by the client and readable by their coach while the link is active.

Every new table gets database rules and a test that a third account sees nothing, as now.

### Things that need a decision or an account before their step

| Needed | For | Whose call |
|---|---|---|
| A service that sends email from Ember (invites, form reminders) | Step 4. Costs a little each month | Owner |
| Storage for files and photos, and whether video is uploaded or linked | Steps 14 and 17. Upload storage costs money as it grows | Owner; recommend links for video first |
| Apple and Google developer accounts | Phone notifications (step 6) and store builds | Owner |
| Stripe, and pricing | Step 20 | Owner and Cillian |
| A minimum age and calorie floors | Steps 9 and 12 | Owner, with advice |
| Wording for sharing health data with a coach, and for the consultation form | Steps 3 and 4 | Owner, with advice |
| A source for restaurant chain nutrition | Step 13 | Owner; see that step |

## The steps

Sizes are relative: S is a day or two of work at the pace of round one, M several days, L a week or more. Each step ends with tests: database rules, a two-browser test of coach and client together, and screen checks at phone and desk widths.

### Milestone 1: the frames and getting a client in

#### 1. The coach workspace (M)

- **Coach:** the side bar and client page described above, at desk width; the same sections on a phone. The screens built in round one move into it: client list, invitations, applications, the client workspace, check-ins, messages, the coach's page. Search and filter the client list; tag clients (for example "prep", "general", "online").
- **Client:** nothing new.
- **Data:** tags on the coach's own record of a client.
- **Done when:** a coach with thirty clients can reach any client's check-in or conversation in two clicks at a desk and three taps on a phone.

#### 2. The client's Coach space (M)

- **Client:** a Coach tab when linked: coach's name and brand, current phase (once built), this week's targets, habits, check-in status, the latest message, and what the coach has shared. Empty sections do not show. "Your coach" (what is shared, pause, end) moves here from You.
- **Coach:** "See their app" opens on this tab, so the coach sees what they have set as the client sees it.
- **Done when:** a new client, on accepting, lands on a Coach tab that tells them what happens next.

#### 3. Forms, made by each coach (L)

The base for the consultation form, check-ins, the relationship-with-food check-in and any other questionnaire.

- **Coach:** a Forms section. Build a form from questions of these kinds: short text, long text, number with a unit, scale (1 to 5 or 1 to 10) with labels, one choice, several choices, yes or no, date, photo, and a body measurement. Mark questions required. Reorder, duplicate, preview as the client. Save as a template. Ember ships starter templates (consultation, weekly check-in, relationship with food) that a coach copies and edits; nothing is fixed. Editing a form does not change answers already given: each answer keeps the question as it was asked.
- **Client:** fills in a form one screen at a time on a phone, can save and come back, sees what will be sent before sending.
- **Data:** `coach_forms` (owner, title, kind, questions, version), `coach_form_sends` (which form, which link, due date, repeat rule), `coach_form_answers` (the client's row: answers with the question text, sent date). Photos in answers go to private storage readable by that coach only.
- **Rules:** a consultation form asks for health information, so it carries the consent wording and says who will read it.
- **Done when:** Cillian rebuilds his own consultation form and weekly check-in in Ember without asking for a change to the app.

#### 4. Getting a client in (M)

Cillian's first complaint about 1FIT, and his reason for liking Trainerize.

- **Coach:** "Add a client" takes a name and an email. The client gets an email with a link. The coach picks what a new client receives by default: consultation form, welcome message, check-in schedule, starting programme, habit set. That starter pack is editable per coach and can differ per client type. Prospects holds only people who applied from the coach's page and are not yet accepted; accepting moves them straight in.
- **Client:** opens the link, creates an account or signs in, chooses what to share, and is taken to the consultation form. No code to type. The invite by code and link stays for coaches who prefer to send it themselves.
- **Data:** the invitation gains an email and a starter pack; a server function sends the email.
- **Needs:** an email sender.
- **Done when:** from the coach typing an email to the client finishing the consultation form, nobody has to do anything by hand in between.

### Milestone 2: the weekly rhythm

#### 5. Check-ins, second version (M)

- **Coach:** a check-in is a form (step 3) on a schedule: which day, how often (weekly, fortnightly, monthly), and a window. A Check-ins inbox across all clients: to answer, due today, overdue, and each client's streak of on-time check-ins. The reply screen shows this week's answers beside last week's, the week's figures, photos and measurements if asked for, Claude's summary and draft reply, and the coach's reply by text or a link to a video. Reply templates.
- **Client:** a card on Today and in the Coach space when it is due; a reminder; the form with the week's figures filled in; the coach's reply when it comes; a history of past check-ins and replies.
- **Data:** check-ins move onto the forms tables; on-time and overdue are worked out from the schedule.
- **Done when:** Cillian's Monday is one screen: every check-in due, with the overdue ones on top.

#### 6. Messages, second version (M)

- **Coach:** a Messages inbox across clients with unread counts, the conversation beside the client's overview at desk width, saved replies, Claude's draft, a message to a group or to everyone, and files or photos attached.
- **Client:** the conversation in the Coach space, an unread badge on the tab, attachments.
- **Data:** conversations move to the messages table already in the database, so nothing is lost after thirty messages and delivery is within seconds.
- **Needs:** phone notifications need the developer accounts. Until then, an unread badge and an optional email.
- **Later:** voice notes.

#### 7. Client overview and engagement (M)

What Cillian opens for every client.

- **Coach:** an Overview with an engagement score and what makes it up (check-ins on time, logging of weight, food, training and steps against what was asked, plan adherence, messages), each marked on track or behind; a four-week ledger with the trend; tiles for weight, last and next check-in, training, nutrition, steps and last message; alerts ("nothing logged since", "three check-ins missed") with Message and Dismiss beside each. The client list sorts by score. What counts towards the score is set per client, so a general client is not marked behind for not weighing daily.
- **Client:** nothing shows them a score. They see their own week in the Coach space: what was asked and what was done.
- **Data:** read from weekly summaries, check-in records and message times. Areas the client does not share show as not shared and are left out of the score.
- **Done when:** the score for a real client matches what Cillian would say about them from memory.

### Milestone 3: the plan

#### 8. Phases (L)

What Cillian called the best thing in either tool.

- **Coach:** a roadmap per client: named phases in order (his are Ignite, Transform, Thrive, Soar), each with a purpose, a length in weeks, start and projected end, and targets for the phase (calories, protein, steps, sessions, rate of change). One phase is active. For each completed week the page shows average weight, average calories against target, average steps against goal, sessions against plan, and whether the check-in came in; the coach adds a note and marks milestones met or missed. Roadmaps save as templates. Moving to the next phase can change the client's targets and programme, sent as one offer.
- **Client:** the roadmap in the Coach space: where they are, what this phase is for, what comes next, their own weekly figures against the targets, milestones reached, and the coach's notes marked for them (a coach can keep a note private).
- **Data:** `coach_phases` (link, order, name, purpose, weeks, dates, targets, status), `coach_phase_weeks` (notes, milestones); weekly figures from weekly summaries.
- **Rules:** a projected end date is a plan, not a promise of a result, and the wording says so. No projected weight by a date in anything used as an advert or store screenshot.
- **Done when:** Cillian lays out a year for a client in a few minutes and the client can see it on their phone.

#### 9. Nutrition targets (M)

- **Coach:** targets for calories, protein, carbohydrate, fat and fibre, with different figures for training and rest days if wanted; water and caffeine targets; all sent as an offer the client accepts. Ember suggests a change when the trend has stalled against the goal for two weeks ("weight flat for 14 days at an average of 2,150 kcal: consider 2,050") and the coach decides.
- **Client:** targets on Today as now, switching by day type. A person with no coach gets the same suggestion in their weekly review, to accept or leave.
- **Rules:** suggestions never go below a floor and are never made for someone under the minimum age or whose goal would take them under a healthy weight; the floor and age are the owner's decision with advice. The client always sees the same figures the coach sees.
- **Done when:** a coach changes a client's rest-day carbohydrate and the client's Today shows it the next rest day, after they accept.

#### 10. Meal plans, recipes and the menu of the week (L)

- **Coach:** three things, each optional. A recipe book: the coach's recipes by category (breakfast, lunch, dinner, snacks, desserts), built in the recipe editor or brought in from a link, shared with all clients or some. A meal plan for one client: start from Ember's planner (Irish and UK food), edit any meal, or attach a file. A menu of the week for everyone: a day or week of meals the coach publishes, which each client sees at their own calorie level.
- **Client:** recipes in the Coach space, loggable in one tap; their meal plan by day with each meal loggable; the menu of the week sized to them; a shopping list from any of these.
- **Data:** `coach_recipes`, `coach_meal_plans`, `coach_menus`. Scaling a menu to a calorie level adjusts portions and shows the result as an estimate.
- **Also for everyone:** "What can I eat?" gains boxes for the calories and protein wanted.
- **Done when:** Cillian stops sending meal plans as PDFs.

#### 11. Supplements (S)

- **Coach:** supplement lists from templates (name, amount, when, note), assigned to a client or a group.
- **Client:** the list in the Coach space with a daily tick if the coach wants it tracked.
- **Rules:** general guidance. No medical claims, and a line telling the client to check with a doctor or pharmacist if they take medication or are pregnant.

#### 12. Habits and the relationship-with-food check-in (M)

Cillian's "mindfulness around food" idea.

- **Coach:** build habits (name, how often, a short why) and group them into sets; assign a set to a client or a group. Ember ships a starter set for mindful eating that a coach edits. A relationship-with-food check-in is a form (step 3) on its own schedule.
- **Client:** habits on Today to tick, a streak for each, and their history; the check-in when due. A person with no coach can pick habits for themselves.
- **Rules:** wording is supportive and never about restriction. If answers suggest someone is struggling, the app points to support (Bodywhys in Ireland, Beat in the UK) and tells the coach only what the client has chosen to share. This wording needs advice before it ships.

#### 13. Small additions to the client's food side (S to M)

- Fibre on Today with a target (S).
- A Drinks group in the Add sheet: pints, bottles, glasses and measures (S).
- Eating out (M, needs a decision): a list of chains needs nutrition figures from somewhere. The honest options are each chain's published figures, entered with their source and date and marked as the chain's own; or leaving it to the menu photo and Claude's recalled figures, which are already labelled Recalled. Recommend starting with the ten chains Cillian's clients use most.

### Milestone 4: progress

#### 14. Physique (M)

- **Coach:** latest weigh-in, seven-day average, seven-day high and low, and the trend; body measurements over time (the coach chooses which: waist, hips, chest, thigh and so on); progress photos side by side by date.
- **Client:** the same weight figures; measurements entered in Progress or in a check-in; photos shared one at a time or as part of a check-in that asks for them, with a clear note of who will see them.
- **Data:** `measurements` (the client's rows); shared photos on private storage with access for the linked coach only, removed from the coach's view when the link ends or the client unshares.

#### 15. Training depth and the exercise library (M)

- **Coach:** per client, a simple view (sessions done against plan, records) or a full view (sets per body part per week, volume, graphs for each lift), switched by the coach. A Library of the coach's own exercise videos by link, attached to exercises in their programmes; the programme builder gains supersets and notes per exercise.
- **Client:** the coach's video and note on each exercise during a workout.

#### 16. Calendar, steps and cardio (M)

- **Coach:** the client's week: sessions planned and done, events, food logged, steps. Add an event or a call to the client's calendar as an offer. Set a daily step target and cardio (for example twenty minutes after training).
- **Client:** the step target and cardio on Today and in the Coach space; steps entered by hand until sync exists.

### Milestone 5: content and community

#### 17. The vault (M)

Cillian's "membership portal".

- **Coach:** folders of files, links and videos (how to manage a night out, what a calorie is), for all clients, a group or one client; order them into a short course if wanted.
- **Client:** the vault in the Coach space, with what is new marked.
- **Needs:** the storage decision. Video by link first.

#### 18. Group chat (L)

- **Coach:** a chat for a squad or for all clients, with the coach able to remove a message or a member, mute, and close it.
- **Client:** the chat in the squad or the Coach space; report a message; leave or mute.
- **Rules:** this is user-to-user content, which brings moderation duties (the UK Online Safety Act may apply). It needs terms, a way to report, and advice before launch. Recommend starting with announcements from the coach plus reactions, and opening replies after advice.

### Milestone 6: the business

#### 19. Coaches under one business (L)

- **Coach:** a business account with coaches under it. The head coach sees every client and every coach's workload; a coach sees their own clients. Clients are assigned and can be moved. Templates (forms, phases, habits, menus, supplement lists) are shared across the business.
- **Client:** sees their coach's name and the business's brand. Moving to another coach in the same business asks the client first.

#### 20. Payments and memberships (L)

- **Coach:** packages and subscriptions, a trial, a client's access to paid content ending when payment stops; income and retention figures.
- **Client:** pay by card, see what they are paying for, cancel easily.
- **Needs:** Stripe, pricing, and a check of Apple's rules before any payment is taken inside the phone app.

#### 21. The coach's brand (M)

- The business's name, logo and colours through the client's app. A separately listed app in the stores is a later question.

### Milestone 7: devices

- **Phone notifications** for messages, check-ins due and offers.
- **Live sync** with Apple Health and Health Connect (weight, steps, sleep, workouts), then Garmin. Cillian's point stands: it has to be dependable or not offered, so it is built and tested on real devices.
- **Health markers and cycle tracking**, as he said, later.

## Order and why

1. Steps 1 to 4 first: the frames, forms and getting a client in. Nothing else has a home without them, and forms are the base of check-ins.
2. Then 5 to 7: the weekly rhythm a coach lives in.
3. Then 8: phases, the feature that sets Ember apart from Trainerize.
4. Then 9 to 13, then 14 to 16.
5. Vault before group chat. The business steps wait on Stripe and pricing.

Steps 12 and 13 include changes every user gets, coached or not.

## How each step is checked

- Database rules for each new table, with the third-account test.
- A two-browser test of coach and client doing the step together, added to CI.
- Unit tests for anything that works out a figure (engagement score, weekly summary, menu scaling, suggested calories and their floors).
- Screens at 320 and 390 px and at desk width, light and dark.
- Cillian uses each step with a real client before the next begins.

## Questions for Cillian

1. Your consultation form and your weekly check-in, as they are today.
2. The names, lengths and purpose of your phases, and what changes between them.
3. Which measurements you take, and when you ask for photos.
4. What "behind" means for a general client and for a prep client.
5. Your mindful-eating habits and the relationship-with-food questions.
6. A sample menu of the week, and how you want it sized.
7. The ten chains your clients eat at most.
8. How your coaches and clients divide up, and what a head coach needs to see.
9. How clients pay now, and what the membership would include.
10. What is in your vault today.

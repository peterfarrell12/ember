# Coach plan

How Ember's coach side goes from the switched-off prototype to the best coaching app on the market. Written 25 November 2026. It replaces the one paragraph for Phase 7 in `docs/BUILD_PLAN.md`. The gym view (Phase 8) is not covered here.

## Round two: what Cillian asked for (26 November 2026)

The detailed build plan that follows from this round, with a coach side and a client side for every step, is in `docs/COACH_BUILD_PLAN.md`.

Cillian is the business partner and a working coach with other coaches under him. He walked through the two tools he uses, 1FIT and Trainerize, and his judgement leads this round. His verdict in one line: **1FIT is the better tool for the coach and worse for the client; Trainerize is the reverse. Ember has to be both.**

### What he said, and what follows from it

| Cillian's point | What Ember must do |
|---|---|
| Adding a client in Trainerize is one step: enter them, they get an email, create an account, the consultation form arrives by itself, and they are in | Add a client by email. The consultation form is sent automatically. No waiting room the coach has to manage by hand |
| 1FIT makes the coach accept, park people in "prospects" and send the form manually: "so strange and so weird" | Prospects are only people who have applied and not yet been accepted. Nothing manual after acceptance |
| The coach's side bar is right: clients, check-ins, messages, templates, library, forms | Build the coach workspace around exactly those, on a wide screen first |
| One overview per client: last check-in, last weigh-in, engagement, photos | A client overview with an engagement score, what is behind, and one-tap Message |
| The phases roadmap is "savage", and Trainerize does not have it: named phases over a year, and each completed week fills in average weight, calories against target and steps against goal, with notes and milestones | Build phases. This is the headline feature of the round |
| Physique: latest weigh-in, seven-day average, high and low. The layout in 1FIT is poor | Weight card with those four figures, body measurements, and photos, laid out better |
| Training data (sets per body part, lift graphs) is too much for general clients and essential for prep clients | Show the depth per client: a simple view by default, the full view when the coach switches it on |
| Nutrition, hydration and caffeine targets; plans built in the app | Ember already holds the diary itself, so no syncing from another app. Add targets by training and rest day, and a meal plan the coach builds or attaches |
| 1FIT "corrects" calories synced from MyFitnessPal and clients do not understand why their number changed | Never show a client a different number from the one their coach sees. Ember's own diary and its source labels already give one figure |
| Supplement templates, useful for athletes | Build supplement plans from templates |
| Step and cardio targets | Coach sets a step target and cardio; the client sees them |
| Sleep, physical state, mental readiness, health markers; a cycle tracker later | The daily check-in covers the first three. Health markers and cycle tracking come later |
| A vault of resources | Build a vault: files, links and videos a coach shares with all clients or one |
| Check-ins with overdue status | A check-ins inbox across all clients: due, overdue, to answer, streaks |
| 1FIT's wearable syncing is unreliable (Garmin, Fitbit, Apple Watch) | Sync has to be dependable or not offered. Apple Health and Health Connect first, tested on real devices |
| Trainerize is nicer for clients: goals and habits, the calendar of what they logged, a meal plan as a PDF, progress | A "Coach" space in the client's app that gathers the plan, the phase, habits, the check-in, messages and the vault in one place |
| Trainerize's AI meal planner is too American | Ember's planner already uses Irish and UK food. Let the coach edit its plan and send it |
| He runs several coaches | A business account with coaches under it, and clients assigned to a coach |
| He has his own branded app | The coach's brand on the client's app, beyond the name and colour that exist now |

### Where Ember stands against that list

| Area | Today |
|---|---|
| Client list with who needs a look | Built |
| Invite, sharing by area, pause and end | Built. By link or code only: no invite by email |
| See the client's app, read-only | Built |
| Programmes and targets as offers | Built. Targets are calories and protein only |
| Weekly check-in with figures filled in and an AI draft reply | Built. Text questions only, no overdue tracking, no inbox across clients |
| Messages | Built, slow (up to 20 seconds), no inbox across clients on a wide screen |
| Coach's page and applications | Built |
| Daily tasks | Built. Fixed list, not custom habits |
| Food diary, water, caffeine, weight trend, training log, rehab | Built on the client's side, and visible to a coach through "see their app" |
| Engagement score and ledger | Not built |
| Phases roadmap | Not built |
| Consultation form and custom forms | Not built |
| Body measurements; photos shared with a coach | Not built (photos are hidden when signed in) |
| Sets per body part and lift graphs in the coach's view | Partly: the client has trends; the coach sees them only through "see their app" |
| Meal plan from a coach; targets by training and rest day | Not built |
| Supplements, step targets, cardio targets | Not built |
| Vault and exercise video library | Not built |
| A "Coach" space for the client | Not built: what a coach sends is spread across Today, You and Messages |
| Live wearable sync | Not built |
| Coaches under one business; payments; a branded app | Not built |

### The build order for this round

Every step works on the web at desk width and on a phone, from the same code, and ends with something Cillian can use with a real client.

| Step | What gets built | Why here |
|---|---|---|
| A. The coach workspace | The side bar he described (Clients, Prospects, Check-ins, Messages, Templates, Library, Forms) and a client page with its own menu (Overview, Calendar, Phases, Physique, Training, Nutrition, Habits, Vault). The existing screens move into it | Everything else hangs off this frame |
| B. Getting a client in | Add by email; forms with question types (text, number, scale, choice, photo); a consultation form sent by itself on joining; prospects for applicants only | His first complaint, and every client meets it first |
| C. Overview and check-ins | Engagement score and ledger, tiles for weight, check-in, training, nutrition, steps and last message, alerts with Message and Dismiss; a check-ins inbox with due and overdue | What he opens every day |
| D. Phases | Named phases on a timeline, an active phase, weekly averages filled in from the diary against the targets, notes and milestones; the client sees their roadmap | What he called the best thing in either tool |
| E. Physique | Latest weigh-in, seven-day average, high and low; body measurements; progress photos shared with the coach on private storage | Coaches judge progress here |
| F. Nutrition and supplements | Targets by training and rest day, with carbohydrate and fat; a meal plan the coach edits from Ember's planner or attaches as a file; supplement templates; step and cardio targets | Completes what a coach prescribes |
| G. The client's Coach space | One place in the client's app for the plan, phase, habits, check-in, messages and vault; custom habits | Keeps Ember the friendlier app for clients |
| H. Training depth | Sets per body part and lift graphs in the coach's view, switched on per client | Needed for prep clients, noise for others |
| I. Vault and library | Files, links and videos for all clients or one; the coach's own exercise videos by link | Needs a decision on storage cost for uploads |
| J. The business | Coaches under one business with clients assigned; payments; the coach's brand | Needs Stripe and decisions on price |
| Later | Live wearable sync (needs real devices), health markers, cycle tracking | |

### Questions for Cillian before step B

1. What is in your consultation form today? Send the form itself.
2. What does your weekly check-in ask, and which answers do you read first?
3. Which body measurements do you take, and how often are photos?
4. How do your coaches and clients divide up: does a client belong to one coach, and what should a head coach see?
5. For a general client, which of the 1FIT menus do you never open?
6. What do you send as a meal plan now: a PDF, and built in what?
7. How do clients pay you today?
8. Which wearables do your clients use most?

## Where it starts

The prototype already has about 2,600 lines of working coach screens, switched off behind `FEATURES.coach`:

- a coach home that puts the clients who need a look first, with the reason
- a client workspace: food, training, recovery, weigh-ins, check-ins, sessions logged on the gym floor
- assigning a programme, targets, daily tasks and a rehab plan
- messages with quick replies and AI-drafted messages
- progress photos a client shares one at a time
- a coach profile with qualifications, plans and a catalogue (sample coaches, labelled as sample)

What it lacks is everything that makes it real: a coach and a client are not two accounts, nothing is enforced by the database, there are no payments, and there is no desktop layout.

## What "best" means

Six things no competitor has together. The research behind this is in `reports/`.

1. **The client's data arrives by itself.** HubFit, Kahunas, Everfit, 1FIT and Trainerize all depend on the client filling things in. Ember clients log by voice and photo for free, so a coach sees real food, training and recovery without chasing.
2. **A morning brief that does the admin.** A ranked list of who needs attention and why, with a message already drafted for each. The coach edits and sends. Nothing is ever sent in the coach's name without the coach pressing send, and every draft is marked as a draft.
3. **See exactly what the client sees.** A coach opens a client's Today, Train and Progress screens as the client sees them, read-only.
4. **Audience, members and clients in one app.** A free squad for a whole following, a paid programme for many, and one-to-one coaching for a few. The others only reach the people who already pay.
5. **A game the coach can aim.** The coach sets this week's quest or challenge for a client or a squad. Competitors stop at streaks and badges.
6. **Honest data and real consent.** Every figure says whether it is from a database, a label or an estimate. The client chooses what a coach can see, area by area, and can stop sharing at any time. Photos stay opt-in per photo.

## One app, phone and desktop

There is one codebase and it stays that way. The coach side is the same app in a different mode, so everything built for it runs on the web, on iPhone and on Android.

- **Phone:** the coach view as the prototype has it, with its own tab bar. For the gym floor and replying on the move.
- **Desktop web:** a wide layout at the same address for coaches at a desk: client list on the left, the client in the middle, messages and notes on the right. The app today is a single 520 px column, so this layout is new work. The screens inside it are the existing ones.
- **Reuse:** "see what the client sees" reuses the sample-preview mechanism the app already has, which swaps in another set of data and blocks all saving. The programme editor, exercise library, food sheets, charts, check-in and message screens are shared between both sides. The coach side adds a layout and a few screens, not a second app.

## How each part of the app links to the coach

| The member's side | What the coach gets |
|---|---|
| Food diary | The day as logged, with source labels; a comment on a meal |
| Targets | Coach proposes, client accepts; history of changes |
| Meal plan and recipes | Coach edits a plan and sends it; a shared recipe book |
| Training programme | Coach builds and assigns; results come back set by set, with records |
| Calendar | Coach schedules sessions and calls; sees matches and events |
| Rehab and recovery | Coach assigns a plan; pain reports reach the coach. General guidance, never diagnosis |
| Daily check-in, sleep, recovery | Feeds the morning brief |
| Weight and progress | Trend and milestones; photos only when shared |
| Weekly review | The same review, with the coach's notes added |
| Quests, bosses, streaks | Coach sets a quest or challenge; sees who is slipping |
| Squads | The coach's own squad, group challenges, a message to everyone |
| Assistant | "Message my coach" for the member; "who needs me today?" for the coach |
| Reminders | A nudge the coach can trigger |
| Diary import | A new client arrives with their history |
| Sharing cards | The coach's name on a client's card, if both agree |

## The steps

Each step ends with something a real coach and a real client can use. Each has database rules proved by tests, as every table so far has.

| Step | What gets built | Done when |
|---|---|---|
| 1. Two real accounts | Coach profile; invite by link or code; the client chooses what to share (food, training, weight, recovery) and can pause or end it; the coach reads only what is shared, through the server | A coach invites a client, the client accepts, and the coach sees that client's real app, read-only. A second coach sees nothing |
| 2. The coach desk | Morning brief from real signals; client list with tags and private notes; the wide desktop layout | A coach with twenty clients can see in one screen who to deal with first, on a laptop and on a phone |
| 3. Assigning work | Programmes (builder, templates, AI-written, exercise videos by link), targets, habits, quests; the client accepts or declines; a coach's library | A coach builds a programme once and assigns it to five clients; results come back |
| 4. Messages | One thread per client, voice notes, attachments, AI drafts, a message to a group; phone notifications | A coach and a client hold a conversation with notifications on both phones |
| 5. Check-ins | Forms the coach designs, on a schedule; the week's numbers filled in from the diary; an AI summary for the coach; feedback by text, voice or a video link | A weekly check-in takes the client two minutes and the coach one |
| 6. Groups and programmes for many | A programme published to a squad; group challenges and boards; announcements | A creator runs one programme for a thousand followers from one screen |
| 7. Payments | Clients pay the coach by card: subscriptions, packages, trials. Coaches pay Ember, if there is a charge | A coach is paid by a client through Ember |
| 8. The business side | A public coach page with an application form; onboarding steps that run themselves; team seats; figures on adherence, retention and income | A new client goes from the coach's link to their first session without the coach doing anything by hand |
| 9. The coach's brand | The coach's name, logo and colour in the client's app | A client's app looks like their coach's |

Steps 1 to 3 need no outside accounts and no money. Step 4's notifications need the Apple and Google developer accounts. Step 7 needs a Stripe account.

## Where it stands (25 November 2026)

| Step | State |
|---|---|
| 1. Two real accounts | Done. Invite by link or code, sharing by area, pause and end, "see their app" read-only. Tested with two browsers against a local database |
| 2. The coach desk | Done: clients who need a look first, private notes, the two-pane desktop layout, a drafted message for a flagged client. Not done: tags |
| 3. Assigning work | Done: programmes, targets (both offered, accepted or declined), daily tasks, rehab plans. Not done: quests set by a coach, exercise videos |
| 4. Messages | Working through the link, with AI drafts. A message can take up to about 20 seconds to appear. Not done: voice notes, attachments, phone notifications (these need the Apple and Google accounts) |
| 5. Check-ins | Done: questions on a schedule, figures filled in from the diary, Claude's summary and draft reply, the coach's reply back |
| 6. Programmes for many | Done: a programme and a pinned note for a squad. Group challenges and boards were already there |
| 7. Payments | Not started. Needs a Stripe account and the owner's decisions on price and fees |
| 8. The business side | Done: a coach's page and applications; a welcome message and the weekly check-in sent to each new client by itself. Not done: team seats, income figures |
| 9. The coach's brand | Done in small: the coach's name and colour in the client's header. Not done: logo, a fully branded app |

Also not done: sharing a progress photo with a coach on real accounts (hidden until it is built on private storage), and the legal wording for sharing with a coach, which needs advice.

## What has to be decided, and by whom

These are the owner's. Recommendations are given where there is one.

| Decision | Recommendation |
|---|---|
| What coaches pay | Decide after step 3, from real use. For reference: 1FIT is £40 to £295 a month, Trainerize from $9 to $248 with add-ons, and both charge by client count. A free tier for a coach's first few clients would stand out |
| A cut of client payments | Decide with step 7. Stripe charges per payment; Ember could add a small fee or none |
| When this starts | Steps 1 to 3 can start now, behind the existing switch, while the free app goes to the stores |
| Consent wording for sharing with a coach | Needs proper advice. Health data shared between two people needs its own clear consent, separate from the sign-up tick |
| The coach's legal position | Needs advice: a coach holding clients' health data has duties of their own, and Ember's terms must say who is responsible for what |
| Checking a coach's qualifications | The prototype shows "trust checks". Decide who checks them, or show them as stated by the coach and not verified |
| Reviews of coaches | Real ones only, from real clients, or none at launch |
| AI use by coaches | A coach's drafts and summaries cost more than a member's logging. Set a separate allowance |
| Exercise videos | Links to the coach's own videos first. Hosting video costs money each month |
| Apple's rules on taking payment | One-to-one coaching can usually be sold outside Apple's payment system; programmes sold to many usually cannot. Check the current rules before step 7 |

## What stays true throughout

- A coach never writes into a client's diary. What a coach assigns is offered, and the client's app applies it.
- Nothing fake is presented as real: sample coaches stay labelled, AI drafts stay labelled, and no reviews are invented.
- The client can see at any time exactly what their coach can see, and stop it.
- Progress photos are shared one at a time, by the client.
- Rehab content is general guidance.
- No trackers, and health data stays in the EU apart from AI requests.

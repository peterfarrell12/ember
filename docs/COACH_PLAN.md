# Coach plan

How Ember's coach side goes from the switched-off prototype to the best coaching app on the market. Written 25 November 2026. It replaces the one paragraph for Phase 7 in `docs/BUILD_PLAN.md`. The gym view (Phase 8) is not covered here.

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

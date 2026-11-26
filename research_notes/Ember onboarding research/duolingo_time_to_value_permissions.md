# Best-in-class onboarding outside calorie tracking; evidence on time to value, delayed sign-up and permission timing (2025 to 2026)

Research date: 26 November 2026. Evidence grades used throughout:

- **[EXPERIMENT]** a controlled test reported by the company that ran it (or by a named partner), with what changed and what moved
- **[CORRELATION]** observational company data, no control group
- **[VENDOR]** benchmark or claim from a company that sells onboarding, push, paywall or auth tooling
- **[TEARDOWN]** a third party's screen-by-screen description of an app; no outcome data
- **[GUIDELINE]** platform owner or usability-research guidance
- **[OLD]** published before 2022; kept because it is the primary source and nothing newer replaces it

Reliability note for the report writer: almost every hard number in this field is either pre-2022 or vendor-published. The post-2022 measured experiments I could verify are Headspace/Irrational Labs (2026), Everlove/RevenueCat (2026), Monzo US, and Duolingo's ongoing but mostly unquantified statements. Duolingo's famous delayed sign-up figures date from tests run roughly 2013 to 2017.

---

## 1. Duolingo: first open to first lesson, when sign-up is asked, and what its tests reported

### Takeaway
Duolingo lets a new user answer a few set-up questions and complete a lesson before any account is requested, then asks with a dismissible "soft wall" and only later a hard wall; its growth lead attributed about +20% DAU to moving sign-up back and a further +8.2% DAU to tuning soft and hard walls. Those figures are from a 2017 interview about earlier tests; Duolingo has published far less numeric detail on onboarding since, and its 2018 to 2022 growth story (Mazal) credits leaderboards, streaks and notification discipline, not onboarding.

### Cited Findings

**Business model:** freemium. Free tier with a paid subscription (Super Duolingo, previously Duolingo Plus). The onboarding's job is habit formation and daily active use, not immediate payment. — [Lenny's Newsletter, Mazal, Feb 2023](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)

**Delayed sign-up and walls [EXPERIMENT][OLD]**
- Gina Gotthilf (then VP Growth): "Simply moving the sign-up screen back a few steps led to about a 20% increase in DAUs." Letting people do a lesson without an account "increased sign-up metrics significantly". The first test predated her arrival (she joined in 2013). — [First Round Review, 17 Jul 2017](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Later iterations on "soft walls" (optional sign-up prompts with a "Later" option) and "hard walls" (sign-up required to continue) together "yielded an 8.2% increase in DAUs", about three years after the first test, on a much larger base. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Replacing a large "Discard my progress" button with a quiet "Later" button "moved the needle"; no number given. Soft walls that people dismiss are said to prime the later hard wall: without them the hard wall performs "significantly worse". — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- A sign-up badge (reward for registering) had no effect and was killed. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Caution: figures such as "sign-up rate 10% to 12%" in secondary write-ups are illustrative or simulated, not Duolingo's. — [DataInterview case (simulated)](https://www.datainterview.com/ab-testing-lab/delayed-signup); [Substack write-up](https://datapulseweekly.substack.com/p/how-duolingo-skyrocketed-its-growth)

**Other tests from the same interview [EXPERIMENT][OLD]**
- App-icon red dot (badge): +6% DAU from about six lines of code; a second version +1.6% DAU. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Streak reminder timing settled at 23.5 hours after the last session; winning notification copy alone +5% DAU. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- "Weekend Amulet" (streak protection over a weekend): D7 retention +2.1%, D14 +4%. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Achievement badges V1: +2.4% DAU, session starts +4.1%, +13% store purchases, +116% friends added. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- In-lesson coach with growth-mindset copy: +7.2% D14 retention. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Testing rules of thumb: about 100,000 DAU needed to A/B test small effects; new apps "should focus on A/B tests that bring a 20–30% increase"; launch threshold about 1%. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)

**Placement test [EXPERIMENT], 2021**
- In Japan, experienced learners avoided the placement test, started at the beginning, found it too easy and quit ("The word 'test' scares me"). Rewording "take a placement test" to "check your English level" doubled placement tests taken and increased retention; run globally it improved placement completion and retention in all markets (no global figures given). — [Duolingo Blog, 2 Feb 2021](https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments)

**Notification opt-in [company statement], 2021**
- Japanese learners were 50% less likely to opt into reminders. Duolingo says notifications are among the biggest factors in habit formation, and ran global experiments "moving the opt-in prompt to a more effective spot, changing the opt-in pitch, and adding prompts in new contexts" such as leaderboard promotions and running out of hearts. No results published. — [Duolingo Blog, 2 Feb 2021](https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments)
- A third-party capture shows a mascot speech-bubble screen with a "Remind Me to Practice" button leading into the system notification prompt (a pre-prompt). Its position in the flow is not stated. — [ScreensDesign teardown](https://screensdesign.com/articles/duolingo-onboarding-design/) [TEARDOWN]

**Registration friction [company data], 2021**
- In Vietnam, new-learner registration was about 15% below the world average; under-13s (a privacy-driven flow) registered at 62% versus 90% for everyone else. So roughly 90% of new learners outside that flow did eventually register, with sign-up placed after value. — [Duolingo Blog, 2 Feb 2021](https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments)

**Growth story 2018 to 2022 (Mazal) [EXPERIMENT + model], 2023**
- DAU grew 4.5x in four years. The lever was Current User Retention Rate (CURR): in Duolingo's growth model CURR had about 5x the DAU impact of the next-best metric. CURR rose 21%, cutting daily churn of the best users by over 40%. — [Lenny's Newsletter, 28 Feb 2023](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Failed: a Gardenscapes-style "moves counter" (no retention or DAU change, team disbanded); a referral programme (+3% new users only). — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Leaderboards: overall learning time +17%; highly engaged learners roughly tripled; D1 and D7 retention improved significantly. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Push: guiding rule was "protect the channel"; raising volume needed CEO approval; opt-outs are effectively permanent (Groupon's email cited as the cautionary tale). "Dozens" of small wins from timing, copy, images, localisation and a bandit algorithm; no per-test figures. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Streaks: reaching a 10-day streak "substantially" reduces drop-off, which Mazal himself flags as possibly correlation and selection. First big streak win was a late-night streak-saver notification; later calendar view, animations, streak freeze, streak rewards (no figures). Share of DAU with a 7+ day streak rose almost 3x to over half. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- Streak Wager test: D7 retention +14% (from a search summary of Duolingo's own streak post; I did not open the post). — [Duolingo Blog, streaks](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/)
- A Dec 2024 Lenny's Podcast episode with Jackson Shuttleworth (Group PM, Retention) calls streaks Duolingo's most important growth lever. Not opened; no figures taken from it. — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/duolingo-streaks)

**Flow as described by third parties [TEARDOWN]**
- Sign-in is not required to start; mobile set-up is 7 steps including a prior-knowledge step and course overview; web is 6 steps and begins with "what brought you to Duolingo"; optional profile creation is a separate 4-step flow after the lesson. — [UserGuiding, updated 28 Feb 2024](https://userguiding.com/blog/duolingo-onboarding-ux)
- The sign-up screen appears after the first lesson. — [Medium teardown](https://medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020); [Taplytics](https://taplytics.com/blog/duolingo-ab-test-onboarding)

**Recent direction**
- Duolingo's Q4 2025 earnings call discussed a 2026 push to reduce friction in the free experience (from a search summary; not opened). — [Yahoo Finance](https://finance.yahoo.com/news/duolingo-q4-earnings-call-highlights-041400802.html)

### Inferences
- The order Duolingo converged on is: pick course, a few motivational and level questions, optional placement check, first lesson, reminder pre-prompt, then soft sign-up wall, then hard wall after more use. The value moment (a completed lesson) comes before every ask that can be refused permanently.
- The two delayed sign-up numbers are DAU lifts, not sign-up-rate lifts, and they come from a product whose core loop needs no account. They show direction, not a transferable size.
- Duolingo treats copy as a first-class variable: "test" versus "check your level", "Discard my progress" versus "Later". Small wording changes moved core metrics.
- Since 2018 Duolingo's published emphasis is retention of existing users; a reader should not credit onboarding with the 4.5x DAU growth.

### Gaps
- No Duolingo-published figure for the notification pre-prompt's effect on opt-in, nor its exact position in the 2025 to 2026 flow. I found no primary source.
- No Duolingo-published lift for the daily-goal screen or for introducing the streak on day one. The claim that the placement test "reduced Day-1 churn by 12%" (attributed to a GDC 2023 talk in a third-party teardown) could not be verified and should not be used.
- The current flow was not captured first hand; teardowns found are 2024 or undated.
- The First Round article does not mention the placement test at all.

---

## 2. Headspace, Calm, Blinkist: questions, paywall and sign-up position, published experiments

### Takeaway
All three are subscription businesses that put the paywall inside onboarding and (unlike Duolingo) generally ask for an account before any content. Their best published experiments are about what happens around the ask: Calm's prompt to set a reminder right after the first session, Blinkist's honest trial timeline with a reminder, and Headspace's 2026 quiz test, which doubled course starts but did not increase days meditated.

### Cited Findings

**Headspace** (subscription with free trial; has moved to locking most or all content)
- Flow in one capture: welcome (log in, create account, or work benefit) → account creation (email or social, password checklist) → 4 question steps (primary goal, priority area, difficulty, additional goals) → recommendations → paywall with a 14-day trial shown as a timeline, annual/monthly toggle → notification warm-up screen ("Yes, notify me" / "Not right now") → iOS system prompt. Sign-up is before the questions; no guest path shown. Exiting mid-flow shows a "progress will be lost" modal. Capture date not stated. — [ScreensDesign](https://screensdesign.com/apps/headspace-meditation-sleep/?ts=0&vt=1&id=908&av=1821) [TEARDOWN]
- **[EXPERIMENT]** Irrational Labs with Purchasely tested five onboarding variants on new free-trial users: control; "default to basics" (same course, no questions); "perceived fit" (questions, same basics course); "personalised fit" (questions, matched course); "precommitment" (plan how, when and where to meditate). Course starts rose from about 31% to about 63%. Asking questions beat no questions by 7.6 percentage points (significant) even though the recommended course was identical. Actually matching the course added nothing more. Precommitment raised app opens 7.5% and distinct open-days 4%, fading after 2 to 3 days. Active meditation days did not differ significantly in any arm. Sample size not reported. — [Irrational Labs case study](https://irrationallabs.com/case-studies/headspace-doubled-course-starts/)
- Authors' explanations for the null on meditation: users could not find their course on returning; course content did not match expectations of short breathing exercises; matching over-weighted sleep. Their conclusion: habit needs design "across the full experience, not just during onboarding". — [Irrational Labs](https://irrationallabs.com/case-studies/headspace-doubled-course-starts/)
- **[EXPERIMENT, unquantified]** Headspace tested locking content: conversion rose while engagement and retention held; later a 100% locked test produced "a significant increase in paid subscribers and higher engagement". In an A/B test, users on a free trial showed higher content engagement ("skin in the game"). No figures given. — [RevenueCat Sub Club, 14 Jun 2023](https://www.revenuecat.com/blog/growth/podcast-shreya-oswal-keya-patel-headspace)
- Unverified secondary claims: that Headspace cut onboarding to 3 questions after seeing a 38% drop-off; that it made "week two" its focal measure and removed the first-session meditation from onboarding. — [raw.studio](https://raw.studio/blog/how-headspace-designs-for-mindfulness/) (low authority; treat as anecdote)

**Calm** (subscription; limited free content; paywall early)
- **[EXPERIMENT][OLD][VENDOR-published]** Users who set a daily reminder retained almost 3x better, but under 1% found the setting, so selection was likely. Calm then showed a prompt to set a reminder after the first completed meditation to a share of new users: 40% of those who saw it set one, and they showed an "equal boost in retention", which Calm read as causal. No sample size, window or significance published; an Amplitude commenter says the lift held 12+ weeks. Dates to about 2016 to 2017. — [Amplitude case study](https://www.amplitude.com/case-studies/calm); [Amplitude blog](https://amplitude.com/blog/calm-increased-retention-amplitude)
- Flow descriptions conflict. One says two paywalls back to back before any content and a third after sign-in; another puts the paywall at about 54 seconds, after account creation; another says goals and experience are asked before premium prompts; one critique says a system permission is requested at about 6 seconds, before any value. Some pages may describe a different Calm app. — [ScreensDesign article](https://screensdesign.com/articles/calm-onboarding-design/); [Appcues GoodUX](https://goodux.appcues.com/blog/calm-app-new-user-experience); [RevenueCat](https://www.revenuecat.com/blog/growth/app-value-paywall) [TEARDOWN]

**Blinkist** (freemium with a 7-day trial of Premium)
- **[EXPERIMENT]** Problem: the top complaint was people who forgot to cancel the trial. In 2020, after research and about six weeks of iteration, Blinkist changed the trial paywall to a timeline: full access today, a reminder about two days before the trial ends, charge on day seven. Reported results: trial conversion +23%, paid conversion +4%, complaints −55%, push opt-in from 6% to 74%. — [Purchasely write-up](https://www.purchasely.com/blog/blinkist-paywall-transformation-revolutionizes-app-user-engagement), citing the original by the Blinkist designer on [UX Planet](https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b)
- The same numbers recur in a RevenueCat Sub Club talk by former Blinkist designer Jaycee Day ("How Ethical Design at Blinkist Led to 23% Growth") and in newsletters; one adds that 33% of cancellations happened on day zero. — [Sub Club episode](https://metacast.app/podcast/sub-club-by-revenuecat/DlWjuiPD/how-ethical-design-at-blinkist-led-to-23-growth---jaycee-day/IiL4Mf8f); [B2B Pricing Insights, Feb 2024](https://b2bpricinginsights.substack.com/p/4-min-read-how-blinkists-new-paywall)
- Why the opt-in jump matters: the notification ask was tied to a concrete benefit the user wanted (a warning before being charged), at the moment it was relevant.
- Replication is mixed. One indie developer (Slopes) who copied the reminder pattern saw a 7.8% decrease over two weeks among those who requested the notification and turned it off. Another team reports +23 to 25% trial starts with no conversion drop. — [Slopes Diaries #39](https://blog.curtisherbert.com/slopes-diaries-39-risky-business/); [Indie Hackers](https://www.indiehackers.com/post/tip-increase-trial-signups-by-notifying-users-when-their-trials-are-about-to-end-51d2e789bf)
- Trustpilot still carries complaints about missing renewal reminders (March 2026). — [Trustpilot](https://www.trustpilot.com/review/blinkist.com?page=3)

**Category context [VENDOR]**
- Adapty, across subscription apps, Nov 2025 to Oct 2026: 14 of 20 top apps put the first paywall at the end of onboarding; 48% of top apps include a sign-up screen in onboarding and 39% a permission warm-up screen; Health & Fitness completes only 65.1% of onboarding opens versus 79.4% for the median app. — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/report/)

### Inferences
- In hard-paywall and trial apps the onboarding quiz is doing sales work (perceived fit) more than personalisation: Headspace's own test shows the questions lifted starts even when the answer changed nothing.
- A first-session win is not a habit. Headspace doubled starts without moving days of use; Calm moved retention by attaching a recurring cue (a reminder) to the first completed session.
- Blinkist's result is the cleanest published case that being candid about charges raised both conversion and trust measures, but it is one company, self-reported, 2020.

### Gaps
- No primary, dated source for the number of onboarding questions in Calm or Blinkist, or for Blinkist's sign-up position.
- No sample sizes for Headspace, Calm or Blinkist experiments.
- No Headspace-published account of its onboarding redesigns beyond the Irrational Labs study and the RevenueCat interview.

---

## 3. "Aha moment" and activation metrics: published figures and how reliable they are

### Takeaway
The famous activation numbers are executive anecdotes drawn from correlational data, mostly from 2009 to 2015; the people who popularised them and later analysts say the specific numbers are arbitrary and the causal direction unproven. The defensible use is as a team focus that must then be tested by nudging people toward the action and seeing whether retention follows (as Calm did).

### Cited Findings
- Facebook "7 friends in 10 days": a predictive, not causal, finding ("strong positive predictive value for 2 month retention"). — [Amplitude, 2014](https://amplitude.com/blog/2014/07/29/find-the-key-to-your-apps-growth-without-an-army-of-data-scientists/) [OLD]; [Andrew Chen](https://andrewchen.com/my-quora-answer-to-how-do-you-find-insights-like-facebooks-7-friends-in-10-days-to-grow-your-product-faster/) [OLD]
- Critique 1 (Benn Stancil, Mode, 2015): magic numbers are round numbers, not tipping points; they average over very different users; a level with very high retention may be reached by few retained users (in his sample data 28.8% retained at 1+ message, 42.4% at 2, 91.7% at 10+, yet the right target was "two messages" because most retained users never reached 8 to 10); correlation is not causation, so push users toward the action and check whether retention rises. — [Mode](https://mode.com/blog/facebook-aha-moment-simpler-than-you-think/) [OLD]
- Critique 2 (Mixpanel): the numbers "aren't the product of rigorous math"; it could as well have been "10 friends in 12 days". — [Mixpanel, "Magic numbers are an illusion"](https://mixpanel.com/blog/magic-numbers-are-an-illusion/)
- Slack's "2,000 messages" (with a 93% retention figure) circulates through secondary sources as a first-party executive statement, not a published analysis; teams that send 2,000 messages may simply be teams that already had the use case. — [Koji guide](https://www.koji.so/docs/aha-moment-research) (secondary); [Mode](https://mode.com/blog/facebook-aha-moment-simpler-than-you-think/)
- Duolingo: a 10-day streak "substantially" lowers drop-off; the author flags correlation and selection bias himself. — [Lenny's Newsletter, 2023](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth) [CORRELATION]
- MyFitnessPal "First Four" (Sept 2026): members who log at least four days in their first week are "7 times as likely" to make progress toward weight-loss goals and "more than double" as likely to still be logging after a year, "based on internal data"; they are about a quarter of the base but 64% of weight loss and nearly 70% of meal logs. No period, sample, definition of progress or controls; published alongside a contest that requires four logged days. — [MyFitnessPal corporate blog, 10 Sep 2026](https://news.myfitnesspal.com/the-four-day-habit-behind-one-of-myfitnesspals-biggest-success-predictors/) [CORRELATION, marketing]
- Calm is the counter-example where a correlation was then tested: reminder-setters retained about 3x; a prompt was randomised; prompted users showed the same boost. — [Amplitude](https://www.amplitude.com/case-studies/calm) [EXPERIMENT][OLD]
- Canva: activation defined as completing a first design, not signing up. — [Appcues](https://www.appcues.com/blog/aha-moment-examples) [VENDOR]
- Adapty's own caveat on "finishers convert 20x leavers" (trial start 5.47% vs 0.24%): correlation, not cause. — [Adapty](https://adapty.io/state-of-onboarding/report/) [VENDOR]
- B2B SaaS activation benchmark: mean 37.5% (62 companies), median about 37%. Not consumer mobile. — [Userpilot benchmark report](https://userpilot.com/blog/product-metrics-benchmark-report/) [VENDOR]

### Inferences
- For a food-logging product the natural candidate activation event is "logged food on N of the first 7 days". MyFitnessPal's own choice (4 of 7) is a useful prior but is unverified marketing and confounded by motivation.
- Stancil's rule is the practical one: choose the lowest threshold most retained users reach and most churned users do not, then test it by prompting.

### Gaps
- Strava: I found no Strava-published activation or first-activity retention figure. Only its help centre framing ("set up your account, pair a device, and record your first activity") — [Strava Support](https://support.strava.com/hc/en-us). Third-party claims were low quality and are not used.
- I did not retrieve the original Chamath Palihapitiya talk or Stewart Butterfield's First Round interview, so the Facebook and Slack numbers above rest on secondary citations.
- No peer-reviewed study of activation-metric validity was found.

---

## 4. Sign-up walls: account before versus after first value; sign-in method and completion

### Takeaway
Usability research and platform guidance consistently say show value before requiring an account unless the product is inherently personal, and Duolingo's tests are the best-known measured support; but controlled public A/B results are scarce, old, or from vendors. Evidence comparing email-and-password, magic link and Sign in with Apple is almost entirely vendor-reported and should be treated as directional only.

### Cited Findings

**Guidance**
- NN/g: login walls carry "significant interaction cost"; forcing an account before access "is only justified in rare cases"; justified where the app is highly personal (email, banking) or the benefit is evident before logging in; rule of thumb is reciprocity (give value first). Qualitative usability findings, no numbers. — [NN/g, Budiu, 2 Mar 2014](https://www.nngroup.com/articles/login-walls/) [GUIDELINE][OLD]; [NN/g video](https://www.nngroup.com/videos/login-walls/)
- NN/g mobile checklist: think twice before forcing registration on mobile; explain what an account gives; offer social or Google sign-in. — [NN/g checklist](https://www.nngroup.com/articles/checklist-registration-login/) [GUIDELINE]
- Android design guidance: "typically you will need to show the value of the app before asking for device permissions or to create an account"; an up-front wall has "a higher risk of losing users before they experience the app". — [Android Developers, onboarding patterns](https://developer.android.com/design/ui/mobile/guides/patterns/onboarding) [GUIDELINE]

**Measured**
- Duolingo: sign-up moved after the first lesson, about +20% DAU; soft/hard wall tuning +8.2% DAU; roughly 90% of non-under-13 new learners register. — [First Round Review, 2017](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker) [EXPERIMENT][OLD]; [Duolingo Blog, 2021](https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments)
- Monzo US (a product where an account is unavoidable): redesigning sign-up lifted conversion from 9% to 40% and cut time to sign up from 17 minutes to 9 overall (4 for the best customers); rolled to 25% of sign-ups first. Shows that when a wall is mandatory, time and effort inside it are the lever. — [Monzo blog](https://monzo.com/blog/how-we-cut-time-to-sign-up-for-monzo-us-from-17-minutes-to-4-minutes) [EXPERIMENT]
- Monzo UK treats identity checks as an ongoing process that starts at sign-up and continues, a regulated form of progressive profiling. — [Monzo blog, 2017](https://monzo.com/blog/2017/11/03/simple-signup-kyc) [OLD]
- Google Play case: Eyecon improved registration conversion by 30% after reducing explanatory steps. — [Google Play Console case study](https://play.google.com/console/about/eyecon-casestudy/) [EXPERIMENT, platform-published]
- Counter-pattern: Headspace asks for an account first, then questions, then paywall; no published test of that order. — [ScreensDesign](https://screensdesign.com/apps/headspace-meditation-sleep/?ts=0&vt=1&id=908&av=1821) [TEARDOWN]
- Limits acknowledged by practitioners: apps whose core function depends on identity may need up-front login. — [Business of Apps / Phiture](https://www.businessofapps.com/?p=77306)

**Sign-in method (all [VENDOR] or secondhand)**
- Calendly: registration completion 43% to 71% after switching to magic links, mobile about 3x better; documented by an auth vendor (SuperTokens, 2024) and labelled low-confidence by the site reporting it. — [SignupDrop](https://signupdrop.pages.dev/magic-link-vs-password)
- The Times paywall: +19% registration completion moving from email plus password to email-only with magic-link confirmation (reported via Press Gazette, secondhand). — [SignupDrop](https://signupdrop.pages.dev/magic-link-vs-password)
- MojoAuth: 4.1% (password) versus 5.3% (passwordless) overall conversion across 523.7M events; no Sign in with Apple breakout; vendor sells passwordless. — [MojoAuth report 2026](https://mojoauth.com/data-and-research-reports/passwordless-conversion-impact-report-2026)
- Social/OAuth sign-in 55 to 75% completion versus 35 to 55% for email plus password, attributed to "Segment 2023" with no published method. — [SignupDrop benchmarks](https://signupdrop.pages.dev/benchmarks)
- An unsourced "60% more likely" statistic in one practitioner article has no traceable origin; not used. — [Glance](https://thisisglance.com/learning-centre/should-my-app-require-sign-up-before-users-can-explore-features)

### Inferences
- Where sign-in must come first (as the Ember owner has decided), the applicable evidence is the Monzo type: minimise fields and time inside the wall, say what the account gives, and keep the first value moment as close behind it as possible. The Duolingo evidence argues the cost of a first-screen wall is real but its size for another product is unknown.
- A one-field email step (link or code) and one-tap platform sign-in are consistently reported as completing better than email plus password, but no independent head-to-head exists. Magic links add an app-switch on mobile, which the vendor data does not isolate.
- A soft wall with a quiet "Later" outperformed a punitive framing at Duolingo; the general lesson (do not threaten loss to force registration) is transferable even when the wall itself is fixed.

### Gaps
- No published controlled test of Sign in with Apple versus email methods. No Baymard mobile-app registration study retrieved (Baymard's public work is e-commerce guest checkout).
- No peer-reviewed HCI study on lazy registration with outcome data was found in this pass.
- No recent (2022+) company-published A/B test of account-first versus value-first other than restatements of Duolingo's.

---

## 5. Permission priming: notifications, HealthKit, camera, microphone

### Takeaway
Median iOS push opt-in is about 49% and has been flat; Android has fallen toward iOS since Android 13 made the permission explicit. Apple, Google and every push vendor say ask in context after the user has seen value, optionally behind a pre-prompt; the direction is uncontested but the published lifts are vendor figures or single-company cases, and I found no public data at all on HealthKit, camera or microphone grant rates.

### Cited Findings

**Opt-in benchmarks [VENDOR]**
- Airship (report dated March 2025, covering 2024; monthly opt-in averaged over 12 months; 90th/50th/10th percentiles):
  - iOS all apps 2024: 74.1% / 49.4% / 27.1% (2023: 73.9% / 49.1% / 27.3%).
  - Android all apps 2024: 79.7% / 59.5% / 37.1% (2023: 88.0% / 71.3% / 42.1%).
  - "While iOS opt-in rates remained steady, Android opt-in rates dropped significantly across all percentiles."
  - Medical, Health & Fitness, read from the charts (approximate): iOS about 70% / 50% / 23%; Android about 72% / 51% / 22%. The report's "how to read" example gives 76.5% / 57.1% / 25.9% for the same vertical without stating platform, so treat the vertical figures as roughly 50 to 57% median.
  - Education (Duolingo's category), iOS from chart: about 90% / 75% / 43%, the highest vertical.
  - "Apps running onboarding campaigns see increased opt-in rates, as high as 40% above their category average." "In-app messages drive a 14% average increase in opt-in rates among opted-out users." Opted-in customers make 13% more purchases (correlational).
  - Advice: "Don't jump the gun with a generic prompt… Try a 'soft prompt' before sending the system dialogue prompt."
  — [Airship 2025 Push Notification Benchmarks (PDF)](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf?version=0)
- Airship 2026 edition: 681 billion notifications, 3 billion+ users, 15 verticals; Android and iOS opt-in now "near parity"; the "default opt-in" era is over. Percentile values are in the gated report and were not retrieved. — [Airship 2026 guide, 31 Mar 2026](https://www.airship.com/blog/your-guide-to-airships-mobile-app-push-notification-benchmarks-for-2026/)
- Batch (2025, about 10,000 apps and sites): Android opt-in fell from 85% to 67% in a year. — [Batch benchmark](https://batch.com/ressources/etudes/benchmark-notifications-push-crm-mobile)
- Pushwoosh (2025, 600+ apps): all-industry iOS average about 56% in one table and about 45% elsewhere in its own material; range 23% to 92%; suggests a 10 to 15% lift over 30 days from a pre-permission screen and timing (a projection, not a measurement). — [Pushwoosh](https://www.pushwoosh.com/blog/increase-push-notifications-opt-in/); [Business of Apps](https://www.businessofapps.com/?p=101648)
- MobiLoud: iOS 43.9%, Android 91.1% (older, pre-Android 13 mix). — [MobiLoud](https://www.mobiloud.com/blog/push-notification-opt-in-rate)
- Sources disagree on the iOS average (44% to 56%) because of sample and definition; Airship's median of about 49% is the best documented.

**Platform rules [GUIDELINE]**
- Apple HIG, Privacy: "Request permission only when your app clearly needs access to the data or resource." "Ideally, wait to request permission until people actually use an app feature that requires access." "Avoid requesting permission at launch unless the data or resource is required for your app to function." — [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- Apple on pre-alert screens: allowed "if it's essential to provide additional details"; "Include only one button and make it clear that it opens the system alert" (for example "Continue" or "Next"); do not title the button "Allow"; no cancel or close option; no incentives; do not show a modified image of the system alert or cues pointing at its Allow button. — [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- Apple on purpose strings: "a brief, complete sentence that's straightforward, specific, and easy to understand"; good example "The app records during the night to detect snoring sounds."; bad example "Microphone access is needed for a better experience." Camera, microphone and health data are all covered by the same rules; the page has no health-specific or notification-specific section. — [Apple HIG: Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- Note the tension: Apple's wording allows only a single forward button on a pre-alert screen, yet shipped apps (Headspace: "Yes, notify me" / "Not right now") use two-button pre-prompts for notifications so that a "no" does not burn the one system prompt. — [ScreensDesign: Headspace](https://screensdesign.com/apps/headspace-meditation-sleep/?ts=0&vt=1&id=908&av=1821) [TEARDOWN]
- Android 13+: notifications are off by default for new installs; the app controls when the dialog appears. "Before you ask users to grant any permissions, let them familiarize themselves with your app." Trigger from a user action (tapping a bell, following an account, placing an order) or wait until the third or fourth launch. Swiping the dialog away leaves the state unchanged. — [Android Developers: notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- OneSignal: the system prompt can be shown once on iOS and twice on Android; an iOS denial is permanent short of Settings; "Prompting on first launch, before the user understands what your app does, is the single biggest cause of low opt-in rates"; a dismissed soft prompt does not consume a system attempt; iOS provisional authorisation (iOS 12+) delivers quietly without a prompt and can be upgraded later. — [OneSignal docs](https://documentation.onesignal.com/docs/en/prompt-for-push-permissions.md) [VENDOR]

**Company cases**
- Blinkist: push opt-in 6% to 74% when the ask became "we will remind you before your trial ends", inside the paywall timeline. — [Purchasely](https://www.purchasely.com/blog/blinkist-paywall-transformation-revolutionizes-app-user-engagement); [UX Planet original](https://uxplanet.org/how-solving-our-biggest-customer-complaint-at-blinkist-led-to-a-23-increase-in-conversion-b60ad514134b) [EXPERIMENT, self-reported, 2020]
- Calm: reminder prompt after the first completed session, 40% set one. This is an in-app reminder setting, which is also the natural lead-in to the system permission. — [Amplitude](https://www.amplitude.com/case-studies/calm) [OLD]
- Duolingo: moved the opt-in prompt, changed the pitch, and added prompts in new contexts; opt-in varies by market (Japan 50% lower). No lift figures. — [Duolingo Blog, 2021](https://blog.duolingo.com/lessons-from-asia-turning-local-research-into-global-experiments)
- 39% of top subscription apps include a permission warm-up screen in onboarding. — [Adapty](https://adapty.io/state-of-onboarding/report/) [VENDOR]
- One teardown criticises Strava-style flows that ask for contacts, notifications, location and health data as one sequence because it obscures each permission's purpose. — [ScreensDesign: Strava](https://screensdesign.com/articles/strava-onboarding-design/) [TEARDOWN, opinion]
- App Tracking Transparency pre-prompts are claimed to add 20 to 40 points of opt-in; that is tracking consent, not push, and Apple restricts pre-screens there most tightly. — [Playwire](https://www.playwire.com/blog/mastering-idfa-opt-in-rates-the-complete-apptrackingtransparency-guide-for-ios-apps) [VENDOR]

### Inferences
- A health and fitness app should plan around roughly half of iOS users allowing notifications, with the top decile reaching about 70%. The gap between median and top decile is the measurable prize for good timing.
- The strongest pattern across Blinkist, Calm and Duolingo is to attach the ask to a specific promise the user has just opted into (a reminder at a time they chose, a streak they just started, a charge warning), not to "stay up to date".
- Because the iOS prompt is one-shot, a pre-prompt with a decline path protects the system prompt; Apple's written guidance is stricter than common practice, so wording should stay neutral ("Continue") and avoid mimicking the alert.
- Camera and microphone should be requested at the first tap of scan or talk, with a purpose string that states the concrete use; this is direct from Apple's guidance and needs no benchmark.

### Gaps
- No public grant-rate data for HealthKit, camera or microphone prompts, in context or at launch. HealthKit also differs structurally (a multi-toggle sheet, and apps cannot read whether read access was denied); I did not retrieve Apple's HealthKit-specific guidance in this pass.
- No controlled, non-vendor experiment comparing a pre-prompt against a first-launch system prompt for notifications. Braze material was not retrieved.
- Airship 2026 percentile values and Batch's iOS figure are behind forms.

---

## 6. Progressive profiling and deferring questions

### Takeaway
The evidence is genuinely mixed and depends on what onboarding is for: shorter flows reliably raise completion, but in paywalled apps longer quiz flows correlate with higher revenue per user, and questions raise commitment even when their answers are not used. For a free product the completion effect is the one that matters; the "longer is better" data comes from apps selling a trial at the end of the quiz.

### Cited Findings
- **[EXPERIMENT]** Everlove (RevenueCat, 24,000 users, 2026): cutting onboarding from 28 to 19 steps raised completion 78.1% to 86.7% and paywall reach 74.3% to 83.9% (both strongly significant), but trial start per paywall viewer fell 3.83% to 3.13% (−18% relative, significant); net initial conversion flat (3.35% vs 3.11%, n.s.); LTV per registered user +36.9% but weakly significant (p = 0.093). The team's reading: the cut questions were not bad, they were early; plan is to reintroduce them after first use. — [RevenueCat, 19 Nov 2026](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- **[EXPERIMENT]** Headspace: asking a short quiz raised course starts 7.6 points over no quiz with the same recommendation ("perceived fit"); true personalisation added nothing; a planning (implementation-intention) step raised opens 7.5% briefly; none changed days meditated. — [Irrational Labs](https://irrationallabs.com/case-studies/headspace-doubled-course-starts/)
- **[VENDOR, correlational]** Adapty 2026: median onboarding is 5 screens and 14 seconds. Completion falls from 89.7% (1 to 5 screens) to 62.8% (21+). Trial starts per open fall from 4.95% to 2.1 to 2.8% (11+ screens). But paid subscriptions per open rise from 1.20% to 2.33% and revenue per open from $0.36 to $1.39 for 21+ screens, and day-one trial cancellations fall from 59.8% to 36 to 41%. Adapty states the length effects are correlational because long flows are mostly Health & Fitness and Education. The first screen alone loses 10.2% of sessions, about five times any later screen. — [Adapty State of Onboarding 2026](https://adapty.io/state-of-onboarding/report/)
- **[VENDOR opinion]** RevenueCat argues some onboardings are too short, citing Noom's very long funnel and Me+ adding "science" screens, and recommends judging by realised LTV, not early conversion. — [RevenueCat](https://revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)
- **[EXPERIMENT, platform-published]** Eyecon: fewer explanatory steps, +30% registration conversion. — [Google Play](https://play.google.com/console/about/eyecon-casestudy/)
- Duolingo's flow keeps a handful of one-tap questions before the lesson and defers the profile (name, age, email) to an optional 4-step flow afterwards. — [UserGuiding, 2024](https://userguiding.com/blog/duolingo-onboarding-ux) [TEARDOWN]
- Monzo: identity verification framed as continuing over the relationship, not all at sign-up. — [Monzo, 2017](https://monzo.com/blog/2017/11/03/simple-signup-kyc) [OLD]
- Airship links progressive profiling (asking over time via in-app surveys) to higher engagement; vendor claim without figures in the pages read. — [Airship 2025 benchmarks](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf?version=0) [VENDOR]

### Inferences
- Two different mechanisms are being conflated in the literature. Questions as friction lower completion. Questions as commitment raise the next action and the willingness to pay. A free app gets the cost of the first and only some of the benefit of the second.
- The safest reading for a free tracker: keep the pre-value questions to those that change what the user sees in the first session (goal, targets), make each one tap, and move the rest to the moment they become useful. Everlove and Duolingo both point this way.
- A single well-chosen question can still be worth its cost even if it changes nothing downstream (Headspace "perceived fit"), which argues against cutting to zero.

### Gaps
- No clean published test of "ask later" in which the deferred questions were actually asked later and answer rates and outcomes compared. Everlove has only announced the intention.
- Nothing peer-reviewed found on progressive profiling in consumer mobile apps.

---

## 7. First-session design: checklists, empty states, sample data, guided first action

### Takeaway
The measured wins come from putting one concrete first action in front of the user while motivation is highest (Duolingo's lesson, Headspace's course start, Calm's reminder, Canva's first design) rather than from tours or checklists; checklist benchmarks exist only for B2B SaaS from tool vendors and show low completion. I found no published results for sample data or empty states in consumer apps.

### Cited Findings
- Duolingo: the first lesson is the onboarding; a tooltip points to the one element to tap. — [UserGuiding](https://userguiding.com/blog/duolingo-onboarding-ux) [TEARDOWN]; [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Headspace/Irrational Labs lesson 1: "Placing a desired action in onboarding can drive it when motivation is highest" (course starts 31% to 63%), with the limit that it did not carry over into repeated use; returning users could not find their course on the home screen. — [Irrational Labs](https://irrationallabs.com/case-studies/headspace-doubled-course-starts/) [EXPERIMENT]
- Calm: the prompt that worked was placed immediately after the first completed session, not before it. — [Amplitude](https://www.amplitude.com/case-studies/calm) [EXPERIMENT][OLD]
- Canva: an interstitial asking what the user wanted to make, then routing them into that design, lifted activation about 10% (to about 12% after refinement); started on 5% of new users of the poster product and reached significance in 2 to 3 weeks. Reported by Appcues, which sells onboarding tooling. — [Appcues: Canva growth process](https://www.appcues.com/blog/canva-growth-process) [EXPERIMENT via VENDOR]
- Notion: an opening use-case question pre-fills the workspace so the user does not land on an empty page; time to activation put at 3 to 6 minutes by a third party; no published test. — [Supademo teardown](https://supademo.com/user-flow-examples/notion) [TEARDOWN]
- Onboarding checklists (B2B SaaS, 188 companies): average completion 19.2%, median 10.1%. — [Userpilot benchmark](https://userpilot.com/blog/product-metrics-benchmark-report/) [VENDOR]. Userpilot sells checklist tooling; one of its pages contradicts its own activation figures (FinTech 5%), so treat as rough.
- Mobile onboarding funnel shape: the first screen loses 10.2% of sessions; 91% of users who open an onboarding eventually finish it at the median app. — [Adapty](https://adapty.io/state-of-onboarding/report/) [VENDOR]
- NN/g: previews and tours are a weak substitute for real access because they are too vague for users to judge value. — [NN/g](https://www.nngroup.com/articles/login-walls/) [GUIDELINE][OLD]
- Duolingo growth-mindset coach copy inside the lesson: +7.2% D14. Encouragement placed inside the first task, not before it. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker) [EXPERIMENT][OLD]
- Strava's own framing of getting started is three things: set up the account, pair a device, record a first activity. — [Strava Support](https://support.strava.com/hc/en-us)

### Inferences
- The common design across the admired examples: onboarding ends inside the product with one real unit of the core action completed (a lesson, a session, a design), followed immediately by the hook for tomorrow (streak started, reminder set).
- The Headspace null result is the most useful warning: a successful first action must be easy to find and repeat on the second visit, or the lift evaporates.
- Checklists appear to be a weak tool on their own; their published completion is low even in the vendors' own data.

### Gaps
- No published experiment on sample or demo data versus an empty state in a consumer app.
- Appcues and Chameleon benchmark reports were not retrieved; the Userpilot figures are B2B web SaaS and may not transfer to a consumer phone app.
- Spotify and Revolut: nothing usable found. Strava: no company-published onboarding results.
- Growth.Design, UserOnboard, Mobbin and Page Flows were not opened directly; flow descriptions here come from ScreensDesign, UserGuiding and Appcues GoodUX captures, which are undated or 2024.

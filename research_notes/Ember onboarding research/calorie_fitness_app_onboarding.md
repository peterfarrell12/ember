# How leading calorie-tracking and fitness apps run onboarding (2025 to 2026)

Research date: 26 November 2026. Searches were run from a US-only search tool, so storefront details are US unless marked. Labels used throughout:

- **[Company claim]**: said by the company or its staff, not independently checked.
- **[Third-party count]**: a number counted by a teardown library or writer from one capture of the app. Counting methods differ between libraries (Mobbin counts screens, ScreensDesign counts "onboarding steps"), so counts for the same app differ and are not comparable across sources.
- **[Vendor case study]**: published by a company that sells paywall or subscription tooling to the app; self-reported.
- **[Measured, aggregate]**: benchmark data across many apps, not about one named app.
- **[Snippet only]**: the fact came from a search-result summary; the page itself was not opened or could not be opened. Treat as weaker.

Most teardown pages carry no capture date. Where a page shows only a "(c) 2026" footer, that is said.

## How many screens or questions does each app's onboarding have, and what order do they come in?

### Takeaway
Counts vary by a factor of three or more for the same app depending on who counted and which funnel (web or in-app) they captured, so only ranges are safe: Noom sits at the top (77 to 113), Yazio, Lose It!, WHOOP and Flo are in the 47 to 78 range, Cal AI and MyFitnessPal in the 19 to 40 range, and Strava, Hevy, Ladder, Fitbod and Cronometer are short. The common order in the long flows is goal, body data, target weight and pace, obstacles and habits, a "building your plan" loader, a plan or projection screen, then the paywall.

### Cited Findings

**Cross-app counts (one source, one method)**
- [Third-party count] Mobbin's study (published 13 July 2026, updated 18 November 2026; 986 apps, 1,460 flows, iOS captures) lists Health and Fitness onboarding lengths in screens: Noom 94 (the same article's text says 113), WHOOP 63, Flo 62, BitePal 61, Fitbod 47, Yazio 47, MyFitnessPal 38, Cal AI 37, Lifesum 31, Strava 23, Hevy 21, Ladder 17. BetterMe, Lose It!, Simple and ZOE are not in the list. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- [Third-party count] Same study: the average app runs 25 screens (range 3 to 187); Health and Fitness (n=84) averages about 35.5 to 35.8, median 32.5, quartiles 23 and 46.3, max 94. The article has internal inconsistencies (overall average given as 25 and as 29; Noom as 94 and 113). — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- [Measured, aggregate] Adapty's State of Onboarding report (data November 2025 to October 2026, App Store only) puts the median Health and Fitness onboarding at 12 screens, against a median of 5 for all apps; one app in ten runs 20 or more. This is a median over Adapty's customer base, which is why it is far below Mobbin's average for well-known apps. — [Adapty](https://adapty.io/state-of-onboarding/report/)

**Noom**
- [Third-party count] RevenueCat teardown by Daphne Tideman, published 9 April 2026: the web-to-app funnel runs "up to 113 screens" and takes 10 to 15 minutes on a quick run. The author is UK-based and the flow offered stones and kilos, but the market tested is not stated. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md)
- Order in that teardown: (1) goal; (2) sensitive profile: sex at birth, gender identity, pregnancy, age band, height, current weight, medical conditions; (3) a trust screen with a social-proof statistic; (4) goal weight and timeline, with unhealthy targets blocked; (5) pace and a steady-trend versus yo-yo graph; (6) focus areas, an event deadline, pace choice; (7) a "calculating your plan" loader, then an email gate about one-third of the way in; (8) a results graph with goal date and event marker; (9) a 10-question behavioural slider quiz with "Question X of 10"; (10) practical questions and agreement statements; (11) teaching screens on the green/yellow/red food system and a longer loader; (12) dietary restrictions; (13) other goals and a stress quiz; (14) nutrition mini-quiz and motivation; (15) a "building your plan" loader; (16) pay-what-you-want trial, then pricing. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md)
- [Third-party count] ScreensDesign's capture of the Noom iOS app (undated, "(c) 2026" footer) lists 77 onboarding steps; the quiz starts at 01:16 of the recording and the plan and trial offer arrive at 07:38, so roughly six and a half minutes in that capture. — [ScreensDesign](https://screensdesign.com/showcase/noom-weight-loss-food-tracker)
- [Company claim, old] A February 2021 Breakout Growth podcast with Noom co-founder Artem Petakov has a chapter titled "Why 60 or so steps to onboarding works for Noom in the context of its mission"; the reasoning is in the audio and was not retrieved. — [Sean Ellis Substack](https://seanellis.substack.com/p/from-onboarding-to-healthy-habits-ff9)
- [Snippet only] Other counts in circulation: "96+ screens" on a funnel-research dashboard and "an estimated 40-50 question" flow from Rocketship HQ; neither states a method. — [search result for Rocketship HQ](https://www.rocketshiphq.com/?p=5491)

**Cal AI**
- [Third-party count] Mobbin: 37 screens. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- [Third-party count] ScreensDesign capture (undated; a screenshot shows "Apr 3, 2026", so probably around April 2026): order is welcome and feature carousel; gender, workouts per week, where you heard of the app, prior calorie apps; a value-proposition graph; height, weight, date of birth; coach or nutritionist question, goal, desired weight; pace slider; obstacles, diet, health goals; privacy; Apple Health; calories-burned and rollover settings; social proof and a rating prompt; notification permission; referral code; "building your plan" loader; App Tracking Transparency prompt; custom plan summary; sign-up ("Save your progress": Apple, Google or email link); free-trial offer; paywall. The page gives no step count; its screenshot list suggests roughly 35 to 40 screens before the paywall (that range is the fetch tool's reading of the page, not a number the page states). — [ScreensDesign](https://screensdesign.com/apps/cal-ai-calorie-tracker/)
- [Company claim] Co-founder Zach Yadegari, interviewed around the app's first anniversary (so about spring 2025): "We only asked the questions we needed in order to give the user their calorie daily intake estimate" at first; adding questions that did not change the estimate "saw an increase in conversion rate"; "We animated those screens, tested it again, also boosted the conversion rate." — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)

**MyFitnessPal**
- [Third-party count] Three different counts: 19 onboarding steps (ScreensDesign, undated), 38 screens (Mobbin, 2026), and a 25-step flow (Lazyweb, marked updated May 2026; snippet only, behind sign-up). — [ScreensDesign](https://screensdesign.com/showcase/myfitnesspal-calorie-counter); [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows); [Lazyweb](https://app.lazyweb.com/flow/myfitnesspal/onboarding)
- ScreensDesign's recording: a quiz from 00:19 to 01:13 that "digs into past barriers and medication use", a paywall at 02:23, an Apple Health prompt at 02:44. — [ScreensDesign](https://screensdesign.com/showcase/myfitnesspal-calorie-counter)

**Lose It!**
- [Third-party count] ScreensDesign (undated): 72 onboarding steps, ending at about 04:05 in "a clear, actionable plan summary" that projects a weight-loss timeline, with the paywall at 04:45. — [ScreensDesign](https://screensdesign.com/showcase/lose-it-calorie-counter)
- [Snippet only, unverified] A user-made Google Sheet teardown logs "109 onboarding screens" for Lose It!. Not opened; no date or method. — [Google Sheet](https://docs.google.com/spreadsheets/d/1U-7hIIW_i271YPgiyx6_6HTASppWa_u2mYjOR8FVCh4/edit)
- [Company claim, July 2023] Lose It! has run long onboarding, which it calls "longboarding", since 2018, and by the time of the paywall users have spent "about 10 minutes taking a survey". — [RevenueCat](https://www.revenuecat.com/blog/growth/50-million-users-5-key-strategies-lessons-from-lose-it.md)

**Yazio**
- [Third-party count] ScreensDesign (undated): 78 onboarding steps; Mobbin: 47 screens. Order in ScreensDesign's recording: mascot encouragement during the quiz (00:23), a "tap and hold" goal commitment (00:32), several Apple Health permissions at once (02:04), a rating request before any core feature (02:45), plan-building (03:53), first paywall (04:24), spin-the-wheel after closing it (04:30). — [ScreensDesign](https://screensdesign.com/showcase/yazio-calorie-counter-diet); [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- [Snippet only] Reteno's gallery classes Yazio's web onboarding as a "short flow (30- steps)" with testimonials and a welcome discount. — [Reteno gallery](https://gallery.reteno.com/flows/web-screens-yazio)

**BetterMe**
- [Third-party count] Two funnels, two counts: the in-app flow for BetterMe Well-Being Coach is 36 onboarding steps (ScreensDesign, undated), and a web quiz funnel is 70 screens completed in 5 minutes 47 seconds (Web2App World, 2 March 2026). — [ScreensDesign](https://screensdesign.com/showcase/betterme-health-coaching); [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world)
- Web quiz order: body-type and goal selection with image answers; mental-wellness questions mixed with physical ones; lifestyle (sleep, stress, diet, experience); reinforcement screens about two-thirds through; an animated "results processing" sequence; paywall. — [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world)

**Flo**
- [Third-party count] Mobbin: 62 screens for one path. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- [Company claim, snippet only] Flo's engineering blog says onboarding forks on the user's main goal and sub-goals, with the total number of screens "up to 400" across all branches, and that it is served from the backend by a survey engine. The page returned 403 when opened, so the wording is from the search summary and the post's date was not confirmed. — [Flo Health on Medium](https://medium.com/flo-health/mobile-onboarding-evolution-part-1-cfc9702835ce)

**Fitbod**
- [Third-party count] ScreensDesign (undated): 14 onboarding steps; Mobbin: 47 screens. Order: detailed equipment selection (00:27), strength-gain projections shown "before signup" (01:32), tooltips in the first workout, first paywall at 02:33. — [ScreensDesign](https://screensdesign.com/showcase/fitbod-gym-fitness-planner); [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)

**MacroFactor**
- No screen count found. [Snippet only] ScreensDesign's capture shows: a start screen with Get Started and Log In, a privacy consent screen, a Basics step with an optional Apple Health sync card, then sex, date of birth, height and goal selection, and a paywall comparing monthly, 6-month and annual plans. — [ScreensDesign](https://screensdesign.com/apps/macrofactor-macro-tracker/?av=4287&id=47&vt=1)
- [Company claim] The UK App Store listing describes set-up as: "Set your goal (lose, maintain, or gain) and choose your rate of weight change to set your calorie deficit or surplus." — [App Store GB](https://apps.apple.com/gb/app/id1553503471)

**Cronometer**
- No screen count found. [Snippet only] Sign-up is account creation with profile details (used to calculate targets), then an emailed validation link, then the diary; a Fortune review notes there is no lengthy onboarding quiz. — [Cronometer support](https://support.cronometer.com/hc/en-us/articles/360021897491-Web-Quick-Start-Guide); [Fortune](https://fortune.com/article/cronometer-review/)

**Strava, WHOOP, Hevy, Ladder, Lifesum**
- [Third-party count] Mobbin: Strava 23, WHOOP 63, Hevy 21, Ladder 17, Lifesum 31. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- Strava's recorded screens (ScreensDesign, undated, 10 screens described): splash, sign-up modal, promotional overlays, account creation, verification, a profile form (first name, last name, birthday, gender), "Tell us who you are". The page does not confirm the sequence. — [ScreensDesign](https://screensdesign.com/articles/strava-onboarding-design/)
- [Snippet only] Hevy's paywall appears about 37 seconds into ScreensDesign's recording; Ladder's paywall screens start around screen 9 of its capture. — [ScreensDesign Hevy](https://screensdesign.com/apps/hevy-workout-tracker-gym-log/?vs=212387); [ScreensDesign Ladder](https://screensdesign.com/apps/ladder-strength-training-plans/)

### Inferences
- The "long" apps cluster in weight loss (Noom, Yazio, Lose It!, BetterMe, Cal AI), where there is a number to project (a goal weight and a date). Strength and activity apps (Fitbod, Hevy, Strava, Ladder) are shorter and get to a first workout or activity instead.
- Time is a better comparator than screens. The supported timings are: Noom web 10 to 15 minutes; Noom app about 6 to 7 minutes; BetterMe web 5 minutes 47 seconds; Lose It! about 4 to 5 minutes in one recording and "about 10 minutes" by the company's own description; Yazio about 4 and a half minutes; MyFitnessPal about 2 and a half minutes; Fitbod about 2 and a half minutes to the first paywall. All are single recordings by someone tapping through quickly.

### Gaps
- No teardown with a stated capture date and country was found for any app; none was confirmed as a UK or Irish capture.
- ZOE: no onboarding teardown found at all; only that a quiz exists on zoe.com.
- WHOOP: only Mobbin's count of 63; no description of what the screens are (likely includes strap pairing, but that is not sourced).
- MacroFactor, Cronometer, Simple: no screen counts.
- Lifesum, Hevy, Ladder: counts only, no ordered flow.
- The "109 screens" Lose It! figure and the "96+" Noom figure could not be verified.

## Which apps put sign-up and paywall before any use of the product, and which let people use it first?

### Takeaway
BetterMe, Noom's web funnel, MacroFactor and WHOOP require payment or a trial before the product can be used; Cal AI shows a paywall to 87% of new users at the end of onboarding; MyFitnessPal, Lose It!, Yazio, Flo, Strava, Cronometer and Fitbod show a paywall that can be closed and then let people in. Across the category, the paywall almost always comes at the end of onboarding, and sign-up has been moving to the end as well.

### Cited Findings

**Category-level**
- [Third-party count] 46.4% of Health and Fitness apps in Mobbin's sample show a paywall during onboarding, against 22% of all apps. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- [Third-party count] In Adapty's check of top US apps, 14 of 20 put the first paywall at the end of onboarding and 2 of 20 put it right after a "your plan is ready" screen; 48% of top-50 apps ask for sign-up in onboarding; only 4 to 12% of top apps per category show a second paywall. — [Adapty](https://adapty.io/state-of-onboarding/report/)

**Per app (labels in quotes are ScreensDesign's own classification, undated)**
- **BetterMe**: "Free Trial - Hard Paywall"; primary paywall at 03:11, straight after a projection chart at 02:52. The web funnel ends in a paid introductory plan (see pricing below). — [ScreensDesign](https://screensdesign.com/showcase/betterme-health-coaching); [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world)
- **Noom**: web funnel takes an email about one-third through (before the results graph, button "See my results"), then ends in a paid 14-day trial with a choose-your-price screen. The iOS app capture is labelled "Free Trial - Soft Paywall", with a 7-day free trial for a 2-month plan. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [ScreensDesign](https://screensdesign.com/showcase/noom-weight-loss-food-tracker)
- **Cal AI**: sign-up sits after the plan summary and immediately before the trial offer and paywall. [Company claim] Yadegari: "Definitely moving the sign in screens to the end because there is a lot of drop off there. That was the biggest by far." [Vendor case study] 87% of new users see a paywall. ScreensDesign's page does not label the paywall hard or soft. — [ScreensDesign](https://screensdesign.com/apps/cal-ai-calorie-tracker/); [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing); [Superwall](https://superwall.com/case-studies/cal-ai)
- **MacroFactor**: [Company claim] "MacroFactor has a free trial, but does not offer a free subscription tier." So there is no use without starting a trial. — [App Store GB](https://apps.apple.com/gb/app/id1553503471)
- **WHOOP**: [Snippet only] the product needs a membership and a strap; the trial page says that after the one-month trial members are "automatically enrolled onto our 12-month plan for $239" unless they choose monthly. — [WHOOP trials](https://ww2.whoop.com/whoop-trials/)
- **MyFitnessPal**: "Free Trial, Soft Paywall", shown "directly after onboarding", promoting an annual plan with a discount and a free trial; the Apple Health prompt follows the paywall in the recording. [Snippet only] After onboarding people land on the dashboard with many advanced features blurred or locked. — [ScreensDesign](https://screensdesign.com/showcase/myfitnesspal-calorie-counter); [Paddle Fix That Funnel](https://www.paddle.com/studios/shows/fix-that-funnel/myfitnesspal)
- **Lose It!**: "Free Trial - Soft Paywall"; paywall immediately after the plan summary with a 7-day free trial and the yearly price that follows. — [ScreensDesign](https://screensdesign.com/showcase/lose-it-calorie-counter)
- **Yazio**: "No Free Trial - Soft Paywall"; 12-month and 3-month plans with no trial, closable. — [ScreensDesign](https://screensdesign.com/showcase/yazio-calorie-counter-diet)
- **Fitbod**: "No Free Trial - Soft Paywall"; the first paywall appears "after the first workout is created but before it's started", and a second after the workout summary. "Users can complete the full onboarding and see their first generated workout free before any payment." [Snippet only] Fitbod's help centre describes three free workouts before upgrading. — [ScreensDesign](https://screensdesign.com/showcase/fitbod-gym-fitness-planner); [Fitbod help](https://help.fitbod.me/hc/en-us/articles/30542136101527)
- **Strava**: account creation and a profile form come first. [Snippet only] The paywall promotes a 30-day free trial with a timeline of when features unlock and when billing starts, and the free tier remains. — [ScreensDesign](https://screensdesign.com/articles/strava-onboarding-design/); [Lazyweb](https://lazyweb.com/canvas/flows/strava/onboarding)
- **Flo**: [Company claim, 11 November 2026] cycle tracking, the core use, stays free; about 40% of Flo's subscriptions start more than six months after install. — [RevenueCat Sub Club](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026.md)
- **Cronometer**: [Snippet only] free sign-up needs no card, the free version can be used indefinitely, and Gold is chosen later from the account page, not during sign-up. — [Cronometer support](https://support.cronometer.com/hc/en-us/articles/360028026971); [Cronometer](https://cronometer.com/)
- **Ladder**: [Snippet only, secondary] a 7-day full-access trial that needs no payment details. The source may be describing a different app called Ladder. — [PaywallPro on DEV](https://dev.to/paywallpro/best-paywall-examples-in-fitness-apps-2025-2cbj)

**Where permissions sit**
- Cal AI: Apple Health mid-flow, notifications after the social-proof and rating screens, App Tracking Transparency after the plan loader, all before sign-up and paywall. — [ScreensDesign](https://screensdesign.com/apps/cal-ai-calorie-tracker/)
- Yazio: several Apple Health permissions at once at about two minutes, before the paywall. — [ScreensDesign](https://screensdesign.com/showcase/yazio-calorie-counter-diet)
- MyFitnessPal: Apple Health after the paywall. BetterMe: Apple Health much later (13:17), introduced with context before the system prompt. — [ScreensDesign MFP](https://screensdesign.com/showcase/myfitnesspal-calorie-counter); [ScreensDesign BetterMe](https://screensdesign.com/showcase/betterme-health-coaching)
- [Third-party count] 39% of top-50 US apps prepare users with their own screen before the notification prompt. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- ScreensDesign's editorial view on Strava: asking for contacts, notifications, location and health as one sequence obscures the purpose of each; show "a preview and a manual alternative before the system dialog"; "Premature asks can make the product feel extractive." The page says it has no conversion evidence for this. — [ScreensDesign](https://screensdesign.com/articles/strava-onboarding-design/)

**Trial terms and prices found**
- Cal AI: three-day free trial, monthly and yearly plans. — [ScreensDesign](https://screensdesign.com/apps/cal-ai-calorie-tracker/)
- Noom web: 14-day trial with three pay-what-you-want amounts framed as helping "others access Noom"; the price after the trial is the same whichever is chosen. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md)
- BetterMe web (US dollars, March 2026, third-party capture): 1-week trial $6.93 (struck through from $17.77), 4-week plan $33.25 (default, "Most Popular"), 12-week plan $66.49. The article says the 1-week trial then renews at $69.99 a week, which looks implausibly high and may be a transcription error in the article; treat with caution. — [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world)
- **UK pricing, MacroFactor**: in-app purchases on the UK App Store are listed at £10.99 monthly, £41.99 semiannual and £62.99 annual (other listed amounts, £10.49, £8.49, £51.99 and an £89.99 annual bundle, are not tied to a tier on the page). Trial length is not stated on the listing; [snippet only] most third-party sources say 7 days and one says two weeks. — [App Store GB](https://apps.apple.com/gb/app/id1553503471)
- **UK pricing, ZOE** [snippet only]: app-only membership from £9.99 a month on a 12-month term (£119.88); the gut health test is an add-on listed at £149 on one page and £199 on another, and needs an active membership. — [ZOE](https://zoe.com/en-gb/buymembership); [Which?](https://www.which.co.uk/reviews/nutrition-and-supplements/article/zoe-review-is-it-worth-it-aOVeL1R5BW52)
- Fitbod [snippet only, US]: $15.99 a month or $95.99 a year. Strava [snippet only, US]: $11.99 a month or $79.99 a year. Cronometer Gold [snippet only, US]: $8.99 a month or $49.99 a year. MacroFactor US: $11.99 a month, $47.99 half year, $71.99 a year. — [Dr Muscle](https://dr-muscle.com/fitbod-cost-free-alternative/); [PaywallPro on DEV](https://dev.to/paywallpro/top-fitness-app-paywalls-ux-patterns-pricing-insights-2868); [Fortune](https://fortune.com/article/cronometer-review/); [App Store US](https://apps.apple.com/us/app/-/id1553503471)

### Inferences
- "Hard" and "soft" are not cleanly separable for Cal AI: the vendor case study lists "freemium feature gates" among its paywall trigger points, which implies some people get past the onboarding paywall without paying, while third-party notes of the founder's interview describe the app as premium-only. Describe it as "paywall at the end of onboarding for nearly everyone" unless a dated capture settles it.
- The apps with a free core (Flo, Strava, Cronometer, MyFitnessPal, Lose It!) still show a paywall at the end of onboarding; what differs is that closing it leads into a working product.
- Sign-up at the end (Cal AI) or mid-flow as an email gate before a reward (Noom) are the two patterns in the long flows; sign-up first is the pattern in the short, account-centred apps (Strava, Cronometer).

### Gaps
- UK and Irish App Store prices were found only for MacroFactor (UK) and ZOE (UK web). None for Cal AI, MyFitnessPal, Lose It!, Noom, Yazio, Fitbod, Strava, WHOOP, BetterMe or Flo; no Irish (euro) prices at all.
- Where notification permission sits was found only for Cal AI.
- Whether Cal AI's paywall can be dismissed in the current build was not confirmed.
- WHOOP's in-app sign-up order (account, membership, strap pairing) was not found in any teardown.

## Which devices recur across the highest-grossing apps (plan-building animation, weight-projection graph, testimonials, commitment pledge, spin-the-wheel discount)?

### Takeaway
A plan-building loader followed by a projected-result graph and then the paywall appears in every long weight-loss flow examined (Noom, Cal AI, Lose It!, BetterMe, Yazio, and Fitbod's strength version). Social proof and a rating prompt before first use, a physical commitment gesture, countdown timers and a discount shown only after declining (often a spin-the-wheel) are the next most common.

### Cited Findings
- [Third-party count] Among ScreensDesign's top 50 US apps: 46% ask quiz questions, 41% show a social-proof screen, 34% show a "building your plan" screen, 52% personalise (88% in Health and Fitness, 10% in Utilities). — [Adapty](https://adapty.io/state-of-onboarding/report/)
- **Plan-building loaders**: Noom uses two ("calculating your plan" before the email gate; "building your plan" citing "millions of successful users" before pricing), with longer loaders interleaving extra questions; Cal AI has a "building your plan" step ending on an "All done" screen; BetterMe animates plan components being assembled; Yazio "builds a sense of a personalized plan" at 03:53. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [ScreensDesign Cal AI](https://screensdesign.com/apps/cal-ai-calorie-tracker/); [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world); [ScreensDesign Yazio](https://screensdesign.com/showcase/yazio-calorie-counter-diet)
- **Projection graphs**: Noom shows a steady-trend versus yo-yo graph and a results graph with a goal date and event marker (the teardown found the chosen pace did not change the projected end date); Noom's app shows a goal timeline at 01:18 that adjusts at 04:26; Lose It! ends in a plan summary projecting a weight-loss timeline; BetterMe shows a projection chart that "validates the effort spent answering questions" seconds before the paywall; Cal AI shows a value-proposition graph early; Fitbod shows "tangible strength gain projections" before sign-up and frames its second paywall around 90-day predictions. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [ScreensDesign Noom](https://screensdesign.com/showcase/noom-weight-loss-food-tracker); [ScreensDesign Lose It!](https://screensdesign.com/showcase/lose-it-calorie-counter); [ScreensDesign BetterMe](https://screensdesign.com/showcase/betterme-health-coaching); [ScreensDesign Fitbod](https://screensdesign.com/showcase/fitbod-gym-fitness-planner)
- **Social proof and testimonials**: Noom shows "we've helped 3,627,436 people lose weight" (the teardown notes the figure is dated October 2021) and testimonials beside the claim that "subscribers typically lose 0.5-1 kg per week"; Cal AI has a social-proof and rating step before the notification prompt; Yazio asks for a rating before any core feature is seen; BetterMe uses before-and-after images and testimonials on post-purchase upsells. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [ScreensDesign Cal AI](https://screensdesign.com/apps/cal-ai-calorie-tracker/); [ScreensDesign Yazio](https://screensdesign.com/showcase/yazio-calorie-counter-diet); [ScreensDesign BetterMe](https://screensdesign.com/showcase/betterme-health-coaching)
- **Commitment devices**: Yazio uses a "tap and hold" gesture to commit to the goal; Noom uses goal weight, an event deadline, pace choice, agreement statements and a pregnancy waiver; Lose It! has people set up premium features during onboarding to create loss aversion at the paywall. — [ScreensDesign Yazio](https://screensdesign.com/showcase/yazio-calorie-counter-diet); [RevenueCat Noom](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [RevenueCat Lose It!](https://www.revenuecat.com/blog/growth/50-million-users-5-key-strategies-lessons-from-lose-it.md)
- **Urgency**: Noom's app shows a 15-minute countdown to "reserve" the plan with price shown per week; Noom's web funnel offers a stress course free if the user signs up within 15 minutes. — [ScreensDesign Noom](https://screensdesign.com/showcase/noom-weight-loss-food-tracker); [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md)
- **Discount after declining**: Yazio shows a spin-the-wheel with a chance at 75% off when the first offer is closed; Cal AI built and iterated a spin-wheel paywall where users "unlock" a discount, plus transaction-abandon offers; Lose It! gives progressively steeper discounts to people who have not converted after 30 days, and [snippet only] closing its first paywall triggers a message that this was the only chance for a free trial. — [ScreensDesign Yazio](https://screensdesign.com/showcase/yazio-calorie-counter-diet); [Superwall](https://superwall.com/case-studies/cal-ai); [RevenueCat Lose It!](https://www.revenuecat.com/blog/growth/50-million-users-5-key-strategies-lessons-from-lose-it.md)
- **Trial-timeline ("honest") paywall**: Cal AI's paywall shows today, the reminder and the first charge on one timeline; BetterMe's is described as "transparent" with a clear trial timeline; [snippet only] Strava uses the same pattern with a reminder two days before the trial ends, and a LinkedIn post claims it raised trial starts by 23% (unverified). — [ScreensDesign paywall examples](https://screensdesign.com/articles/calorie-tracker-app-paywall-examples/); [ScreensDesign BetterMe](https://screensdesign.com/showcase/betterme-health-coaching); [UX Collective](https://uxdesign.cc/stravas-bumpy-road-to-monetisation-5b82f23fcf07)
- **Post-purchase upsells**: BetterMe follows a successful subscription with one-time "Challenges" in-app, and on the web a coaching-plus-fitness-band offer at $29.99 for four weeks then $59.99 every four weeks, and a $19.99 add-on plan. — [ScreensDesign BetterMe](https://screensdesign.com/showcase/betterme-health-coaching); [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world)
- **Referral code and "where did you hear about us"**: both are steps in Cal AI's onboarding. — [ScreensDesign](https://screensdesign.com/apps/cal-ai-calorie-tracker/)

### Inferences
- The fixed sequence "effort, loader, personalised projection, price" is the shared skeleton; the loader and graph are placed to make the price screen feel like the result of the user's own answers.
- Several of these devices are the same ones Apple cited against Cal AI (weekly price prominence, a second offer after declining) or that Noom's teardown caught as stale (a 2021 statistic, a pace choice that does not change the projection). They carry regulatory and trust risk as well as conversion upside.

### Gaps
- No source quantifies the conversion effect of any single device (loader, graph, pledge, wheel) in a named app.
- No explicit signature or written-pledge screen was documented in the sources opened; "tap and hold" (Yazio) is the only gesture-type commitment found.
- No evidence found on which of these devices MyFitnessPal, MacroFactor, Cronometer, Strava, WHOOP or ZOE use.

## What have founders or growth leads said publicly about why their onboarding is built this way?

### Takeaway
The two long-onboarding companies that have spoken on the record (Cal AI and Lose It!) both say the same thing: adding questions that the product does not need raised conversion, and they kept adding until the gains stopped. Flo's growth lead argues the opposite emphasis: paywall conversion at onboarding is not a strategy, and wins there can lose money later.

### Cited Findings
- [Company claim] Cal AI, Zach Yadegari (about spring 2025): extra questions that did not change the calorie estimate raised conversion, which he put down to the extra time people spent in the flow; animating screens raised it again; moving sign-in to the end was "the biggest by far"; "Twenty to twenty five will convert either to paying right away or into a trial." — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)
- [Company claim, snippet only] Yadegari has said a hard paywall beat an ad-supported free model about tenfold at his earlier app, Grind Clock, and that the lesson carried into Cal AI. — [Net Influencer](https://www.netinfluencer.com/cal-ai-founder-zach-yadegari-breaks-down-the-influencer-playbook-behind-his-apps-growth/)
- [Vendor case study, 15 April 2026] Cal AI ran 123 A/B experiments on iOS with 160 paywall designs and 424 variants across 46 trigger points, about five a month, 61 of them on the onboarding paywall. Yadegari: "We treat paywalls the same way we treat the product". — [Superwall](https://superwall.com/case-studies/cal-ai)
- [Company claim, July 2023] Lose It! (Erin Webster-Shaller, VP Marketing; Paul Apollo, SVP Operations): the team kept lengthening onboarding with questions whose answers were not used in set-up; rates rose by double digits (metric not specified) until returns diminished. Adding premium features to onboarding did not reliably help and sometimes hurt. "We do not touch it without running A/B tests." On the free product: "We try not to take free features and put them behind the paywall. But if we have to, we will." People who have not converted after 30 days have a single-digit chance of ever converting. — [RevenueCat](https://www.revenuecat.com/blog/growth/50-million-users-5-key-strategies-lessons-from-lose-it.md)
- [Company claim, 11 November 2026] Flo (Mike Charniatsou, growth and web onboarding): Flo sees itself as a lifelong partner and does not try to monetise on day one or day seven; "There are only so many ways to squeeze the lemon." A test that lifts onboarding conversion can reduce revenue later; teams should check at year end whether growth matched the sum of reported uplifts. A younger app that must recover acquisition cost on day zero cannot afford this approach. — [RevenueCat Sub Club](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026.md)
- [Company claim, measured internally] Flo's perimenopause question: the first two tests each cost almost 10% of conversion because almost 75% of users could not be placed by the question as written; rewritten with the medical team, the third version won by 23%; removing the section then lost. A trial-reminder paywall and a trial toggle both failed at Flo. Putting partner mode into the onboarding funnel was "the biggest failure of the year". — [RevenueCat Sub Club](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026.md)
- [Company claim, 2021] Noom's co-founder Artem Petakov attributed 2020 revenue of around $400 million (nearly double 2019) to "rigorous experimentation", and discussed why "60 or so steps" of onboarding suits Noom's mission; the argument itself is in audio only. — [Sean Ellis Substack](https://seanellis.substack.com/p/from-onboarding-to-healthy-habits-ff9)
- [Third-party view] RevenueCat's Noom teardown argues the intentional use of the length matters more than the length; a separate RevenueCat test on another app (Everlove) found a shorter onboarding raised completion but lowered trial starts. — [RevenueCat Noom](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [RevenueCat Everlove](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment.md)
- [Measured, aggregate] Adapty's benchmark supports the trade-off the founders describe: completion falls from 89.7% (1 to 5 screens) to 62.8% (21 or more) and trial starts per open fall from 4.95% to 2.1 to 2.8%, but paid subscriptions per open rise from 1.20% to 2.33%, trial-to-paid from 19.7% to about 30%, day-one cancellations fall from 59.8% to 36 to 41%, and revenue per open rises from $0.36 to $1.39. — [Adapty](https://adapty.io/state-of-onboarding/report/)

### Inferences
- The stated mechanism in both Cal AI's and Lose It!'s accounts is time and effort invested, not better personalisation: both say the added questions were not used.
- Adapty's aggregate figures are correlational: apps with long onboarding are also the apps with plans to sell, so the figures do not show that lengthening a given app's flow would raise its revenue.
- Flo's position depends on a free core use that people return to for years; it is the closest public rationale to a free-first app.

### Gaps
- No public statement found from BetterMe or Welltech staff on onboarding design.
- No MacroFactor or Stronger By Science post found explaining the choice of no free tier or the shape of its onboarding.
- No MyFitnessPal, Strava, WHOOP, ZOE, Yazio or Fitbod statement found.
- Noom's own growth blog post ("An Introduction to Noom's Growth Machine") redirected and was not read; the 2021 podcast audio was not transcribed.

## Which of these apps are free at the point of onboarding, and how does their onboarding differ from the hard-paywall apps?

### Takeaway
Free at the point of onboarding: Cronometer, Strava, Flo, MyFitnessPal, Lose It!, Yazio and Fitbod (for a first few workouts). The free-first apps divide into two styles: short, account-first flows with no quiz (Cronometer, Strava) and long quiz flows that end in a dismissible paywall (Lose It!, Yazio, MyFitnessPal).

### Cited Findings
- Cronometer [snippet only]: no card to sign up, free version usable indefinitely, Gold chosen later from the account page; no lengthy quiz. — [Cronometer support](https://support.cronometer.com/hc/en-us/articles/360028026971); [Fortune](https://fortune.com/article/cronometer-review/)
- Strava: 23 screens, account and profile first; [snippet only, unsourced claim] it syncs a connected device at sign-up and shows the person's last activity within about 30 seconds. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows); [PaywallPro on DEV, 22 December 2025](https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0)
- Flo: core tracking free; paid features are offered when needs change (trying to conceive, postpartum, perimenopause), converting people three, six and twelve months later. — [RevenueCat Sub Club](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026.md)
- Lose It!: aims for "an excellent free product"; still runs a 72-step flow ending in a 7-day-trial paywall. — [RevenueCat](https://www.revenuecat.com/blog/growth/50-million-users-5-key-strategies-lessons-from-lose-it.md); [ScreensDesign](https://screensdesign.com/showcase/lose-it-calorie-counter)
- Fitbod: onboarding is built around getting to a first generated workout, which is free; the paywall waits until the workout exists. — [ScreensDesign](https://screensdesign.com/showcase/fitbod-gym-fitness-planner)
- MyFitnessPal: shortest of the big calorie apps in ScreensDesign's capture (19 steps, paywall at about two and a half minutes), then a free dashboard with premium features locked. — [ScreensDesign](https://screensdesign.com/showcase/myfitnesspal-calorie-counter)
- Hard-paywall contrast: BetterMe (36 steps in-app, 70 on web, projection chart then paywall then upsells), Noom web (up to 113 screens, email gate, paid trial), MacroFactor (trial required), WHOOP (membership required). — [ScreensDesign BetterMe](https://screensdesign.com/showcase/betterme-health-coaching); [RevenueCat Noom](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md); [App Store GB MacroFactor](https://apps.apple.com/gb/app/id1553503471); [WHOOP trials](https://ww2.whoop.com/whoop-trials/)
- [Third-party estimates, undated, internally inconsistent] ScreensDesign's monthly revenue estimates: MyFitnessPal $11.0M; Yazio $2.75M or $4.2M; Fitbod $0.98M or $2.25M; Lose It! about $1.0M; BetterMe Well-Being Coach $1.0M; Noom app $0.5M or $0.9M (Noom sells mainly on the web, which store estimates miss); Cal AI "$1.8M" (period unclear). The same page often gives two different figures. — [ScreensDesign MFP](https://screensdesign.com/showcase/myfitnesspal-calorie-counter); [ScreensDesign Yazio](https://screensdesign.com/showcase/yazio-calorie-counter-diet); [ScreensDesign Fitbod](https://screensdesign.com/showcase/fitbod-gym-fitness-planner)

### Inferences
- Being free at onboarding does not predict a short onboarding: Lose It! and Yazio are free to use and among the longest. What the free-first apps have in common is that the first paywall can be closed and the product works afterwards.
- The free-first apps that skip the quiz (Cronometer, Strava) sell to people who already know what they want to track; the quiz-heavy free apps sell weight loss.
- By ScreensDesign's estimates the largest earner in the set (MyFitnessPal) has the shortest calorie-app onboarding, but those estimates are too inconsistent to rest a conclusion on.

### Gaps
- No published completion or conversion numbers for any free-first app's onboarding.
- ZOE: whether any part of the app is free at onboarding is not established; sources only show a paid membership.
- Simple and Lifesum: no reliable information on free tier or paywall type found.

## Any criticism or regulatory trouble tied to onboarding design?

### Takeaway
Two documented cases: Noom's $62 million class-action settlement in 2022 over "risk-free" trials that rolled into hard-to-cancel renewals, and Apple's removal of Cal AI from the App Store in April 2026 for paywall design it called deceptive. Both concern the trial and price screens at the end of onboarding, not the questions.

### Cited Findings
- **Cal AI, April 2026**: Apple removed the app (by then owned by MyFitnessPal, acquired March 2026) and told TechCrunch the reasons were bypassing in-app purchase, deceptive billing design and other manipulative tactics. Specifics: under Guideline 3.1.1, an embedded Stripe payment flow that removed Apple's in-app purchase option; under 3.1.2(c), a paywall that showed the calculated weekly price more prominently than the amount actually billed, and a free-trial toggle that obscured automatic renewal; under 5.6 (Developer Code of Conduct), a second, different subscription flow shown after users declined the first offer, with many negative reviews calling the app a scam. The developer fixed the issues and the app was restored. MyFitnessPal and Cal AI did not comment. — [TechCrunch, 21 April 2026](https://techcrunch.com/2026/04/21/apples-cal-ai-crackdown-signals-its-still-policing-the-app-store/); [MacRumors, 21 April 2026](https://www.macrumors.com/2026/04/21/apple-cal-ai-app-store-removal/)
- [Snippet only] The app was reported reinstated four days after removal. — [9to5Mac](https://9to5mac.com/2026/04/21/popular-calorie-tracker-briefly-pulled-from-app-store-over-iap-and-billing-violations/)
- Cal AI background: founded by two high-school students; reached $50 million in annual recurring revenue before the acquisition (TechCrunch); the vendor case study gives 15 million downloads and roughly $40 million annual revenue within 18 months. — [TechCrunch](https://techcrunch.com/2026/04/21/apples-cal-ai-crackdown-signals-its-still-policing-the-app-store/); [Superwall](https://superwall.com/case-studies/cal-ai)
- **Noom, February 2022**: preliminary settlement in federal court in Manhattan of $62 million ($56 million cash, $6 million in subscription credits) for people who bought auto-renewing Healthy Weight subscriptions from May 2016 to October 2020. Plaintiffs alleged Noom lured customers into "risk-free" trials, then enrolled them in costly automatic renewals that were hard to cancel, collecting up to eight months of non-refundable payments of as much as $199. Noom denied wrongdoing. It agreed to practice changes valued at $31.2 million to $120 million. — [Euronews, 14 February 2022](https://www.euronews.com/next/2022/02/14/noom-settlement)
- [Snippet only] The agreed changes included trial-expiry reminders and easier cancellation in the app and on the website; a former engineer reportedly described cancelling as "difficult by design". — [Yahoo](https://sports.yahoo.com/noom-settles-billing-lawsuit-62-203622467.html)
- **Stale or inconsistent claims in Noom's live funnel (April 2026)**: the social-proof statistic is dated October 2021, a trial screen carries a "September 2021" date, and the pace the user picks did not change the projected end date. — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel.md)
- **User reaction**: [snippet only] an App Store reviewer called Yazio's onboarding "aggressive promo of subscription"; a Fitbod reviewer said everything locked once the free workouts ended and wished for a limited free version. — [App Store Yazio](https://apps.apple.com/kz/app/id946099227); [Indie Hackers](https://www.indiehackers.com/post/fitbod-app-review-2026-honest-take-after-real-testing-45d5f07a1b)
- **BetterMe**: the web paywall's fine print reads that the introductory plan "converts to recurring subscription at regular price" if not cancelled (the article's wording). No regulatory action found in this search. — [Web2App World](https://web2appworld.pages.dev/breakdowns/betterme-world)

### Inferences
- The practices Apple named (weekly-equivalent price larger than the billed price, a trial toggle, a second offer after declining) are standard in the category's paywall playbook and appear in other apps here (Noom's per-week price display, Yazio's wheel after declining). Apple's action against a top-five Health and Fitness app signals they are enforceable risks on iOS.
- Both cases were triggered by how the trial and renewal were presented and cancelled, which is the part of onboarding most exposed to consumer law in the UK and EU as well.

### Gaps
- Final court approval and payout details of the Noom settlement were not confirmed (the law-firm summary returned an error).
- No UK or Irish regulator action (CMA, ASA, CCPC) tied to any of these apps' onboarding was searched for or found; this needs its own pass.
- No Apple or Google enforcement found against Yazio, BetterMe or Lose It! over wheels, countdowns or trial messaging.
- Any FTC action against BetterMe or other Welltech-style quiz funnels was not searched for.

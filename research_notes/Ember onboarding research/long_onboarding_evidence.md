# Does longer onboarding perform better in consumer apps? Evidence for and against, 2025 to 2026

Research date: 26 November 2026. Evidence grades used throughout:

- **[RCT+numbers]** randomised or A/B experiment with published figures and enough detail to judge it
- **[A/B, thin]** described as an A/B test but without sample size, significance or baseline
- **[Benchmark]** observational dataset across many apps (correlation only)
- **[Vendor case]** case study published by a company that sells onboarding, paywall or billing tools
- **[Anecdote]** founder or practitioner statement, podcast remark, social post
- **[Teardown]** a description of what a flow looks like, with no performance data
- **[Academic]** peer-reviewed paper; **[Meta]** meta-analysis
- **[Recalled]** stated from the researcher's memory of the paper, not re-verified against a fetched page in this session

Figures from different sources are kept separate and are not averaged.

## 1. Where does the "long onboarding converts better" claim come from?

### Takeaway
The claim rests mainly on a handful of founder anecdotes (Lose It!, Cal AI, Monkey Taps), teardowns of big paid-acquisition health apps (Noom, Me+, BetterMe), and one large vendor benchmark (Adapty, 2026) that itself says the pattern is not causal. Every source measures trial starts, paid conversion or revenue per install on subscription apps with a paywall at the end of onboarding; none measures activation or retention on a free app, and I found no public randomised test with full numbers showing that adding screens raises total paying users.

### Cited Findings

**RevenueCat blog, "Why your onboarding experience might be too short" (Peter Meinertzhagen, 24 Aug 2023): the most-cited origin**
- Lose It! reported that trial start rates rose "double digits" as onboarding was lengthened, until diminishing returns set in. No exact figures, no A/B design, no sample size are given; the claim comes from a podcast conversation. Metric: trial start rate. **[Anecdote]** — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)
- Me+ (described as the UK's number one health and fitness app at the time) had about 45 to 50 onboarding screens taking the author 7 to 8 minutes. This is the author's own walk-through, with no performance data. **[Teardown]** — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)
- The same article says users believe their answers will tailor the product "even when some answers aren't used" (Lose It!), and that many screens make an app "seem backed by science" (Me+). **[Anecdote]** — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)
- The author's own caveats: trial start rate alone may mislead and longer onboarding could lower long-term revenue, so check realised LTV per customer; most apps should still follow the conventional low-friction approach and test longer flows on their own users. — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)
- No Headway or Flo data appears in that article, although both are often named alongside it in threads. — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)

**Cal AI (Zach Yadegari)**
- In a Founderpath interview Yadegari says Cal AI first asked only what the calorie estimate needed, then "started adding in different questions, which made the user spend more time ... But we saw an increase in conversion rate", attributing it to the user investing more time. No conversion figures, question counts, control group, split or sample size are given; the metric "conversion rate" is not defined. **[Anecdote]** — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)
- In the same interview he names the single biggest onboarding win as shortening the path to value in a different sense: "Definitely moving the sign in screens to the end because there is a lot of drop off there. That was the biggest by far." **[Anecdote]** — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)
- The Founderpath page notes annual renewals had not yet been measured at the time, and does not cover churn or refunds. — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)
- Superwall's case study says 87% of new Cal AI users see a paywall and that trial-to-paid conversion rose about 31% (relative) over 12 months, crediting a high volume of paywall experiments rather than onboarding length. (A further figure, 57% of paywall viewers starting a transaction, was surfaced by search but I did not verify it against the page.) **[Vendor case]** — [Superwall](https://superwall.com/case-studies/cal-ai)
- Adapty describes Cal AI as showing more than 25 onboarding cards before the paywall. **[Teardown]** — [Adapty](https://adapty.io/blog/how-to-personalize-onboarding-and-paywalls-in-your-mobile-app/)
- Yadegari's earlier app moved from ad-supported free to a hard paywall and he reports revenue multiplying roughly tenfold; this is the business model Cal AI's onboarding is tuned for. **[Anecdote]** — [Net Influencer](https://www.netinfluencer.com/cal-ai-founder-zach-yadegari-breaks-down-the-influencer-playbook-behind-his-apps-growth/)

**Noom**
- I found no published Noom A/B test comparing a long quiz with a short one. Descriptions of the funnel vary by source: "up to 113 screens" and 10 to 15 minutes (RevenueCat teardown), "96 screens" (a third-party breakdown), "40 to 50 questions" (another). These are outside observers' counts, not Noom disclosures. **[Teardown]** — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel); [web2appworld](https://web2appworld.pages.dev/breakdowns/noom)

**Adapty "State of Onboarding 2026" (the only large dataset on length)**
- Period November 2025 to October 2026, App Store only, medians computed per app, USD before store fees. The report does not state how many apps or onboardings are in the sample. **[Benchmark]** — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Trial starts per onboarding open: 4.95% for flows of 1 to 5 screens, falling to 2.1 to 2.8% for flows of 11 or more screens (apps that offer trials). — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Paid subscriptions per open: 1.20% for 1 to 5 screens against 2.33% for 21 or more screens. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Trial-to-paid rises from 19.7% (1 to 5 screens) to about 30% (11 or more); day-one trial cancellations fall from 59.8% to 36 to 41% in long flows. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Revenue per open: $0.36 for 1 to 5 screens against $1.39 for 21 or more, but between 1 and 20 screens it stays flat at $0.33 to $0.48. Revenue per subscriber: $49 after a 21-plus screen flow against $28 after a short one. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Completion: 89.7% for 1 to 5 screens against 62.8% for 21 or more. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Median onboarding length across apps is 5 screens; Health and Fitness 12, Education 9, Utilities and Productivity 4. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Adapty's own caveat: the length-to-revenue pattern is not presented as causal; long flows are mostly Health and Fitness and Education, "which sell differently"; finishing onboarding is correlated with paying, not its cause, because users who leave early had less intent to begin with. — [Adapty](https://adapty.io/state-of-onboarding/report/)

**Adapty blog, "How to fix your app onboarding flow" (Victoria Kharlan, updated 19 Dec 2025)**
- Entertainment app: a lengthy onboarding (questions, bot customisation, stats, loading screens) against no onboarding at all gave iOS payment conversions +40% and ARPU +20%; a later attempt to shorten the long flow gave conversions -13%. No app name, sample size or baseline. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)
- Productivity app: personalisation questions plus a "customising your experience" loading screen against generic feature demos gave trial starts +8.5%, paying conversions +17%, ARPU +22%. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)
- Education app: survey plus trial lesson beat survey only and lesson only (trial starts +25%, ARPU +78%, baseline not stated). **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)

**Monkey Taps (LinkedIn "Conversion Series #1: We made onboarding longer… and revenue went up")**
- Social posts by the team report that adding more than 10 screens raised trial starts by up to 30% with the same share converting to paid, and up to +20% revenue. No method or sample published. **[Anecdote]** — [LinkedIn post, via profile page](https://es.linkedin.com/in/nicolasfrateg)

**Mobbin, "The long onboarding: a study of 1,460 flows" (published 13 Jul 2026, updated 18 Nov 2026)**
- 1,460 flows from 986 well-known apps; mean 25 screens, range 3 to 187; Health and Fitness median 32.5 (n=84), Finance median 35 (n=93). 22% of the apps (217 of 986) show a paywall during onboarding; 23.4% personalise. **[Teardown]** — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- It contains no conversion or retention data; the author states the shared patterns cannot be proven to cause success and that "copying a pattern will not copy a result". — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)

**RevenueCat report commentary and Lenny's Newsletter**
- In the RevenueCat 2025 report commentary, Phil Carter lists "a short onboarding quiz", SSO sign-up and paywall view rate as the levers for trial starts; that is, the best-known consumer-subscription commentator recommends a short quiz, not a long one. **[Anecdote/expert opinion]** — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- Phil Carter's "Subscription Value Loop" (Lenny's Newsletter, September 2024) says even top-quartile consumer subscription apps convert roughly 1 in 20 installs to paid. **[Expert opinion citing benchmarks]** — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/the-subscription-value-loop-a-framework)

**Why the industry front-loads everything into the first session**
- RevenueCat 2025: 82% of trial starts happen on the day of install (Phil Carter's commentary; Hannah Parvaz says "80 to 90%"). **[Benchmark]** — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- RevenueCat 2026: share of trial starts on day 0 is 82.1% in Health and Fitness, 89.9% in Business; 50.6% of all paid conversions happen on day 0. **[Benchmark]** — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)

### Inferences
- The causal chain behind the claim is specific to one business model: paid acquisition, a paywall at the end of onboarding, and 80 to 90% of trials starting on day 0. In that model onboarding is the sales pitch, so "longer" really means "a longer pitch before the price". Nothing in these sources says length helps where there is nothing to sell at the end.
- Adapty's flat revenue per open from 1 to 20 screens ($0.33 to $0.48) is the most useful single number: within the range most apps live in, length shows no relationship with revenue. The jump only appears at 21-plus screens, which is where the Health and Fitness and Education quiz-funnel apps with high prices sit. That is a category and price effect at least as much as a length effect.
- The two best-known founder quotes (Lose It!, Cal AI) both describe adding questions the product did not need. Cal AI's own biggest win was moving sign-in to the end, which is a "value before asking" change, not a "more screens" change.
- Teardown libraries overstate how long typical onboarding is: Mobbin's curated sample averages 25 screens, while Adapty's per-app median is 5. (The two count different things: Mobbin counts every screen including sign-up and permissions in famous apps; Adapty counts screens built in its onboarding tool.)

### Gaps
- No published controlled test from Noom, BetterMe, Headway, Blinkist, Rise or Opal on onboarding length was found. Claims about these apps in threads are teardowns or hearsay.
- I could not find onboarding-length experiments from Superwall, Purchasely, Phiture, Appagent, Reforge or Growth.Design with numbers. Searches returned only the RevenueCat and Adapty material above.
- The original Lose It! podcast episode (Sub Club) was not fetched; the figures are as relayed by the RevenueCat article.
- Adapty does not disclose the sample size behind its onboarding report.

## 2. Published A/B tests where adding or removing onboarding steps changed results, in either direction

### Takeaway
The only length test I found with full published numbers (Everlove, 24,000 users, 2026) shows the trade-off cleanly: cutting 28 steps to 19 raised completion by 8.6 points, lowered trial starts per paywall view by 18%, left overall conversion flat, and leaned towards higher LTV per user in the shorter arm. Other tests go both ways, and the ones that favour longer flows are vendor case studies without sample sizes.

### Cited Findings

**Everlove (couples app, 150,000+ users): shorter against longer, published 19 Nov 2026 by RevenueCat**
- A/B test from 14 June 2026 of a 28-step onboarding against a 19-step version, 24,000 users worldwide (per-arm counts not given; randomisation method not described). **[RCT+numbers]** — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Onboarding completion: 78.10% long against 86.70% short (+8.60 points; strongly significant). Paywall reach among registered users: 74.26% against 83.92%. — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Trial start among paywall viewers: 3.83% long against 3.13% short (an 18% relative drop; strongly significant). — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Initial conversion among registered users: 3.35% long against 3.11% short (not significant). Trial-to-paid: 14.29% against 15.91% (not significant). — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Average LTV per registered user: $0.1163 long against $0.1592 short, +36.9% for the shorter flow, weakly significant (p = 0.093). — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Partner-joined rate (the app's activation event): 31.26% against 31.98%, no difference. Retention was tracked but not reported. — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Authors' conclusion: length should not be the first decision; find where the funnel loses most users first, and consider reintroducing removed questions later, after users have experienced the product. — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)

**Flo (women's health; web onboarding), Sub Club podcast write-up, 11 Nov 2026**
- Adding a step to determine a user's perimenopause phase first produced "almost 10% drop in conversion rate", twice. Analysis showed "almost 75% of the users were not assigned any perimenopause phase" because the question was hard to answer. A third version, rewritten with the medical team and without the dead end, "came back with 23% win"; a fourth test removing the section confirmed the lift by losing. No sample sizes. **[A/B, thin; first-party account]** — [RevenueCat](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026)
- Flo's growth lead Mike Charniatsou on the common belief "that short term conversion wins smoothly translates to business wins, which is not true"; he reconciles reported experiment uplifts against actual business growth annually. He also says about 40% of Flo's subscriptions occur after six months. **[Anecdote]** — [RevenueCat](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026)
- Adding partner mode to Flo's onboarding funnel was described as his biggest failure of the year. **[Anecdote]** — [RevenueCat](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026)

**Duolingo (free product): delaying sign-up**
- Moving the sign-up screen back a few steps, so people try a lesson first, gave "about a 20% increase" in daily active users. Later optimisation of soft and hard sign-up walls gave a further 8.2% DAU increase. Hard walls without prior soft walls performed "significantly worse" (no figure). Self-reported by Duolingo's VP of Growth in July 2017; no sample sizes, significance or durations. **[A/B, thin; first-party account]** — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- In the same account, Duolingo's users pick a daily goal during account setup (a prerequisite for streaks), but no metric is reported for the goal-setting step on its own. — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)

**Cal AI: sign-in moved to the end**
- "Moving the sign in screens to the end ... was the biggest by far." No figures. **[Anecdote]** — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)

**Adapty-reported tests where shorter or removal won**
- Education app: removing the onboarding loading screen entirely gave trial conversions +22% and ARPU +30%. No sample size. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)

**Adapty-reported tests where longer or added steps won**
- Entertainment app: long onboarding against none, payment conversions +40% (iOS), ARPU +20%; shortening it afterwards, conversions -13%. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)
- Education app: setting up notification reminders during onboarding rather than on the home screen gave trial conversions +6.4% and ARPU +24%. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)

**Five Minute Journal (journalling app), RevenueCat blog 23 Oct 2024, designed by agency Applica**
- Onboarding redesigned for personalisation, early testimonials and benefit-led copy (screen counts not given): ARPU +20% (p = 0.04), trial start rate about +10%, trial conversion about +14%. Sample size not reported. This is a content change, not a pure length change. **[A/B, thin; vendor case]** — [RevenueCat](https://www.revenuecat.com/blog/growth/five-minute-journal-onboarding-redesign-arpu)

**Calm: one added step that improved retention**
- After a user's first meditation, Calm showed a prompt to set a daily reminder (previously buried in Settings and found by fewer than 1% of users). 40% of those shown the prompt set a reminder, and they got a retention boost equal to that of users who had found the feature themselves; Amplitude headlines this as a 3x increase in retention. The retention window, baseline and control design are not given. **[Vendor case]** — [Amplitude](https://www.amplitude.com/case-studies/calm)

**Eyecon (caller ID app), Google Play case study**
- Google's case study is titled "Eyecon improves registration conversion by 30%"; the search snippet indicates the winning onboarding variant was the one that removed promotion of the paid tier. The page returned 404 on redirect, so the details are unverified. **[Vendor case; unverified]** — [Google Play](https://play.google.com/console/about/eyecon-casestudy/)

### Inferences
- Across these tests the consistent pattern is that shorter flows win at the top of the funnel (completion, reaching the next step) and longer flows win at the paywall (conversion per viewer). Which wins overall depends on which loss is bigger for a given app. Where there is no paywall, only the first half of that trade-off exists.
- The Flo sequence is a caution against reading a single test as a verdict on length: the same added step lost 10% twice and then won 23% once the question was answerable. Step quality mattered more than step count.
- Everlove's weak LTV signal in favour of the shorter flow, and its flat activation (partner joined), are the only published evidence on what happens downstream of a length change, and neither supports "longer is better".
- The steps that helped on retention-type metrics (Calm's reminder, Duolingo's lesson before sign-up) were steps that either set up a habit or delivered the product, not profile questions.

### Gaps
- I found no published onboarding-length experiments with numbers from Noom, Headspace, Strava, MyFitnessPal, Spotify, Airbnb or Monzo. Searches for these returned nothing usable; treat any figures attributed to them in threads as unverified.
- No test found reports retention at 30 days or later by onboarding length. Everlove tracked retention but did not publish it.
- Almost all published tests come from RevenueCat or Adapty, both of which sell tools in this area; tests that showed nothing are unlikely to be written up.

## 3. What the benchmark datasets say: hard paywall against freemium, and whether long-funnel users retain

### Takeaway
Hard-paywall apps convert about five times as many installs to paid as freemium apps (median about 11 to 12% against about 2%) and earn several times more per install in the first 60 days, while one-year subscriber retention is roughly the same in both. RevenueCat's refund figures conflict between years (hard paywalls refunded more in the 2025 report, slightly less in the 2026 report). The limited data on quiz-funnel web subscribers suggests they stay better in month 1 but churn faster by month 6.

### Cited Findings

**RevenueCat State of Subscription Apps 2025 (75,000 apps, $10B+ tracked revenue)**
- Day-35 download-to-paid median: hard paywall 12.11% against freemium 2.18%. **[Benchmark]** — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- One-year retention on monthly plans: hard paywall 12.8% against freemium 9.3% (median). Freemium yearly-plan first-year retention ranges from 18.7% to 59.0%. — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- Refund rate by access method: hard paywall 5.8% against freemium 3.4%. By category: Education 4.86%, Health and Fitness 4.71%, Travel 1.51%. — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)
- Download-to-trial: median 6.2%, top decile 20.3%. Health and Fitness trial-to-paid: median 39.9%, top 10% 68.3%. — [RevenueCat SOSA 2025](https://www.revenuecat.com/state-of-subscription-apps-2025)

**RevenueCat State of Subscription Apps 2026 (115,000+ apps, $16B+ revenue)**
- Day-35 download-to-paid median: hard paywall 10.7% (top quartile above 20.0%) against freemium 2.1% (top quartile above 4.5%). Defined as the share of installs with at least one paid subscription within 35 days of install. **[Benchmark]** — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
- Note: RevenueCat's own blog summary describes the same 10.7% against 2.1% as "trial-to-paid" in the text and "download-to-paid" in the chart caption; the report's definition (download-to-paid) is the one to use. — [RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- Revenue per install: hard paywall $3.09 against freemium $0.38 at day 60. — [RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- Twelve-month retention, median: yearly plans freemium 28% (range 17 to 58%) against hard paywall 27% (range 17 to 54%); monthly plans freemium 8% against hard paywall 9%; weekly plans about 1 to 2% for both. RevenueCat's conclusion: access method is a conversion choice, not a retention lever. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
- Refund rate, median: hard paywall 2.5% (interquartile 1.3 to 5.6%) against freemium 2.9% (1.5 to 5.3%). This is the opposite direction to the 2025 report. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
- Health and Fitness 2026: day-35 download-to-paid median 2.9% (top quartile above 6.2%); download-to-trial median 6.9%; trial-to-paid median 37.7%; year-1 realised LTV per payer median $35.64. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
- Annual-plan cancellations: about 35% happen in month 1 (range 23 to 50% by category). For 3-day trials, 55.4% of cancellations happen on day 0 and 84% by day 1. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/); [RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- In the same report, practitioner Ben Gammon says users adopt features at higher rates when coached in context rather than in onboarding. **[Anecdote]** — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)

**Do long-funnel users retain?**
- Adapty State of Onboarding 2026: after long flows (11-plus screens), trial-to-paid is about 30% against 19.7% for 1 to 5 screens, and day-one trial cancellations are 36 to 41% against 59.8%. Observational; Adapty attributes part of this to intent. **[Benchmark]** — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Adapty State of In-App Subscriptions 2026 (16,000+ apps), as reported by Airbridge: web-to-app (web paywall) subscribers show month-1 retention of 84.5% against 48.2% for in-app purchasers, but month-6 retention of 20% against 30%; raw LTV $10.8 web against $40.1 in-app; download-to-paid 1.13% web against 1.65% in-app. **[Benchmark, secondary report]** — [Airbridge](https://www.airbridge.io/en/blog/web-to-app-funnels-explained)
- FunnelFox states that for a typical app about a third of monthly subscribers who cancel do so within three days of paying. **[Vendor claim]** — [FunnelFox](https://blog.funnelfox.com/keeping-users-after-first-payment/)
- RevenueCat states in general terms that web subscribers tend to renew at higher rates than store subscribers, with no figure. This conflicts with the Adapty month-6 figures above. **[Vendor claim]** — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-funnels); contradicted by [Airbridge citing Adapty](https://www.airbridge.io/en/blog/web-to-app-funnels-explained)

### Inferences
- The hard-paywall advantage is a conversion and cash-flow advantage, not a retention advantage. The dataset that popularised "hard paywalls win" shows no one-year retention benefit (27% against 28% on yearly plans in 2026).
- Hard-paywall figures are conversion rates among people who installed an app that will not work without paying; freemium figures are spread over a much larger base of free users. Comparing the two rates says little about total paying users or total value, and nothing about a free app.
- The Adapty web-against-app figures are not like-for-like (web trials are often paid, prices and plan lengths differ, and "web" is not the same as "long quiz"), so they are suggestive only. They do fit the selection story: a quiz and checkout filter for intent, which shows up as good month-1 retention, without producing durable retention.
- Because the 2025 and 2026 refund comparisons point in opposite directions, the claim that hard paywalls generate more refunds should be treated as unsettled.

### Gaps
- RevenueCat 2024 report figures by paywall type were not retrieved; only 2025 and 2026 are recorded here.
- No dataset reports retention or renewal split directly by onboarding length or by "quiz against no quiz". Adapty's onboarding report covers conversion and revenue, not retention beyond the trial.
- The Adapty in-app subscriptions figures were taken from a secondary write-up; the original report was not checked.
- The RevenueCat web pages are previews of longer PDFs; some definitions (for example realised LTV) are not on the page.

## 4. The behavioural science: original papers, effect sizes and replications

### Takeaway
The mechanisms cited in onboarding threads are real but mostly small, context-bound, or untested in this setting. Foot-in-the-door averages about r = .17 and needs a prosocial request; the IKEA effect needs a completed product; endowed progress and the labour illusion rest on a few original studies with no independent replication found. The two with the strongest evidence, implementation intentions (d = .65) and goal setting (d = .34), are about helping people act on goals, which is a retention argument for a few specific steps, not an argument for more screens.

### Cited Findings

**Commitment and consistency; foot-in-the-door**
- Freedman and Fraser (1966): 76% of people who had first agreed to a small "Be a Safe Driver" window sign later agreed to a large "Drive Carefully" yard sign, against 17% of controls. **[Academic]** — [Wikipedia summary with reference to JPSP 4(2), 195 to 202](https://en.wikipedia.org/wiki/Foot-in-the-door_technique)
- Dillard, Hunter and Burgoon (1984) meta-analysis: the foot-in-the-door effect is r = .17, "small even under optimal conditions"; it requires a prosocial topic; and the positive relationship between effort on the first request and compliance predicted by self-perception theory was not found. **[Meta]** — [Penn State research portal](https://pure.psu.edu/en/publications/sequentialrequest-persuasive-strategies-metaanalysis-of-footinthe/)
- Beaman et al. (1983) meta-analysis of 15 years of studies concluded the phenomenon, "although replicable, is weak and not nearly as robust as assumed", with nearly half of studies showing no effect or an effect in the wrong direction (as surfaced in search of the abstract). **[Meta]** — [DOI 10.1177/0146167283092002](https://doi.org/10.1177/0146167283092002)
- Burger (1999) reviewed the literature as a multiple-process phenomenon, with conditions under which the effect disappears or reverses. **[Review]** — [DOI 10.1207/s15327957pspr0304_2](https://doi.org/10.1207/s15327957pspr0304_2)

**IKEA effect**
- Norton, Mochon and Ariely (Journal of Consumer Psychology 22(3), 2012): participants who assembled IKEA furniture were willing to pay 63% more than those given pre-built versions. The authors state that "labor leads to love only when labor results in successful completion of tasks"; when participants destroyed or failed to finish their creations the effect disappeared. **[Academic]** — [Wikipedia summary](https://en.wikipedia.org/wiki/IKEA_effect); [SSRN](https://papers.ssrn.com/abstract=1777100)
- Sarstedt, Neubert and Barth (Journal of Marketing Behavior 2(4), 2017) conceptually replicated it and found psychological ownership to be the mechanism; destroying the finished product significantly reduced willingness to pay. **[Academic replication]** — [Now Publishers](https://nowpublishers.com/article/Details/JMB-0039)

**Sunk cost**
- Arkes and Blumer (1985), "The psychology of sunk cost", Organizational Behavior and Human Decision Processes 35, 124 to 140, includes a field experiment with theatre season tickets in which full-price buyers attended more plays early in the season than discounted buyers, with the difference fading in the second half. **[Academic; Recalled, not re-verified this session]** — [DOI 10.1016/0749-5978(85)90049-4](https://doi.org/10.1016/0749-5978(85)90049-4)
- A registered-report replication of Soman (2001) found sunk-cost effects for both money and time, contrary to the original claim that time sunk costs are weaker; in Study 1 the replication effect was smaller than the original (original ϕc = .61 [.43, .78]; replication ϕc = .38 [.31, .45]). **[Academic replication]** — [PCI Registered Reports](https://rr.peercommunityin.org/articles/rec?id=187); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12372683/)
- A sunk-cost scenario (from Oppenheimer, Meyvis and Davidenko 2009) was one of 13 effects tested in the Many Labs 1 project. **[Academic replication project]** — [Klein et al. 2014, DOI 10.1027/1864-9335/a000178](https://www.doi.org/10.1027/1864-9335/A000178)

**Endowed progress effect**
- Nunes and Drèze (Journal of Consumer Research 32(4), 2006): converting an eight-step task into a ten-step task with two steps already complete increases the likelihood of completion and shortens completion time; the effect depends on perceptions of task completion rather than avoiding waste, and is moderated by whether a reason is given for the head start. **[Academic]** — [IDEAS/RePEc abstract](https://ideas.repec.org/a/oup/jconrs/v32y2006i4p504-512.html)
- The car-wash loyalty card study (300 cards) is widely reported as 34% redemption with two free stamps on a ten-stamp card against 19% for a blank eight-stamp card. **[Academic, figures via secondary source]** — [Coglode](https://www.coglode.com/nuggets/endowed-progress-effect)

**Goal-gradient effect**
- Kivetz, Urminsky and Zheng (Journal of Marketing Research 43, 2006): customers given a 12-stamp coffee card with two bonus stamps completed the ten required purchases faster than those with a regular 10-stamp card ("illusionary goal progress"); in the campus coffee-card study, time between purchases shortened by about 20% from first to last stamp. The authors report that the illusionary progress effect cannot be explained by sunk cost. **[Academic]** — [Columbia Business School](https://business.columbia.edu/faculty/research/goal-gradient-hypothesis-resurrected-purchase-acceleration-illusionary-goal)

**Labour illusion and operational transparency ("building your plan" screens)**
- Buell and Norton (Management Science 57(9), 2011): across five experiments simulating online travel and online dating sites, people can prefer sites with longer waits over instant results, even when results are identical, if the site signals the effort it is exerting; the proposed mechanism is reciprocity. **[Academic]** — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.1110.1376)
- Field counter-example from industry: an education app that removed its onboarding loading screen entirely saw trial conversions +22% and ARPU +30%; a productivity app that added personalisation questions with a "customising your experience" loading screen saw trial starts +8.5%. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)

**Personalisation and the Barnum (Forer) effect**
- Forer (1949) gave 39 psychology students an identical personality sketch assembled from a newsstand astrology book, presented as individual feedback; the average accuracy rating was about 4.3 out of 5. The effect is consistently found when statements are vague. **[Academic]** — [Wikipedia summary](https://en.wikipedia.org/wiki/Barnum_effect)
- Industry practice consistent with it: Lose It! is reported as saying users believe their answers tailor the product "even when some answers aren't used"; Adapty found that 33% of top apps with a quiz show no plan screen or answer playback at all, and only 9% of checked paywalls showed the user's name, goal or target date. **[Anecdote; Benchmark]** — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short); [Adapty](https://adapty.io/state-of-onboarding/report/)

**Implementation intentions**
- Gollwitzer and Sheeran (2006) meta-analysis of 94 independent studies and over 8,000 participants: forming if-then plans had an effect of d = .65 on goal attainment over and above goal intentions alone, described as medium to large. **[Meta]** — [PMC summary citing the meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892)
- A later meta-analysis of implementation intentions for healthy eating found a smaller effect, d = .34 across 80 studies (as surfaced in search; not checked against the paper). **[Meta, secondary]** — [Comillas repository](https://repositorio.comillas.edu/rest/bitstreams/71302/retrieve)

**Goal setting**
- Epton, Currie and Armitage (Journal of Consulting and Clinical Psychology 85(12), 2017): 141 papers, 384 effect sizes, N = 16,523; goal setting had a small positive unique effect on behaviour, d = .34, 95% CI [.28, .41]. Goals worked best when difficult but achievable, set publicly, set face to face and set as a group goal. **[Meta]** — [PubMed](https://pubmed.ncbi.nlm.nih.gov/29189034/)

### Inferences
- Foot-in-the-door is the weakest fit for the job it is given in onboarding threads. The meta-analytic effect is small, depends on prosocial requests (charity, safety, civic causes), and showed no relationship with effort on the first request. "Answering more questions makes people more likely to pay" is not what the literature tested.
- The IKEA effect only appears when the person completes something they then own. A quiz that ends in a visible, personal plan is closer to the tested condition than a quiz whose answers vanish; a third of quiz apps do the latter (Adapty).
- Endowed progress and goal gradient are evidence about how to make a fixed-length task feel shorter and get finished (a progress bar that starts part-filled, visible nearness to the end). They support completion of a flow, not making the flow longer.
- The labour illusion was shown for waits that do visible work on a search the person asked for. Whether a fake "analysing your answers" animation has the same effect is untested in the academic literature, and the one industry test I found that removed a loading screen saw conversions rise.
- The Barnum effect explains why a generic "plan" feels personal. Using that deliberately would breach this project's own rule that nothing fake is presented as real.
- Implementation intentions and goal setting have the best evidence and they bear on behaviour after onboarding. They justify at most two onboarding steps for a free health app: set a specific goal, and pick when and where the first action happens (the Calm reminder prompt is the applied version).

### Gaps
- No direct replication or meta-analysis of the endowed progress effect was found; the 34% against 19% figures come from secondary sources and one of those sources misdescribes the design.
- No independent replication of Buell and Norton (2011) was found. Non-academic sites claim lifts "of 8% to 36%" and a dating-site replication; I could not verify either.
- The Many Labs 1 effect size for the sunk-cost item was not retrieved (my recollection is that it replicated with a small effect, but this is unverified).
- Arkes and Blumer's figures were not re-verified this session.
- Locke and Latham's goal-setting reviews and Cialdini's own account were not fetched; Epton et al. (2017) is used as the quantitative summary instead.
- A 2024 implementation-intentions meta-analysis by Sheeran and colleagues was searched for and not found; do not cite it without checking.
- None of these papers tested app onboarding. Every link from mechanism to "more screens convert better" is practitioners' inference.

## 5. Counter-evidence and limits

### Takeaway
The strongest counter-argument is selection: long flows lose more people before the end (completion 62.8% against 89.7% in Adapty's data) and those who finish are the high-intent ones, so conversion per finisher rises while total conversions may not. Add survivorship in teardown culture, usability research that says to skip onboarding where possible, and a regulatory and reputational record that attaches to exactly the apps most often held up as models.

### Cited Findings

**Selection and funnel arithmetic**
- Adapty: completion falls from 89.7% (1 to 5 screens) to 62.8% (21-plus); trial starts per open fall from 4.95% to 2.1 to 2.8% as flows lengthen; the report states that users who leave early had less intent to begin with and that the pattern is not causal. **[Benchmark]** — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Everlove's randomised test shows the mechanism directly: the longer flow converted 3.83% of paywall viewers against 3.13%, yet overall conversion of registered users was statistically flat (3.35% against 3.11%) because fewer people reached the paywall. **[RCT+numbers]** — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)

**Per-screen drop-off**
- Adapty: 10.2% of sessions end on screen 1, about five times any later screen; from screen 3 onward each screen loses 1.5% or less; in long flows up to 19.3% leave mid-flow; under 1% leave on the second-to-last screen in every length bucket. Median time to complete is 14 seconds overall and 172 seconds for 21-plus screens. **[Benchmark]** — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Adapty's rule of thumb: losing more than 20 to 30% of users at a single screen is a red flag. **[Vendor guidance]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)

**Survivorship in teardown culture**
- RevenueCat's own guest author (Nathan Hudson, 15 Jul 2025) argues that teardowns focus on large brands that "get more attention", so the quiz model is over-represented; quizzes suit apps that need personalisation or education and add friction for simpler products; users may eventually "tune out" as the format saturates. No data. **[Expert opinion]** — [RevenueCat](https://www.revenuecat.com/blog/growth/web-to-app-funnels-are-not-onboarding-quizzes)
- Mobbin's study of 986 well-known apps has a mean of 25 screens and no performance data, while Adapty's per-app median is 5 screens. — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows); [Adapty](https://adapty.io/state-of-onboarding/report/)

**Usability research**
- Nielsen Norman Group recommends avoiding app onboarding whenever possible and spending the effort on a more usable interface, because onboarding carries interaction cost; it limits useful onboarding to cases where the app needs information before anyone can start. **[Qualitative UX research]** — [NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/)
- In NN/g's tutorial study, users who read tutorials had a slightly lower task success rate (91%) than those who skipped them (94%), and skippers rated tasks as easier. **[Small-sample UX study]** — [NN/g](https://www.nngroup.com/articles/mobile-tutorials/)
- Apple's Human Interface Guidelines say people want to start using an app right away. — [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/onboarding)

**Form-length research (mixed, not a simple "fewer is better")**
- Baymard: 17% of surveyed shoppers abandoned a purchase in the last three months because checkout was too long or complicated (2024 and 2026 benchmarks; older Baymard figures were 26 to 27%); the average checkout in 2024 had 5.1 steps and 11.3 form fields. **[Survey + benchmark]** — [Baymard](https://baymard.com/blog/checkout-flow-average-form-fields)
- HubSpot's analysis of 40,000+ landing pages found conversion falls only slightly as fields increase, not as steeply as expected. **[Benchmark]** — [HubSpot](https://blog.hubspot.com/blog/tabid/6307/bid/6746/which-types-of-form-fields-lower-landing-page-conversions.aspx)
- Unbounce case: cutting a form from nine fields to six produced a 14% drop in conversions; keeping nine fields but clarifying labels and marking optional ones produced a 19% increase. CXL notes the "fewer fields always wins" rule traces largely to one 2007 to 2008 case study. **[Single case study]** — [CXL](https://cxl.com/blog/reduce-form-fields/)

**Short-term wins that do not last**
- Flo's growth lead: the belief that short-term conversion wins translate smoothly into business wins "is not true". **[Anecdote]** — [RevenueCat](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026)
- RevenueCat 2026: 55.4% of 3-day-trial cancellations happen on day 0; about 35% of annual-plan cancellations happen in month 1. **[Benchmark]** — [RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026); [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)

**Regulatory and reputational costs**
- Noom agreed in February 2022 to pay $56 million in cash plus $6 million in subscription credits to settle a private class action alleging deceptive trial and auto-renewal practices (dark patterns), and to add clearer auto-renewal disclosure, a separate consent action and a cancel button. This was a class action, not an FTC case. — [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/2022/02/22/fitness-app-agrees-to-pay-56-million-to-settle-class-action-alleging-dark-pattern-practices/)
- Vice reported that the Better Business Bureau had received 2,295 complaints about Noom alleging misleading free trials and difficult cancellation. — [Vice](https://vice.com/en/article/does-the-noom-app-actually-help-you-lose-weight)
- FTC staff report "Bringing Dark Patterns to Light" (15 September 2022) names four categories: misleading consumers and disguising ads; making it difficult to cancel subscriptions or charges; burying key terms and junk fees; tricking consumers into sharing data. — [FTC](https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers)
- UK CMA, "Online choice architecture: how digital design can harm competition and consumers" (5 April 2022), with an evidence review of 21 practices. — [GOV.UK](https://www.gov.uk/government/publications/online-choice-architecture-how-digital-design-can-harm-competition-and-consumers)
- The FTC's "click-to-cancel" rule was vacated by the US Eighth Circuit on 8 July 2025 on procedural grounds; ROSCA, section 5 of the FTC Act and state auto-renewal laws still apply. — [Greenberg Traurig](https://www.gtlaw.com/en/insights/2025/7/eighth-circuit-vacates-ftcs-click-to-cancel-rule)
- The UK subscription-contracts regime under the Digital Markets, Competition and Consumers Act was, per law-firm notes in 2026, brought forward to January 2027, with secondary legislation still unpublished as of October 2026. — [DWF](https://dwfgroup.com/en/news-and-insights/insights/2026/10/dmcca-subscription-contracts-regime-preparing-for-the-new-restrictions); [Lewis Silkin](https://www.lewissilkin.com/en/insights/2026/04/02/consumer-law-update-subscriptions-regime-delayed-again-to-spring-2027-102mops)
- A competitor's blog (commercially interested, low reliability) claims BetterMe's quiz "creates an impression of deep personalization" while routing users into pre-existing template plans. — [Nutrola](https://nutrola.app/en/blog/why-is-betterme-so-expensive-now)

### Inferences
- "Conversion rate went up when we added screens" is compatible with fewer total customers, because the denominator shrinks. Only revenue or paying users per install (or per registered user) settles it, and the one randomised test that reports that (Everlove) found no difference in conversion and a lean towards the shorter flow on LTV.
- Adapty's per-screen data cuts both ways. The marginal cost of one more screen after screen 3 is small (1.5% or less), which is why adding screens rarely looks bad in a test. But it compounds: long flows lose up to 19.3% mid-flow, and the biggest single loss is the very first screen.
- The form-length literature does not support a simple rule in either direction. What it supports is that unclear or seemingly pointless fields cost more than the count itself, which matches the Flo result.
- The regulatory record attaches to billing, cancellation and data practices, not to onboarding length as such. The exposure in a quiz flow is collecting personal or health data that is not then used, and presenting generic output as personal.
- For an app with EU and UK users handling health data, asking onboarding questions whose answers are not used looks hard to square with the GDPR's data-minimisation principle (Article 5(1)(c)). This point was not researched in this session and should be checked with whoever advises on privacy before any questions are added "for investment".

### Gaps
- No source found measures user backlash against long quizzes (for example review sentiment by onboarding length). App Store review text was not examined.
- No regulator material found addresses long onboarding quizzes specifically.
- EU instruments (Digital Services Act Article 25, the Unfair Commercial Practices Directive, the proposed Digital Fairness Act) and the Irish position were not researched.
- The CMA page fetched did not list the 21 practices by name; the evidence review itself was not read.

## 6. Does any of this apply to a free app with no paywall?

### Takeaway
Almost none of the "longer is better" evidence transfers. Every positive result is measured at a paywall. The evidence that does address free or pre-payment use (Duolingo, Cal AI's sign-in move, Calm, NN/g, Everlove's activation metric) points towards getting people to the product quickly, delaying sign-up friction, and keeping only steps that set up a habit or are needed for the product to work.

### Cited Findings
- Duolingo, a free product: letting people try a lesson before the sign-up screen gave about a 20% increase in daily active users; later tuning of sign-up walls added 8.2%. Self-reported, 2017. **[A/B, thin]** — [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Cal AI: moving sign-in to the end of onboarding was "the biggest by far" because of the drop-off at sign-in. **[Anecdote]** — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)
- Calm: a single prompt after the first session to set a daily reminder was taken up by 40% of those shown it and is credited with a 3x retention lift (window and control not stated). **[Vendor case]** — [Amplitude](https://www.amplitude.com/case-studies/calm)
- Everlove: cutting nine steps made no difference to the activation event (partner joined: 31.26% long against 31.98% short) while raising completion by 8.6 points. **[RCT+numbers]** — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- Everlove's authors suggest moving removed questions to later, after users have experienced the product. — [RevenueCat](https://www.revenuecat.com/blog/growth/everlove-onboarding-experiment)
- NN/g: avoid onboarding where possible; the exception is information the app needs before anyone can start. — [NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/)
- Mobbin's author makes the same distinction from the other side: onboarding length should follow what the app needs from the user before it can work, and a skip button is right for apps where users already know their goal. **[Opinion]** — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- RevenueCat 2026 advises treating onboarding as "your primary retention mechanism" and says users who do not reach an "aha" moment in the first session are likely to cancel; a contributor in the same report says users adopt features at higher rates when coached in context rather than in onboarding. **[Opinion]** — [RevenueCat blog](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026); [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
- Adapty: in apps without a strong price at the end (1 to 20 screens), revenue per open is flat; short flows have 89.7% completion. — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Goal setting has a small positive effect on behaviour (d = .34) and if-then planning a medium-to-large one (d = .65) in meta-analyses of behaviour change generally, not of app onboarding. **[Meta]** — [PubMed](https://pubmed.ncbi.nlm.nih.gov/29189034/); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892)
- A B2B counter-example sometimes cited for "friction is good": Equals removed its onboarding call and went freemium, which its founder says reversed growth until some friction was restored (Lenny's Newsletter, 28 Nov 2023). This is a B2B spreadsheet product with human sales onboarding, not a consumer app. **[Anecdote]** — [Lenny's Newsletter](https://www.lennysnewsletter.com/p/lessons-from-going-freemium-a-decision)

### Inferences
- In a paywalled app the selection effect of a long flow is partly useful: it filters to people likely to pay, and people who leave cost nothing further. In a free app every person lost before first use is a pure loss, and there is no paywall conversion to gain in exchange. The trade-off that makes long flows work has only its cost side.
- The transferable part of the evidence is narrow: (a) ask only what the product needs in order to work on day one (for a calorie app, the inputs to a target); (b) put the first real use before or alongside account friction where possible; (c) include a goal and a when-and-where step, because those have retention evidence; (d) move everything else to in-context prompts later.
- A free app that requires sign-in before anything else is on the wrong side of the Duolingo and Cal AI results. Where sign-in first is a fixed decision, that is an argument for keeping what follows short, because the largest drop has already been taken.
- If a subscription is added later, the calculation changes, and the Everlove result suggests the place to add persuasion is just before the paywall, not at first launch.

### Gaps
- I found no published experiment on onboarding length in a free consumer app with activation or retention as the outcome. The Duolingo and Calm results are about step placement and one added step. This is the biggest hole in the evidence relative to the question asked.
- No source found measures day-7 or day-30 retention by number of onboarding screens for any app, free or paid.
- Spotify, Strava, Headspace, MyFitnessPal, Airbnb and Monzo: nothing citable found on onboarding length.

## 7. What practitioners say makes long onboarding work when it does

### Takeaway
Practitioner advice converges on a short list (progress indication, questions that are easy to answer and visibly used, value or a result shown before the ask, sign-in last, reflecting answers back), but only a few items have any measured support, and I found no measured evidence at all for one question per screen, progress bars or skippable questions.

### Cited Findings

**With some measured support**
- Sign-in at the end rather than the start: Cal AI's biggest onboarding win; Duolingo's delayed sign-up (+20% DAU). **[Anecdote; A/B, thin]** — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing); [First Round Review](https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker)
- Questions must be answerable and must not dead-end: Flo's unanswerable question cost about 10% conversion; the fixed version won 23%. **[A/B, thin]** — [RevenueCat](https://www.revenuecat.com/blog/growth/mike-charniatsou-flo-sub-club-podcast-2026)
- Let people try the product inside onboarding: survey plus a trial lesson beat survey only and lesson only (trial starts +25%). **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)
- Outcome-led rather than feature-led copy: trial conversions +17%, ARPU +13% (productivity app). **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)
- Set up reminders during onboarding rather than later: trial conversions +6.4% (education app); Calm's reminder prompt after first session, 40% uptake. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/); [Amplitude](https://www.amplitude.com/case-studies/calm)
- Animated screens: Cal AI "animated those screens, tested it again, also boosted the conversion rate". No figures. **[Anecdote]** — [Founderpath](https://founderpath.com/resources/zach-yadegari-cal-ai-onboarding-tests-and-influencer-marketing)
- Loading or "building your plan" screens: contradictory. One test with a loading screen as part of a personalised flow won; another that removed the loading screen entirely won by +22% trial conversions. **[A/B, thin; vendor case]** — [Adapty](https://adapty.io/blog/how-to-fix-your-onboarding-flow/)
- The first screen matters most: 10.2% of sessions end on screen 1, about five times any later screen. **[Benchmark]** — [Adapty](https://adapty.io/state-of-onboarding/report/)
- People spend longer per screen in long flows (about 5.5 seconds) than short ones (about 2 seconds), which suggests long flows that survive are being read rather than tapped through. **[Benchmark]** — [Adapty](https://adapty.io/state-of-onboarding/report/)

**Asserted without measured support**
- Mobbin's five elements that make long flows feel shorter: a progress bar, personal questions, a "mirror" reflecting the user's answers, a chance to try the product, and a plan built from the answers; long flows should "feel like a conversation rather than a form"; the paywall should come after personalisation and be announced. **[Opinion from teardowns]** — [Mobbin](https://mobbin.com/blog/the-long-onboarding-a-study-of-1-460-flows)
- RevenueCat (2023): progress bars reduce perceived effort; explain why each question is asked (from an analysis of Noom); vary question styles to reduce fatigue; add testimonials; show projected progress before the paywall (Fitbod shows a three-month projection). **[Opinion from teardowns]** — [RevenueCat](https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short)
- Reflecting answers back is less common than the advice implies: 33% of top apps with a quiz show no plan screen or answer playback; 52% personalise the onboarding; 46% of top apps ask questions at all. **[Benchmark of design patterns, not of impact]** — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Paywall placement in top apps: 14 of 20 checked put the first paywall at the end of onboarding; 2 of 20 show it right after a plan-ready screen. Adapty states these describe design patterns, "not their impact on conversion". — [Adapty](https://adapty.io/state-of-onboarding/report/)
- Monkey Taps attribute their gains from added screens to users feeling "understood rather than interrogated". **[Anecdote]** — [LinkedIn post, via profile page](https://es.linkedin.com/in/nicolasfrateg)

### Inferences
- The measured items are mostly about what a step does (delivers the product, sets up a habit, asks something answerable, delays a cost), not about how many steps there are. A flow can be made better on every one of these without getting longer.
- The academic work lines up with a subset of the advice: a progress bar that starts part-filled (endowed progress, goal gradient) helps completion; a plan the person has visibly shaped (IKEA effect, conditional on completion) raises perceived value; a goal plus a when-and-where plan (goal setting, implementation intentions) helps later behaviour. It does not line up with fake analysis screens or unused questions.
- For this project, several of the industry's techniques conflict with standing rules: a generic plan presented as personal, an invented "analysing" delay, and testimonials that are not real would all breach "nothing fake presented as real".

### Gaps
- No measured evidence was found for: one question per screen against grouped questions; a progress bar against none in app onboarding; skippable against mandatory questions. Adapty's 2026 report explicitly does not cover progress bars or skippable questions.
- No source measured whether reflecting answers back changes conversion or retention; only its prevalence is reported.
- Growth.Design, Reforge and Phiture material on these points was not found or not accessible.

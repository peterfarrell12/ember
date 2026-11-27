// Coaching between two real accounts, in two real browsers against the LOCAL Supabase: a coach invites a
// client, the client chooses what to share, the coach sees that and only that, looks at the client's app
// read-only, sets targets the client accepts, they exchange messages, and the client pauses and ends it.
//   cd supabase && npm run start && npm run test:coach
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const { chromium } = createRequire(import.meta.url)("playwright");
const web = fileURLToPath(new URL("../../web", import.meta.url));
const env = Object.fromEntries(
  execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8" })
    .split("\n")
    .map((l) => l.match(/^(\w+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
assert.match(
  env.API_URL || "",
  /^http:\/\/(127\.0\.0\.1|localhost):/,
  "this test only runs against a local Supabase",
);

execFileSync(
  "npx",
  ["vite", "build", "--outDir", "dist-local", "--logLevel", "error"],
  {
    cwd: web,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: env.API_URL,
      VITE_SUPABASE_KEY: env.ANON_KEY,
    },
    stdio: "inherit",
  },
);
const server = spawn("python3", ["-m", "http.server", "8765"], {
  cwd: web + "/dist-local",
  stdio: "ignore",
});
const APP = "http://127.0.0.1:8765/index.html";
await new Promise((r) => setTimeout(r, 1000));

const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const people = [];
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--no-sandbox"],
});
const errs = [];
const clear = async (pg) => {
  for (let i = 0; i < 6; i++) {
    await pg.waitForTimeout(300);
    if (await pg.locator('[data-act="celeNext"]').count())
      await pg.click('[data-act="celeNext"]');
    else break;
  }
};
const closeSheets = async (pg) => {
  for (let i = 0; i < 6 && (await pg.locator(".sheet").count()); i++) {
    await pg.keyboard.press("Escape");
    await pg.waitForTimeout(300);
  }
};
/** A new person, signed in through an emailed link and through setup, on their own phone-sized browser. */
async function person(tag, email = `coach-${tag}-${Date.now()}@example.test`) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  people.push(data.user.id);
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: APP },
  });
  if (link.error) throw link.error;
  const pg = await (
    await browser.newContext({ viewport: { width: 390, height: 844 } })
  ).newPage();
  pg.on("pageerror", (e) => errs.push(tag + ": " + String(e)));
  await pg.goto(link.data.properties.action_link);
  // health information and a date of birth first, then the targets, then the first-log sheet
  await pg.waitForSelector("#hcGo", { timeout: 20000 });
  await pg.fill("#hcD", "03");
  await pg.fill("#hcM", "03");
  await pg.fill("#hcY", "1992");
  await pg.click("#hcGo");
  await pg.waitForSelector("#tgBody", { timeout: 20000 });
  await pg.click('#tgBody button:has-text("Male")');
  for (const [k, v] of [
    ["cm", "183"],
    ["kg", "86"],
  ])
    await pg.fill(`#tgBody [data-k="${k}"]`, v);
  await pg.click('[data-act="saveTargets"]');
  await pg.waitForSelector("#obLinks");
  await pg.click('#obLinks [data-act="close"]');
  await pg.waitForTimeout(300);
  await clear(pg);
  return pg;
}
/** With SHOTS=<folder>, saves pictures of a screen at phone widths (or phone and desk), light and dark. */
const shot = async (pg, name, desk) => {
  if (!process.env.SHOTS) return;
  const was = pg.viewportSize();
  const sizes = desk
    ? [
        [390, 844],
        [1280, 800],
      ]
    : [
        [320, 700],
        [390, 844],
      ];
  for (const [width, height] of sizes)
    for (const colorScheme of ["light", "dark"]) {
      await pg.setViewportSize({ width, height });
      await pg.emulateMedia({ colorScheme });
      await pg.waitForTimeout(300);
      for (const [tag, top] of [
        ["", 0],
        ["-b", 99999],
      ]) {
        await pg.evaluate((y) => {
          const b = [...document.querySelectorAll(".sheet .sheet-b")].pop();
          (b || document.querySelector("#main")).scrollTop = y;
        }, top);
        await pg.waitForTimeout(150);
        await pg.screenshot({
          path: `${process.env.SHOTS}/${name}-${width}-${colorScheme}${tag}.png`,
        });
      }
    }
  await pg.setViewportSize(was);
  await pg.emulateMedia({ colorScheme: "light" });
  await pg.evaluate(() => {
    const b = [...document.querySelectorAll(".sheet .sheet-b")].pop();
    (b || document.querySelector("#main")).scrollTop = 0;
  });
};
const text = async (pg, sel) =>
  (await pg.innerText(sel)).replace(/\s*\n+\s*/g, " | ");
const until = async (what, test, ms = 15000) => {
  for (const end = Date.now() + ms; Date.now() < end; ) {
    if (await test()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("timed out waiting for: " + what);
};
const docs = async (uid, kind) =>
  (
    await admin
      .from("user_docs")
      .select("id, data")
      .eq("user_id", uid)
      .eq("kind", kind)
  ).data;
const results = [];
const step = async (name, run) => {
  if (process.env.TRACE) console.error("…", name);
  try {
    await run();
    results.push(["ok  ", name]);
  } catch (e) {
    results.push([
      "FAIL",
      name +
        "\n      " +
        String(e && e.message)
          .split("\n")
          .slice(0, 5)
          .join(" | "),
    ]);
  }
};
/** The coach reloads, which reads what clients have sent, and opens the linked client. */
const openClient = async (pg) => {
  await pg.reload();
  await pg.waitForSelector('[data-act="coClient"][data-id^="u:"]', {
    timeout: 20000,
  });
  await pg.click('[data-act="coClient"][data-id^="u:"]');
  await pg.waitForSelector("#ccBody");
};

try {
  const a = await person("ann"); // the coach
  const b = await person("bee"); // the client
  let code = "";
  await step(
    "anyone signed in can open the coach view and make an invitation with a code",
    async () => {
      await a.click("#chipYou");
      await a.click('[data-act="modeGo"][data-m="coach"]');
      // the first time in, one sheet offers the set-up; this coach leaves it for later
      await a.waitForSelector('[data-act="coachSetupGo"]');
      assert.match(
        await text(a, ".sheet >> nth=-1"),
        /Set up your coaching[\s\S]*Your name, as clients will see it[\s\S]*For each new client[\s\S]*A consultation form[\s\S]*A weekly check-in/,
      );
      await a.click('[data-act="coachSetupLater"]');
      await a.waitForFunction(() => !document.querySelector(".sheet"));
      await a.waitForSelector('[data-act="cgInvite"]');
      assert.equal(
        await a.locator('[data-act="catalogue"]').count(),
        0,
        "the sample coach catalogue stays off",
      );
      await a.click('[data-act="cgInvite"]');
      await a.fill("#ciMe", "Coach Ann");
      await a.fill("#ciName", "Bee");
      await a.click("#ciGo");
      await a.waitForSelector("#ciOut .sq-code");
      code = (await a.innerText("#ciOut .sq-code")).trim();
      assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
      await closeSheets(a);
      assert.match(
        await text(a, "#main"),
        /Invitations waiting[\s\S]*Bee[\s\S]*Code /,
      );
      assert.equal(
        await a.locator('[data-act="coClient"][data-id^="u:"]').count(),
        0,
        "no client until they accept",
      );
    },
  );
  await step(
    "the invite link shows who it is from; nothing is shared unless the client switches it on",
    async () => {
      // something in the diary first, so there is something to share
      await b.click(".fab");
      await b.fill("#q", "banana");
      await b.click("#addList .res >> nth=0");
      await b.click("#fdGo");
      await clear(b);
      await closeSheets(b);
      await b.goto(APP + "#coach=" + code.toLowerCase());
      await b.waitForSelector("#cjBody .banner", { timeout: 15000 });
      assert.match(await text(b, "#cjBody"), /Coach Ann has invited you/);
      assert.equal(await b.inputValue("#cjCode"), code);
      assert.equal(
        await b
          .locator('#cjBody [data-act="cgShare"][aria-pressed="true"]')
          .count(),
        0,
        "every area starts off",
      );
      assert.match(
        await text(b, "#cjBody"),
        /They never see anything else, they cannot change your diary, and progress photos are not included/,
      );
      await b.click('[data-act="cgShare"][data-area="food"]');
      await b.click('[data-act="cgShare"][data-area="training"]');
      await b.fill("#cjName", "Bee");
      await b.click("#cjGo");
      await b.waitForFunction(() => !document.querySelector("#cjBody"));
      await closeSheets(b);
      await b.click("#chipYou");
      assert.match(
        await text(b, "#main"),
        /Your coach: Coach Ann \| Sees your food and training/,
      );
    },
  );
  await step(
    "the coach sees the client with what is shared, and nothing of what is not",
    async () => {
      await until("the client's copy on the server", async () => {
        const { data } = await admin.from("coach_status").select("data");
        return data.length === 1 && data[0].data.st.logged7 === 1;
      });
      const sent = (await admin.from("coach_status").select("data")).data[0]
        .data;
      assert.equal(sent.st.kg, undefined, "weight was not sent");
      assert.equal(sent.view.profile.wts, undefined);
      assert.equal(sent.view.profile.age, undefined);
      await openClient(a);
      const seen = await text(a, "#ccBody");
      assert.match(
        seen,
        /Shares food and training\. Not shared: weight and recovery\./,
      );
      assert.match(seen, /kcal a day against/);
      assert.doesNotMatch(seen, /86 kg|@|example\.test/);
    },
  );
  await step(
    "see their app: the client's own Today, read-only, and nothing the coach taps there is saved anywhere",
    async () => {
      const coachDays = JSON.stringify(await docs(people[0], "days"));
      const clientDays = JSON.stringify(await docs(people[1], "days"));
      const coachProfile = JSON.stringify(await docs(people[0], "profile"));
      await a.click('[data-act="coViewAs"]');
      await a.waitForSelector(".banner.demo");
      assert.match(
        await text(a, ".banner.demo"),
        /Bee's app\. A read-only copy of what they share with you\. Nothing you tap here is saved or sent/,
      );
      assert.match(await text(a, "#main"), /Banana/);
      // tap about as the coach might: add water, log a food
      await a.click(".fab");
      await a.fill("#q", "banana");
      await a.click("#addList .res >> nth=0");
      await a.click("#fdGo");
      await clear(a);
      await closeSheets(a);
      await a.waitForTimeout(1500);
      await a.click('[data-act="previewOff"]');
      await a.waitForSelector("#ccBody");
      assert.match(await text(a, "#ccBody"), /Shares food and training/);
      assert.equal(JSON.stringify(await docs(people[0], "days")), coachDays);
      assert.equal(JSON.stringify(await docs(people[1], "days")), clientDays);
      assert.equal(
        JSON.stringify(await docs(people[0], "profile")),
        coachProfile,
        "the coach's own profile was not overwritten with the client's",
      );
    },
  );
  await step(
    "targets the coach sets arrive as an offer; the client accepts, and the coach is told",
    async () => {
      await a.click('[data-act="ccTab"][data-t="plan"]');
      await a.click('[data-act="coTargets"]');
      await a.fill("#ctK", "2100");
      await a.fill("#ctP", "140");
      await a.fill("#ctFi", "30");
      await a.fill("#ctW", "2500");
      await a.click('[data-act="coTargetsSave"]');
      await until("the targets on the server", async () => {
        const { data } = await admin.from("coach_assign").select("data");
        return data.length === 1 && data[0].data.t && data[0].data.t.k === 2100;
      });
      const before = (await docs(people[1], "profile"))[0].data.t.k;
      assert.notEqual(
        before,
        2100,
        "nothing changed in the client's account yet",
      );
      await b.goto(APP + "#today");
      await b.reload();
      await b.waitForSelector('[data-act="cgOfferYes"][data-k="t"]', {
        timeout: 20000,
      });
      assert.match(
        await text(b, "#main"),
        /From your coach, Coach Ann \| New targets \| 2,100 kcal a day, 140 g protein, 30 g fibre, 2,500 ml water\. Yours now/,
      );
      await b.click('[data-act="cgOfferYes"][data-k="t"]');
      await until(
        "the accepted targets in the client's account",
        async () => (await docs(people[1], "profile"))[0].data.t.k === 2100,
      );
      const t = (await docs(people[1], "profile"))[0].data.t;
      assert.deepEqual([t.p, t.fi, t.w], [140, 30, 2500]);
      assert.equal(t.c, Math.max(50, Math.round((2100 - 140 * 4 - t.f * 9) / 4 / 5) * 5), "carbohydrate is what is left");
      await until("the answer reaching the coach", async () => {
        const { data } = await admin.from("coach_status").select("data");
        return !!(data[0] && data[0].data.resp && data[0].data.resp.t);
      });
      await openClient(a);
      assert.match(await text(a, "#ccBody"), /The targets you sent: accepted/);
    },
  );
  await step("messages go both ways", async () => {
    await a.click('[data-act="ccTab"][data-t="notes"]');
    await a.click('#ccBody [data-act="chat"]');
    await a.fill("#chT", "How did the session go?");
    await a.click('[data-act="chatGo"]');
    await until("the coach's message on the server", async () => {
      const { data } = await admin.from("coach_messages").select("body");
      return data.length === 1 && data[0].body === "How did the session go?";
    });
    await a.waitForFunction(
      () =>
        /How did the session go\?/.test(
          document.querySelector("#chBody").innerText,
        ),
      null,
      { timeout: 10000 },
    );
    await b.reload();
    await b.waitForSelector("nav.tabs .tab");
    await b.waitForTimeout(2500);
    await closeSheets(b);
    await b.click("#chipYou");
    await b.click('#main [data-act="chat"]');
    await b.waitForSelector("#chBody");
    assert.match(await text(b, "#chBody"), /How did the session go\?/);
    await b.fill("#chT", "Well, thanks");
    await b.click('[data-act="chatGo"]');
    await until("the client's reply on the server", async () => {
      const { data } = await admin.from("coach_messages").select("body");
      return data.some((m) => m.body === "Well, thanks");
    });
    // the coach still has the conversation open: the reply shows there without a reload
    await a.waitForFunction(
      () => /Well, thanks/.test(document.querySelector("#chBody").innerText),
      null,
      { timeout: 12000 },
    );
    await closeSheets(a);
    await closeSheets(b);
  });
  await step(
    "a check-in from the coach's own form: they build it, set it, the client's figures fill in, and the reply comes back",
    async () => {
      await openClient(a);
      await a.click('[data-act="ccTab"][data-t="plan"]');
      await a.click('[data-act="cgCkForm"][data-kind="ck"]');
      // the coach builds their own form: Ember's starter, cut down and reworded
      await a.click('.sheet >> nth=-1 >> [data-act="cfForms"]');
      await a.click('[data-act="cfNew"][data-kind="checkin"]');
      await a.fill("#feTitle", "Ann's Friday check-in");
      await a.fill("#feQ0", "How was the week?");
      await a.fill("#feQ1", "What got in the way?");
      for (let i = 0; i < 4; i++)
        await a.click('[data-act="feDel"][data-i="2"]');
      await a.click('[data-act="feAdd"]');
      await a.fill("#feQ2", "Waist");
      await a.selectOption("#feK2", "meas");
      await shot(a, "coach-form-builder", true);
      await a.click('[data-act="cfSave"]');
      await until(
        "the form kept with the coach's documents",
        async () => (await docs(people[0], "forms")).length === 1,
      );
      // back out of the forms list: the picker underneath already has the new form chosen
      await a.keyboard.press("Escape");
      await a.waitForFunction(() => !document.querySelector("#fmsBody"));
      assert.equal(
        await a.locator("#ckPick option:checked").innerText(),
        "Ann's Friday check-in",
      );
      await a.selectOption("#ckWd", "0");
      await shot(a, "coach-set-checkin", true);
      await a.click('[data-act="cgCkFormSave"]');
      await until("the questions on the server", async () => {
        const { data } = await admin.from("coach_assign").select("data");
        const ck = data[0].data.checkin;
        return !!(ck && ck.form && ck.form.qs.length === 3 && ck.every === 1);
      });
      await closeSheets(a);
      await b.goto(APP + "#today");
      await b.reload();
      await b.waitForSelector('[data-act="cgCheckin"]', { timeout: 20000 });
      await b.click('[data-act="cgCheckin"]');
      const form = await text(b, ".sheet >> nth=-1");
      assert.match(
        form,
        /Ann's Friday check-in for Coach Ann[\s\S]*Food logged \| 1 of 7 days[\s\S]*How was the week\?[\s\S]*What got in the way\?[\s\S]*Waist/,
      );
      assert.doesNotMatch(
        form,
        /Weight \||Recovery today/,
        "figures from areas that are not shared stay out",
      );
      await b.click("#ckGo");
      assert.equal(
        (await admin.from("coach_checkins").select("id")).data.length,
        0,
        "a needed question left empty stops it being sent",
      );
      await b.click('#ckA0 [data-v="8"]');
      await b.fill("#ckA1", "Good, three sessions done");
      await b.fill("#ckA2", "84.5");
      await shot(b, "client-checkin");
      await b.click("#ckGo");
      await until(
        "the check-in on the server",
        async () =>
          (await admin.from("coach_checkins").select("id")).data.length === 1,
      );
      await b.waitForFunction(() => !document.querySelector(".sheet"));
      assert.equal(
        await b.locator('[data-act="cgCheckin"]').count(),
        0,
        "asked once a week",
      );
      // the measurement asked for in the form is kept with the client's own, and is not shared without weight
      const meas = (await docs(people[1], "profile"))[0].data.meas;
      assert.equal(meas[0].v.Waist, 84.5);
      // it shows in the coach's inbox on the Clients screen, and opens from there
      await closeSheets(a);
      await a.reload();
      await a.waitForSelector('[data-act="cgInboxOpen"]', { timeout: 20000 });
      assert.match(
        await text(a, "#main"),
        /Check-ins \| Bee \| To answer \| Ann's Friday check-in, week of/,
      );
      await shot(a, "coach-clients-inbox", true);
      await a.click('[data-act="cgInboxOpen"]');
      await a.waitForSelector("#ckReply", { timeout: 15000 });
      await shot(a, "coach-checkin-read", true);
      const got = await text(a, ".sheet >> nth=-1");
      assert.match(
        got,
        /Their week, from their diary[\s\S]*Food logged[\s\S]*How was the week\? \| 8[\s\S]*Good, three sessions done[\s\S]*Waist \| 84\.5 cm/,
      );
      await a.fill("#ckReply", "Strong week. Same again.");
      await a.click("#ckSend");
      await until("the reply on the server", async () => {
        const { data } = await admin.from("coach_checkins").select("feedback");
        return data[0].feedback === "Strong week. Same again.";
      });
      await closeSheets(a);
      await b.reload();
      await b.waitForSelector('[data-act="cgCkRead"]', { timeout: 20000 });
      assert.match(
        await text(b, "#main"),
        /A reply to your check-in \| Strong week\. Same again\./,
      );
      assert.equal(await b.innerText("#brandTag"), "Coach Ann");
      assert.equal(
        (await admin.from("coach_status").select("data")).data[0].data.view
          .profile.meas,
        undefined,
        "measurements are not sent while weight is not shared",
      );
    },
  );
  await step(
    "phases, habits, supplements, steps and the vault: the coach sets them and the client finds them in their Coach space",
    async () => {
      const set = async (part, test) =>
        until(part + " on the server", async () => {
          const { data } = await admin.from("coach_assign").select("data");
          return !!(data[0].data[part] && test(data[0].data[part]));
        });
      await openClient(a);
      await a.click('[data-act="ccTab"][data-t="plan"]');
      await a.click('[data-act="rmEdit"]');
      assert.equal(await a.inputValue("#rmN0"), "Ignite");
      await a.fill("#rmk0", "2200");
      await a.fill("#rmsteps0", "8000");
      await shot(a, "coach-phases-edit", true);
      await a.click('[data-act="rmSave"]');
      await set("phases", (p) => p.list.length === 3 && p.list[0].k === 2200);
      await a.click('[data-act="coList"][data-k="habits"]');
      await a.click('[data-act="coListStart"]');
      await a.click('[data-act="coListSave"]');
      await set("habits", (h) => h.list.length === 4);
      await a.click('[data-act="coList"][data-k="supps"]');
      await a.fill("#clT", "Creatine | 5 g | with breakfast");
      await a.click('[data-act="coListSave"]');
      await set("supps", (x) => x.list[0].amt === "5 g");
      await a.click('[data-act="coSteps"]');
      await a.fill("#csG", "8000");
      await a.fill("#csC", "20 minutes easy after training");
      await a.click('[data-act="coStepsSave"]');
      await set("steps", (x) => x.goal === 8000);
      await shot(a, "coach-client-plan", true);
      await a.click('[data-act="rmView"]');
      await shot(a, "coach-roadmap", true);
      await closeSheets(a);
      await a.click('nav.tabs [data-tab="library"]');
      await shot(a, "coach-library", true);
      await a.click('[data-act="coVault"]');
      await a.fill(
        "#vtT",
        "Managing a night out | example.com/night-out | Watch before the weekend\nBad link | javascript:alert(1) | never a script",
      );
      await a.click('[data-act="coVaultSave"]');
      await set("vault", (v) => v.list.length === 2);
      const vault = (await admin.from("coach_assign").select("data")).data[0]
        .data.vault.list;
      assert.equal(vault[0].url, "https://example.com/night-out");
      assert.doesNotMatch(vault[1].url, /^javascript/i);
      // recipes and a menu of the week from the coach's own recipe book (a recipe put there for the test)
      await closeSheets(a);
      await admin.from("user_docs").upsert({
        user_id: people[0],
        kind: "recipes",
        id: "rc1",
        data: {
          id: "rc1",
          n: "Chicken and rice",
          sv: 2,
          items: [
            { n: "Chicken breast", g: 300, k: 495, p: 93, c: 0, f: 10.8 },
            { n: "Rice, cooked", g: 400, k: 520, p: 10.8, c: 112, f: 1.2 },
          ],
        },
      });
      await a.reload();
      await a.waitForSelector('nav.tabs [data-tab="library"]', { timeout: 20000 });
      await a.waitForTimeout(2500);
      await a.click('nav.tabs [data-tab="library"]');
      await a.click('[data-act="coMenu"]');
      assert.match(await text(a, ".sheet >> nth=-1"), /Chicken and rice \| 508 kcal a serving/);
      await a.click('.sheet [data-rid="rc1"]');
      await a.fill("#mnT", "A day of eating");
      for (const m of ["b", "l", "d"]) await a.selectOption("#mn" + m, "rc1");
      await a.click('[data-act="coMenuSave"]');
      await set("menu", (m) => m.meals.length === 3 && m.meals[0].k === 508 && m.meals[0].p === 51.9 && m.total === 1524);
      await set("recipes", (r) => r.list.length === 1 && r.list[0].per.p === 51.9 && r.list[0].per.c === 56);
      // one note to every client, each in their own conversation
      await a.click('[data-act="coAll"]');
      assert.match(await text(a, ".sheet >> nth=-1"), /Goes to 1 client, each in their own conversation with you/);
      await a.fill("#caT", "No sessions on Monday.");
      await a.click("#caGo");
      await until("the note on the server", async () => {
        const { data } = await admin.from("coach_messages").select("body");
        return data.filter((m) => m.body === "No sessions on Monday.").length === 1;
      });
      await a.click('nav.tabs [data-tab="clients"]');

      // the client: habits on Today, everything else behind the coach's name
      await b.goto(APP + "#today");
      await b.reload();
      await b.waitForSelector('[data-act="habitTick"]', { timeout: 20000 });
      assert.match(
        await text(b, "#main"),
        /Habits \| from Coach Ann \| Your coach sees how many you tick each week, not which days\. \| Sit down for one meal without a screen/,
      );
      assert.match(
        await text(b, "#main"),
        /Fibre \| \d+ \/ 30 g[\s\S]*\d+ g to go, set by your coach/,
        "the fibre target the coach set shows on Today",
      );
      assert.match(await text(b, "#main"), /Step target 8,000/);
      await shot(b, "client-today-habits");
      await b.click('[data-act="habitTick"] >> nth=0');
      await until("the habit ticked in the client's own diary", async () => {
        const day = (await docs(people[1], "days")).pop();
        return !!(day && day.data.hb && Object.keys(day.data.hb).length === 1);
      });
      await b.click("#brandTag");
      await b.waitForSelector('.sheet [data-act="suppTick"]');
      const space = await text(b, ".sheet >> nth=-1");
      assert.match(
        space,
        /Your coach: Coach Ann[\s\S]*Messages · 1 new \| No sessions on Monday\.[\s\S]*Your roadmap[\s\S]*Ignite \| Now, week 1 of 4[\s\S]*Aiming for 2,200 kcal, 8,000 steps\.[\s\S]*Transform[\s\S]*Thrive/i,
      );
      assert.match(
        space,
        /8,000 steps a day[\s\S]*20 minutes easy after training[\s\S]*Creatine \| 5 g, with breakfast[\s\S]*not medical advice[\s\S]*Vault \| Managing a night out/i,
      );
      assert.equal(
        await b.getAttribute('.sheet a.entry:has-text("night out")', "href"),
        "https://example.com/night-out",
      );
      assert.equal(await b.locator(".sheet a.entry").count(), 1);
      // the menu sized to their own 2,100 kcal target and marked as an estimate; the recipe to keep
      assert.match(
        space,
        /A day of eating \| Chicken and rice \| 762 \| Breakfast · 1\.5 servings · 78 g protein \| ESTIMATE[\s\S]*Sized to your 2,100 kcal target by scaling the servings to the nearest quarter, so the figures are estimates\.[\s\S]*Recipes from Coach Ann \| Chicken and rice \| 508 \| Save \| kcal a serving · 51\.9 g protein · makes 2/i,
      );
      await b.click('[data-act="coRecipeKeep"]');
      await until("the recipe kept in the client's own recipes", async () =>
        (await docs(people[1], "recipes")).some((r) => r.data.n === "Chicken and rice" && r.data.items.length === 2),
      );
      await clear(b); // keeping a first recipe earns an award, which shows over the sheet
      await b.click('[data-act="suppTick"]');
      await b.waitForSelector('[data-act="suppTick"][aria-pressed="true"]');
      await clear(b); // the award for a first recipe can show now, over the sheet
      await b.click('[data-act="stepsToday"]');
      await b.fill("#stN", "9000");
      await b.click('[data-act="stepsSave"]');
      await b.waitForSelector('.sheet [data-act="stepsToday"]');
      assert.match(await text(b, ".sheet >> nth=-1"), /9,000 today/);
      await shot(b, "client-coach-space");
      await closeSheets(b);
      // the week's summary reaches the coach: an engagement score and a row for the week
      await b.reload();
      await until("the week's summary on the server", async () => {
        const { data } = await admin.from("coach_weeks").select("data");
        return data.some(
          (w) =>
            w.data.steps === 9000 &&
            w.data.days === 1 &&
            w.data.hab &&
            w.data.hab.done === 1 &&
            w.data.hab.of === 4,
        );
      }, 90000);
      const wk = (await admin.from("coach_weeks").select("data")).data;
      assert.ok(
        wk.every((w) => w.data.kg === undefined && w.data.weighs === undefined),
        "no weight in a summary while weight is not shared",
      );
      // a client of a few minutes is not judged
      await openClient(a);
      await a.waitForSelector("#ccBody table.mini", { timeout: 15000 });
      assert.match(
        await text(a, "#ccBody"),
        /Engagement \| Not enough yet \| Nothing to judge yet[\s\S]*The last weeks[\s\S]*9,000\t1 of 4/,
      );
      await closeSheets(a);
      // as if they had joined eight days ago: now there is a score, and the list flags it
      await admin
        .from("coach_links")
        .update({ accepted_at: new Date(Date.now() - 8 * 864e5).toISOString() })
        .eq("client_id", people[1]);
      await openClient(a);
      await a.waitForSelector("#ccBody table.mini", { timeout: 15000 });
      const over = await text(a, "#ccBody");
      assert.match(
        over,
        /Engagement \| (Slipping|Behind) \| \d+ \| out of 100[\s\S]*Check-ins, last \d weeks? \| 1 of \d \| Food logged, last 7 days \| 1 of 7[\s\S]*The last weeks[\s\S]*9,000/,
      );
      assert.match(
        await text(a, '#main .crow[data-act="coClient"][data-id^="u:"]'),
        /Bee \| Live \| (Slipping|Behind)/,
      );
      assert.doesNotMatch(over, /Physique/, "nothing on weight unless shared");
      await shot(a, "coach-client-overview", true);
      await closeSheets(a);
    },
  );
  await step(
    "a coach's page: someone applies from the link, the coach accepts, and they are asked what to share",
    async () => {
      await a.click('[data-act="cgPage"]');
      assert.equal(await a.inputValue("#pgName"), "Coach Ann");
      await a.fill("#pgSlug", "coach-ann");
      await a.fill("#pgAbout", "Strength for field sports.");
      await a.fill("#pgHello", "Welcome aboard.");
      await a.click("#pgCk");
      await a.click("#pgGo");
      await until(
        "the page on the server",
        async () =>
          (await admin.from("coach_pages").select("slug")).data.length === 1,
      );
      const c = await person("cee");
      await c.goto(APP + "#c=coach-ann");
      await c.waitForSelector("#apName", { timeout: 15000 });
      assert.match(
        await text(c, ".sheet >> nth=-1"),
        /Coach Ann[\s\S]*Strength for field sports\.[\s\S]*Ember has not checked their qualifications/,
      );
      await c.fill("#apName", "Cee");
      await c.fill("#apNote", "I play hurling");
      await c.click("#apGo");
      await until(
        "the application on the server",
        async () =>
          (await admin.from("coach_applications").select("id")).data.length ===
          1,
      );
      await a.reload();
      await a.waitForSelector('[data-act="cgAppYes"]', { timeout: 20000 });
      assert.match(
        await text(a, "#main"),
        /Applications \| Cee[\s\S]*I play hurling/,
      );
      await a.click('[data-act="cgAppYes"]');
      await until("the application to be accepted", async () => {
        const { data } = await admin
          .from("coach_applications")
          .select("status");
        return data[0].status === "accepted";
      });
      await c.reload();
      await c.waitForSelector("#cjBody .banner", { timeout: 25000 });
      assert.match(await text(c, "#cjBody"), /Coach Ann has invited you/);
      await c.click('[data-act="cgShare"][data-area="training"]');
      await c.click("#cjGo");
      await c.waitForFunction(() => !document.querySelector("#cjBody"));
      await until(
        "two clients linked",
        async () =>
          (
            await admin
              .from("coach_links")
              .select("status")
              .eq("status", "active")
          ).data.length === 2,
      );
      // the coach's starter goes to the new client once, and not to the client who was already there
      await a.reload();
      await until("the welcome for the new client", async () => {
        const { data } = await admin
          .from("coach_links")
          .select("client_id, coach_assign(data)")
          .eq("status", "active");
        const of = (id) =>
          (data.find((l) => l.client_id === id) || {}).coach_assign;
        const cee = of(people[2]),
          bee = of(people[1]);
        return (
          !!cee &&
          cee.data.msg &&
          cee.data.msg.t === "Welcome aboard." &&
          cee.data.checkin.form.qs.length === 3 &&
          cee.data.checkin.form.title === "Ann's Friday check-in" &&
          !(bee.data.msg && bee.data.msg.t === "Welcome aboard.")
        );
      });
    },
  );
  await step(
    "the client can see exactly what the coach sees, and pausing takes it away at once",
    async () => {
      await closeSheets(b);
      await b.click("#chipYou");
      await b.click('[data-act="myCoach"]');
      await b.click('[data-act="cgSees"]');
      await b.waitForFunction(() =>
        /What your coach sees/.test(
          [...document.querySelectorAll(".sheet")].pop().innerText,
        ),
      );
      const sees = await text(b, ".sheet >> nth=-1");
      assert.match(
        sees,
        /Each week \| A summary of the week for what you share, and how many habits you ticked \| Progress photos \| None shared/,
      );
      assert.match(
        sees,
        /What your coach sees[\s\S]*Food, last 7 days[\s\S]*Sessions, last 7 days/,
      );
      assert.match(sees, /Not shared: weight and recovery\./);
      assert.doesNotMatch(sees, /\| Weight \|/);
      await b.keyboard.press("Escape");
      await b.waitForTimeout(300);
      await b.click('[data-act="cgPause"]');
      await until("the copy to be gone", async () =>
        (
          await admin
            .from("coach_links")
            .select("status, coach_status(link_id)")
            .eq("client_id", people[1])
            .neq("status", "ended")
        ).data.every((l) => l.status === "paused" && !l.coach_status),
      );
      await a.reload();
      await a.waitForSelector('[data-act="coClient"][data-id^="u:"]', {
        timeout: 20000,
      });
      await a.click('[data-act="coClient"][data-id^="u:"]:has-text("Bee")');
      await a.waitForSelector("#ccBody");
      assert.match(await text(a, "#ccBody"), /Bee has paused sharing/);
      assert.doesNotMatch(await text(a, "#ccBody"), /kcal a day against/);
      await closeSheets(a);
    },
  );
  await step(
    "ending it removes the client from the coach's list and frees the client to join another",
    async () => {
      await closeSheets(b);
      await b.click("#chipYou");
      await b.click('[data-act="myCoach"]');
      await b.click('[data-act="cgEnd"]');
      await b.click('[data-act="cgEndGo"]');
      await until("the link to end", async () =>
        (
          await admin
            .from("coach_links")
            .select("status")
            .eq("client_id", people[1])
        ).data.every((l) => l.status === "ended"),
      );
      await b.waitForFunction(() => !document.querySelector(".sheet"));
      await b.click("#chipYou").catch(() => {});
      assert.match(await text(b, "#main"), /Join a coach/);
      await a.reload();
      await a.waitForSelector('[data-act="cgInvite"]', { timeout: 20000 });
      await a.waitForTimeout(2500);
      assert.equal(
        await a
          .locator('[data-act="coClient"][data-id^="u:"]:has-text("Bee")')
          .count(),
        0,
      );
      assert.equal(
        await a
          .locator('[data-act="coClient"][data-id^="u:"]:has-text("Cee")')
          .count(),
        1,
        "the other client is still there",
      );
    },
  );
  await step(
    "an invitation with an email is waiting when that person signs in, with no code to type",
    async () => {
      const mail = `coach-dee-${Date.now()}@example.test`;
      await a.click('[data-act="cgInvite"]');
      await a.fill("#ciName", "Dee");
      await a.fill("#ciMail", mail.toUpperCase());
      await a.click("#ciGo");
      await a.waitForSelector("#ciOut .sq-code");
      await closeSheets(a);
      const d = await person("dee", mail);
      await d.waitForSelector("#cjBody .banner", { timeout: 25000 });
      assert.match(await text(d, "#cjBody"), /Coach Ann has invited you/);
      assert.equal((await d.inputValue("#cjCode")).length, 8);
      for (const area of ["food", "training", "weight", "recovery"])
        await d.click(`[data-act="cgShare"][data-area="${area}"]`);
      await d.fill("#cjName", "Dee");
      await d.click("#cjGo");
      await d.waitForFunction(() => !document.querySelector("#cjBody"));
      await closeSheets(d);
    },
  );
  await step(
    "with weight shared the coach sees measurements, and three flat weeks bring up an estimate to weigh up",
    async () => {
      const d = browser.contexts().pop().pages()[0];
      await d.waitForSelector("#brandTag[data-act]", { timeout: 20000 });
      await d.click("#brandTag");
      await d.click('[data-act="measSheet"]');
      await d.fill("#msWaist", "84");
      await d.fill("#msHips", "98.5");
      await d.click('[data-act="measSave"]');
      await until("the measurements in what the coach may see", async () => {
        const { data } = await admin
          .from("coach_links")
          .select("coach_status(data)")
          .eq("client_id", people[3]);
        const st = data[0] && data[0].coach_status;
        const m = st && st.data.view.profile.meas;
        return !!(m && m[0] && m[0].v.Waist === 84);
      }, 90000);
      // three finished weeks of history, written here as the client's app would have written them
      const link = (
        await admin.from("coach_links").select("id").eq("client_id", people[3])
      ).data[0].id;
      const monday = (n) => {
        const t = new Date();
        t.setDate(t.getDate() - ((t.getDay() + 6) % 7) - 7 * n);
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      };
      for (const [n, kg, kcal] of [
        [3, 86.1, 2210],
        [2, 86.0, 2180],
        [1, 86.05, 2240],
      ])
        await admin.from("coach_weeks").upsert({
          link_id: link,
          week: monday(n),
          data: { week: monday(n), kg, kcal, prot: 130, days: 6, weighs: 3, sess: 3, plan: 3 },
        });
      await a.reload();
      await a.waitForSelector('[data-act="coClient"][data-id^="u:"]:has-text("Dee")', { timeout: 20000 });
      await a.click('[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.waitForSelector("#ccBody table.mini", { timeout: 15000 });
      const over = await text(a, "#ccBody");
      assert.match(
        over,
        /Weight has held for three weeks \| Estimate \| Weekly averages went from 86\.1 kg to 86\.05 kg while they logged about 2,210 kcal a day/i,
      );
      assert.match(over, /it is your call/);
      assert.match(over, /Engagement \| Not enough yet/);
      assert.match(over, /Physique[\s\S]*86 kg[\s\S]*Hips\tWaist[\s\S]*98\.5\t84/);
      await shot(a, "coach-stall-physique", true);
      await closeSheets(a);
    },
  );
  await step(
    "progress photos: the client shares one and keeps one; the coach sees only the shared one, until it is unshared",
    async () => {
      const d = browser.contexts().pop().pages()[0];
      const add = async (file, share) => {
        const [chooser] = await Promise.all([
          d.waitForEvent("filechooser"),
          d.click('#phBody [data-act="phAdd"]'),
        ]);
        await chooser.setFiles(
          fileURLToPath(new URL("../../prototype/test/" + file, import.meta.url)),
        );
        if (share) await d.click('[data-act="phShareNew"]');
        await d.click("#phGoBtn");
        await d.waitForFunction(() => !document.querySelector("#phGoBtn"));
      };
      await closeSheets(d);
      await d.click("#chipYou");
      await d.click('[data-act="photos"]');
      await d.waitForSelector('#phBody [data-act="phAdd"]');
      await add("p1.jpg", true);
      await add("p2.jpg", false);
      await until(
        "two files stored and one shared",
        async () =>
          (await admin.storage.from("photos").list(people[3])).data.length ===
            2 &&
          (await admin.from("coach_photos").select("path")).data.length === 1,
      );
      await closeSheets(d);
      // the coach: the Photos tab shows the one shared photo, through a signed link
      await a.reload();
      await a.waitForSelector('[data-act="coClient"][data-id^="u:"]:has-text("Dee")', { timeout: 20000 });
      await a.click('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.click('[data-act="ccTab"][data-t="photos"]');
      await a.waitForSelector("#ccBody .pht img", { timeout: 15000 });
      assert.equal(await a.locator("#ccBody .pht img").count(), 1);
      const seen = await a.evaluate(async () => {
        const im = document.querySelector("#ccBody .pht img");
        await im.decode().catch(() => {});
        return { src: im.src, ok: im.naturalWidth > 0 };
      });
      assert.match(seen.src, /\/storage\/v1\/object\/sign\/photos\/.+token=/);
      assert.ok(seen.ok, "the shared picture loads for the coach");
      assert.match(await text(a, "#ccBody"), /Dee chooses which photos to share with you/);
      await shot(a, "coach-photos", true);
      await closeSheets(a);
      // the client changes their mind
      await d.click("#chipYou");
      await d.click('[data-act="photos"]');
      await d.click('#phBody .pht:has-text("Shared")');
      await d.click('[data-act="phShare"]');
      await until(
        "nothing shared any more",
        async () =>
          (await admin.from("coach_photos").select("path")).data.length === 0,
      );
      await closeSheets(d);
      await a.reload();
      await a.waitForSelector('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")', { timeout: 20000 });
      await a.click('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.click('[data-act="ccTab"][data-t="photos"]');
      await a.waitForFunction(() => /No photos here yet/.test(document.querySelector("#ccBody").innerText), null, { timeout: 15000 });
      assert.equal(await a.locator("#ccBody .pht img").count(), 0);
      await closeSheets(a);
    },
  );
  await step(
    "a programme with the coach's own demo video: offered, accepted, and the link is there during the workout",
    async () => {
      const d = browser.contexts().pop().pages()[0];
      await a.click('nav.tabs [data-tab="library"]');
      await a.click('[data-act="progNew"]');
      await a.fill('#peBody [data-on="peName"]', "Ann's strength block");
      await a.click('[data-act="peAdd"] >> nth=0');
      await a.click('#pkList [data-act="pkPick"] >> nth=0');
      await a.click('[data-act="peItem"] >> nth=0');
      await a.fill("#piN", "Slow on the way down");
      await a.fill("#piU", "example.com/squat-demo");
      await a.click('[data-act="piOk"]');
      await a.click('[data-act="peSave"]');
      await closeSheets(a);
      await a.click('nav.tabs [data-tab="library"]');
      await a.click('[data-act="progView"]:has-text("strength block")');
      await a.click('[data-act="coAssignFrom"]');
      await a.click('[data-act="coAssignTo"]:has-text("Dee")');
      await until("the programme offered on the server", async () => {
        const { data } = await admin
          .from("coach_links")
          .select("coach_assign(data)")
          .eq("client_id", people[3]);
        const prog = data[0].coach_assign && data[0].coach_assign.data.prog;
        return !!(prog && prog.p && prog.p.days[0].items[0].url === "https://example.com/squat-demo");
      });
      await a.click('nav.tabs [data-tab="clients"]');
      await closeSheets(d);
      await d.goto(APP + "#today");
      await d.reload();
      await d.waitForSelector('[data-act="cgOfferYes"][data-k="prog"]', { timeout: 20000 });
      await d.click('[data-act="cgOfferYes"][data-k="prog"]');
      await d.click('nav.tabs [data-tab="train"]');
      await d.waitForSelector('[data-act="trainStart"]', { timeout: 15000 });
      await d.click('[data-act="trainStart"]');
      await d.waitForSelector('a:has-text("Watch your coach\'s demo")', { timeout: 15000 });
      assert.equal(
        await d.getAttribute('a:has-text("Watch your coach\'s demo")', "href"),
        "https://example.com/squat-demo",
      );
      assert.match(await text(d, ".sheet >> nth=-1"), /Slow on the way down/);
    },
  );
  await step(
    "a call the coach suggests goes into the client's calendar only when they accept, and the coach sees the answer",
    async () => {
      const d = browser.contexts().pop().pages()[0];
      await closeSheets(a);
      await a.click('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.click('[data-act="ccTab"][data-t="plan"]');
      await a.click('[data-act="coEv"]');
      await a.fill("#ceT", "Review call");
      await a.fill("#ceTm", "18:30");
      await a.click('[data-act="coEvSave"]');
      await until("the call offered on the server", async () => {
        const { data } = await admin.from("coach_links").select("coach_assign(data)").eq("client_id", people[3]);
        const ev = data[0].coach_assign && data[0].coach_assign.data.ev;
        return !!(ev && ev.list.length === 1 && ev.list[0].t === "Review call");
      });
      // the screen redraws a moment after the server has it
      await a.waitForFunction(() => /Review call[\s\S]*Offered/.test(document.querySelector("#ccBody").innerText), null, { timeout: 10000 });
      assert.match(await text(a, "#ccBody"), /Calls and events \| Add \| Review call, [\s\S]*at 18:30 \| Offered/);
      const before = (await docs(people[3], "profile"))[0].data.plan;
      assert.ok(!before || !before.ev.some((e) => e.t === "Review call"), "nothing in their calendar yet");
      await closeSheets(d);
      await d.goto(APP + "#today");
      await d.reload();
      await d.waitForSelector('[data-act="cgEvYes"]', { timeout: 20000 });
      assert.match(await text(d, "#main"), /From your coach, Coach Ann \| Review call \|[\s\S]*at 18:30, 30 minutes\. Add it to your calendar\?/);
      await d.click('[data-act="cgEvYes"]');
      await until("the call in the client's own calendar", async () => {
        const plan = (await docs(people[3], "profile"))[0].data.plan;
        return !!(plan && plan.ev.some((e) => e.t === "Review call" && e.tm === "18:30" && e.k === "appt"));
      });
      await until("the answer reaching the coach", async () => {
        const { data } = await admin.from("coach_links").select("coach_status(data)").eq("client_id", people[3]);
        const st = data[0].coach_status;
        return !!(st && Object.keys(st.data.resp || {}).some((k) => k.startsWith("ev")));
      }, 90000);
      await closeSheets(a);
      await a.reload();
      await a.waitForSelector('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")', { timeout: 20000 });
      await a.click('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.click('[data-act="ccTab"][data-t="plan"]');
      assert.match(await text(a, "#ccBody"), /Review call, [\s\S]*at 18:30 \| In their calendar/);
      await closeSheets(a);
    },
  );
  await step(
    "a consultation form, a self check-in and a note on the roadmap each reach the client, and the answers come back",
    async () => {
      const d = browser.contexts().pop().pages()[0];
      const assigned = async (part, test) =>
        until(part + " on the server", async () => {
          const { data } = await admin.from("coach_links").select("coach_assign(data)").eq("client_id", people[3]);
          const v = data[0].coach_assign && data[0].coach_assign.data[part];
          return !!(v && test(v));
        });
      await closeSheets(a);
      await a.click('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.click('[data-act="ccTab"][data-t="plan"]');
      // the consultation form: Ember's starter, as the coach has not built their own
      await a.click('[data-act="cgCkForm"][data-kind="consult"]');
      assert.match(await a.locator("#ckPick option:checked").innerText(), /Ember's starter: Consultation/);
      assert.equal(await a.locator("#ckEvery").count(), 0, "a consultation is asked once, with no schedule");
      await a.click('[data-act="cgCkFormSave"]');
      await assigned("consult", (c) => c.form.qs.length === 11);
      // a self check-in on a schedule
      await a.waitForFunction(() => !document.querySelector("#ckPick"));
      await a.click('[data-act="cgCkForm"][data-kind="self"]');
      await a.selectOption("#ckEvery", "2");
      await a.click('[data-act="cgCkFormSave"]');
      await assigned("self", (c) => c.form.title === "Relationship with food" && c.every === 2);
      // phases, and a note with a milestone on this week
      await a.waitForFunction(() => !document.querySelector("#ckPick"));
      await a.click('[data-act="rmEdit"]');
      await a.click('[data-act="rmSave"]');
      await assigned("phases", (p) => p.list.length === 3);
      await a.waitForFunction(() => !document.querySelector("#rmBody"));
      await a.click('[data-act="rmView"]');
      await a.click('[data-act="rmNote"] >> nth=0');
      await a.fill("#pnT", "Good first week. Keep the walks going.");
      await a.click('[data-seg="pnMs"] [data-val="met"]');
      await a.click('[data-act="rmNoteSave"]');
      await assigned("phases", (p) => Object.values(p.notes || {}).some((n) => n.ms === "met" && /Good first week/.test(n.t)));
      await a.waitForFunction(() => /Milestone met[\s\S]*Your note:\s*Good first week/.test([...document.querySelectorAll(".sheet")].pop().innerText), null, { timeout: 10000 });
      await closeSheets(a);

      // the client: both forms are waiting on Today
      await closeSheets(d);
      await d.goto(APP + "#today");
      await d.reload();
      await d.waitForSelector('[data-act="cgCheckin"][data-kind="consult"]', { timeout: 20000 });
      assert.match(await text(d, "#main"), /For your coach, Coach Ann \| Consultation \| 11 questions\. Your coach reads this before building your plan\./);
      await d.click('[data-act="cgCheckin"][data-kind="consult"]');
      await d.click("#ckGo");
      assert.equal((await admin.from("coach_checkins").select("id").eq("kind", "consult")).data.length, 0, "needed questions first");
      await d.fill("#ckA0", "Lose 5 kg by the summer");
      await d.click('#ckA2 [data-v="3"]');
      await d.click('#ckA3 [data-v="A gym"]');
      await d.click('#ckA3 [data-v="Outdoors"]');
      await d.click('#ckA5 [data-v="No"]');
      await d.fill("#ckA8", "7");
      await d.click("#ckGo");
      await until("the consultation on the server", async () => {
        const { data } = await admin.from("coach_checkins").select("kind, title, answers").eq("kind", "consult");
        return data.length === 1 && data[0].answers[3].a === "A gym, Outdoors" && data[0].answers[8].a === "7 hours";
      });
      await d.waitForFunction(() => !document.querySelector(".sheet"));
      assert.equal(await d.locator('[data-act="cgCheckin"][data-kind="consult"]').count(), 0, "asked once");
      // the self check-in carries the support line
      await d.click('[data-act="cgCheckin"][data-kind="self"]');
      assert.match(await text(d, ".sheet >> nth=-1"), /Relationship with food for Coach Ann[\s\S]*Bodywhys \(bodywhys\.ie\) in Ireland and Beat \(beateatingdisorders\.org\.uk\) in the UK/);
      await d.click('#ckA0 [data-v="7"]');
      await d.click("#ckGo");
      await until("the self check-in on the server", async () =>
        (await admin.from("coach_checkins").select("id").eq("kind", "self")).data.length === 1,
      );
      await d.waitForFunction(() => !document.querySelector(".sheet"));
      // the roadmap with the coach's note
      await d.click("#brandTag");
      await d.waitForSelector("#csBody");
      assert.match(await text(d, "#csBody"), /Ignite \| Now, week 1 of 4[\s\S]*Milestone met[\s\S]*From your coach:[\s|]*Good first week\. Keep the walks going\./);
      await shot(d, "client-roadmap-note");
      await closeSheets(d);

      // the coach: the consultation is in the inbox to answer; the self check-in is not something to answer
      await a.reload();
      await a.waitForSelector('[data-act="cgInboxOpen"]', { timeout: 20000 });
      assert.match(await text(a, "#main"), /Check-ins \| Dee \| To answer \| Consultation/);
      assert.equal(await a.locator('[data-act="cgInboxOpen"]').count(), 1);
      await a.click('[data-act="cgInboxOpen"]');
      await a.waitForSelector("#ckReply", { timeout: 15000 });
      assert.match(await text(a, ".sheet >> nth=-1"), /Dee: Consultation[\s\S]*What do you want to achieve, and by when\? \| Lose 5 kg by the summer[\s\S]*Where will you train\? \| A gym, Outdoors[\s\S]*No answer/);
      await closeSheets(a);
    },
  );
  await step(
    "a meal plan typed by the coach: the client sees the days, and logs a meal from it in one tap as an entry made by hand",
    async () => {
      const d = browser.contexts().pop().pages()[0];
      await closeSheets(a);
      await a.click('.crow[data-act="coClient"][data-id^="u:"]:has-text("Dee")');
      await a.click('[data-act="ccTab"][data-t="plan"]');
      await a.click('[data-act="coMeal"]');
      await a.fill("#cmT", "Dee's days of eating");
      await a.fill("#cmD0", "Breakfast: Porridge with berries | 350 | 20\nLunch: Chicken wrap | 520 | 38\nDinner: Salmon, potatoes and greens | 640 | 42\nSnack: Greek yoghurt | 150 | 15");
      await a.fill("#cmD1", "Omelette and toast | 420 | 28\nSoup and a roll | 380");
      await a.fill("#cmNote", "Swap any dinner for another.");
      await a.click('[data-act="coMealSave"]');
      await until("the meal plan on the server", async () => {
        const { data } = await admin.from("coach_links").select("coach_assign(data)").eq("client_id", people[3]);
        const mp = data[0].coach_assign && data[0].coach_assign.data.mealplan;
        return !!(
          mp &&
          mp.days.length === 2 &&
          mp.days[0].items.length === 4 &&
          mp.days[0].items[3].m === "s" &&
          mp.days[1].items[0].m === "b" &&
          mp.days[1].items[1].m === "l" &&
          mp.days[1].items[1].p === 0
        );
      });
      await a.waitForFunction(() => /Meal plan \| Change \| Dee's days of eating: Training day, 1,660 kcal · Rest day, 800 kcal/.test(document.querySelector("#ccBody").innerText.replace(/\s*\n+\s*/g, " | ")), null, { timeout: 10000 });
      await closeSheets(a);
      await closeSheets(d);
      await d.goto(APP + "#today");
      await d.reload();
      await d.waitForSelector("#brandTag[data-act]", { timeout: 20000 });
      await d.waitForTimeout(2500);
      await clear(d);
      await d.click("#brandTag");
      await d.waitForSelector('[data-act="coMealLog"]', { timeout: 15000 });
      assert.match(
        await text(d, "#csBody"),
        /Dee's days of eating \| Training day \| 1,660 kcal · 115 g protein \| Porridge with berries \| 350 \| Log \| Breakfast · 20 g protein[\s\S]*Rest day \| 800 kcal · 28 g protein[\s\S]*Swap any dinner for another\.[\s\S]*These are Coach Ann's figures, typed by them/i,
      );
      await shot(d, "client-meal-plan");
      await d.click('[data-act="coMealLog"][data-d="0"][data-i="0"]');
      await until("the meal in the client's own diary, marked as entered by hand", async () => {
        const day = (await docs(people[3], "days")).pop();
        return !!(day && day.data.e.some((e) => e.n === "Porridge with berries" && e.k === 350 && e.p === 20 && e.src === "Q" && e.m === "b"));
      });
      assert.equal(await d.locator("#csBody").count(), 1, "the Coach space stays open after logging");
      await clear(d);
      await closeSheets(d);
    },
  );
  // ---- the first run for a coach and for a coach's client (onboarding phase 1b)
  let code2 = "";
  await step(
    "the link for coaches: sign in, health information, no targets, the set-up sheet, then an invitation",
    async () => {
      const email = `coach-eve-${Date.now()}@example.test`;
      const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
      people.push(data.user.id);
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: APP } });
      const e = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      e.on("pageerror", (x) => errs.push("eve: " + String(x)));
      await e.goto(APP + "#coach-start");
      await e.waitForSelector("#siEmail");
      assert.match(await text(e, "#main"), /Create your coach account|Sign in to set up your coaching/);
      await e.goto(link.data.properties.action_link);
      await e.waitForSelector("#hcGo", { timeout: 20000 });
      await e.fill("#hcD", "03");
      await e.fill("#hcM", "03");
      await e.fill("#hcY", "1988");
      await e.click("#hcGo");
      await e.waitForSelector('[data-act="coachSetupGo"]', { timeout: 20000 });
      assert.equal(await e.locator("#tgBody").count(), 0, "a coach is not asked for targets of their own");
      await e.fill("#csName", "Coach Eve");
      await e.fill("#csHello", "Welcome aboard.");
      await e.click('[data-act="coachSetupGo"]');
      await e.waitForSelector("#ciMe");
      assert.equal(await e.inputValue("#ciMe"), "Coach Eve");
      await e.fill("#ciName", "Fay");
      await e.click("#ciGo");
      await e.waitForSelector("#ciOut .sq-code");
      code2 = (await e.innerText("#ciOut .sq-code")).trim();
      await until("the starter kept on the coach's account", async () =>
        (await docs(data.user.id, "meta")).some(
          (d) => d.id === "coach" && d.data.starter && d.data.starter.consult === true && d.data.starter.msg === "Welcome aboard.",
        ),
      );
    },
  );
  await step(
    "a client arriving by an invitation chooses what to share before the set-up, with nothing switched on",
    async () => {
      const email = `coach-fay-${Date.now()}@example.test`;
      const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
      people.push(data.user.id);
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: APP } });
      const f = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      f.on("pageerror", (x) => errs.push("fay: " + String(x)));
      await f.goto(APP + "#coach=" + code2);
      await f.waitForSelector("#siEmail");
      assert.match(await text(f, "#main"), /join your coach/);
      await f.goto(link.data.properties.action_link);
      await f.waitForSelector("#hcGo", { timeout: 20000 });
      await f.fill("#hcD", "03");
      await f.fill("#hcM", "03");
      await f.fill("#hcY", "1994");
      await f.click("#hcGo");
      await f.waitForSelector("#cjBody .banner", { timeout: 20000 });
      assert.equal(await f.locator("#tgBody").count(), 0, "sharing is chosen before the set-up");
      assert.match(await text(f, "#cjBody"), /Before anything else, choose what your coach can see[\s\S]*Coach Eve has invited you/);
      assert.equal(await f.locator('#cjBody [data-act="cgShare"][aria-pressed="true"]').count(), 0, "nothing is switched on");
      await f.click('[data-act="cgShare"][data-area="food"]');
      await f.fill("#cjName", "Fay");
      await f.click("#cjGo");
      await f.waitForSelector("#tgBody", { timeout: 20000 });
      await f.click('#tgBody button:has-text("Female")');
      await f.fill('#tgBody [data-k="cm"]', "168");
      await f.fill('#tgBody [data-k="kg"]', "70");
      await f.click('[data-act="saveTargets"]');
      await f.waitForSelector("#obLinks");
      await f.fill("#q", "banana");
      await f.click('.qadd[data-act="quickPick"] >> nth=0');
      await clear(f);
      await closeSheets(f);
      await clear(f);
      await until("Today pointing at the Coach space", async () => /See what Coach Eve has set for you/.test(await text(f, "#main")));
    },
  );
  await step("no page errors", async () => assert.deepEqual(errs, []));
} finally {
  await browser.close();
  server.kill();
  for (const id of people)
    await admin.auth.admin.deleteUser(id).catch(() => {});
}
for (const [s, n] of results) console.log(s, n);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(
  failed
    ? `${failed} of ${results.length} steps failed`
    : `all ${results.length} steps passed`,
);
process.exit(failed ? 1 : 0);

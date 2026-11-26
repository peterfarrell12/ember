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
  await pg.waitForSelector("#tgBody", { timeout: 20000 });
  await pg.click('#tgBody button:has-text("Male")');
  for (const [k, v] of [
    ["age", "34"],
    ["cm", "183"],
    ["kg", "86"],
  ])
    await pg.fill(`#tgBody [data-k="${k}"]`, v);
  await pg.click('[data-act="saveTargets"]');
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
        /From your coach, Coach Ann \| New targets \| 2,100 kcal a day and 140 g of protein/,
      );
      await b.click('[data-act="cgOfferYes"][data-k="t"]');
      await until(
        "the accepted targets in the client's account",
        async () => (await docs(people[1], "profile"))[0].data.t.k === 2100,
      );
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
    assert.match(await text(a, "#chBody"), /How did the session go\?/);
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
      // the row reaches the server before the client's screen redraws, so wait for the prompt to go
      await until(
        "asked once a week",
        async () => (await b.locator('[data-act="cgCheckin"]').count()) === 0,
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
      await a.click('nav.tabs [data-tab="clients"]');

      // the client: habits on Today, everything else behind the coach's name
      await b.goto(APP + "#today");
      await b.reload();
      await b.waitForSelector('[data-act="habitTick"]', { timeout: 20000 });
      assert.match(
        await text(b, "#main"),
        /Habits \| from Coach Ann \| Sit down for one meal without a screen/,
      );
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
        /Your coach: Coach Ann[\s\S]*Messages[\s\S]*Your roadmap[\s\S]*Ignite \| Now, week 1 of 4[\s\S]*Aiming for 2,200 kcal, 8,000 steps\.[\s\S]*Transform[\s\S]*Thrive/i,
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
      await b.click('[data-act="suppTick"]');
      await b.waitForSelector('[data-act="suppTick"][aria-pressed="true"]');
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
        return data.some((w) => w.data.steps === 9000 && w.data.days === 1);
      }, 90000);
      const wk = (await admin.from("coach_weeks").select("data")).data;
      assert.ok(
        wk.every((w) => w.data.kg === undefined && w.data.weighs === undefined),
        "no weight in a summary while weight is not shared",
      );
      await openClient(a);
      await a.waitForSelector("#ccBody table.mini", { timeout: 15000 });
      const over = await text(a, "#ccBody");
      assert.match(
        over,
        /Engagement \| On track \| 100 \| out of 100[\s\S]*Check-ins, last 1 week \| 1 of 1 \| Food logged, last 1 day \| 1 of 1[\s\S]*The last weeks[\s\S]*9,000/,
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
      const sees = await text(b, ".sheet >> nth=-1");
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

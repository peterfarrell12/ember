// Squads, voting on what to build next and importing a diary, in a real browser against the LOCAL Supabase:
// for squads, one person starts a squad, a second joins from the
// invite link, both appear on the week's board with what they have earned, the owner sets a challenge, and
// the second person leaves.
//   cd supabase && npm run start && npm run test:squads
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
/** A new person, signed in through an emailed link and through setup, on their own phone-sized browser. */
async function person(tag) {
  const email = `squad-${tag}-${Date.now()}@example.test`;
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
const clear = async (pg) => {
  for (let i = 0; i < 6; i++) {
    await pg.waitForTimeout(300);
    if (await pg.locator('[data-act="celeNext"]').count())
      await pg.click('[data-act="celeNext"]');
    else break;
  }
};
const text = async (pg, sel) =>
  (await pg.innerText(sel)).replace(/\s*\n+\s*/g, " | ");
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

try {
  const a = await person("a");
  let code = "";
  await step(
    "the Quests tab offers squads to a signed-in person, and says what a squad sees",
    async () => {
      await a.click('[data-act="tab"][data-tab="quests"]');
      await a.waitForSelector('[data-act="squadNew"]');
      await a.click('[data-act="squadNew"]');
      assert.match(
        await text(a, ".sheet"),
        /never sees your food, weight, photos/,
      );
    },
  );
  await step(
    "starting a squad gives a six-character code to share",
    async () => {
      await a.fill("#sqTitle", "Castlerea lifters");
      await a.fill("#sqMe", "Peter");
      await a.click('[data-act="squadNewGo"]');
      await a.waitForSelector(".sq-code");
      code = (await a.innerText(".sq-code")).trim();
      assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
      assert.match(await text(a, ".sheet"), /Castlerea lifters/);
    },
  );
  const b = await person("b");
  await step(
    "the invite link opens the join sheet with the code filled in, and joining shows the board",
    async () => {
      await b.goto(APP + "#join=" + code.toLowerCase());
      await b.waitForSelector("#sqCode", { timeout: 15000 });
      assert.equal(await b.inputValue("#sqCode"), code);
      await b.fill("#sqMe", "Bee");
      await b.click('[data-act="squadJoinGo"]');
      await b.waitForSelector("#sqBody2 .sq-code");
      assert.match(await text(b, ".sheet"), /2 members/);
    },
  );
  await step(
    "what a member earns shows on the board for both, ranked, with names and numbers only",
    async () => {
      await b.keyboard.press("Escape");
      await b.click('[data-act="tab"][data-tab="today"]');
      await b.click(".fab");
      await b.fill("#q", "banana");
      await b.click("#addList .res >> nth=0");
      await b.click("#fdGo");
      await clear(b);
      if (await b.locator(".sheet").count()) await b.keyboard.press("Escape");
      await b.click('[data-act="tab"][data-tab="quests"]');
      await b.click('[data-act="squadOpen"]');
      await b.waitForFunction(
        () =>
          /Bee/.test(document.querySelector("#sqBody2").innerText) &&
          /You/.test(document.querySelector("#sqBody2").innerText),
      );
      const mine = await text(b, "#sqBody2");
      assert.match(mine, /1 \| B \| Bee \| You/);
      await a.keyboard.press("Escape");
      await a.click('[data-act="squadOpen"]');
      await a.waitForFunction(() =>
        /Bee/.test(document.querySelector("#sqBody2").innerText),
      );
      assert.doesNotMatch(
        await text(a, "#sqBody2"),
        /@|example\.test/,
        "no email or id on the board",
      );
    },
  );
  await step(
    "the owner sets a team challenge and the other member sees it",
    async () => {
      await a.fill("#sqEdCh", "Ten sessions");
      await a.fill("#sqEdGoal", "10");
      await a.click('[data-act="squadSave"]');
      await a.waitForFunction(() =>
        /of 10 sessions/.test(document.querySelector("#sqBody2").innerText),
      );
      await b.keyboard.press("Escape");
      await b.click('[data-act="squadOpen"]');
      await b.waitForFunction(() =>
        /Ten sessions/.test(document.querySelector("#sqBody2").innerText),
      );
      assert.equal(
        await b.locator("#sqEdName").count(),
        0,
        "a member gets no owner controls",
      );
    },
  );
  await step("a member can leave, and is off the board at once", async () => {
    await b.click('[data-act="squadLeave"]');
    await b.click('[data-act="squadLeave"]');
    await b.waitForFunction(() => !document.querySelector("#sqBody2"));
    await a.keyboard.press("Escape");
    await a.click('[data-act="squadOpen"]');
    await a.waitForFunction(() =>
      /1 member,/.test(document.querySelector("#sqBody2").innerText),
    );
    assert.doesNotMatch(await text(a, "#sqBody2"), /Bee/);
  });
  // ---- what to build next: a vote is counted once, shown to everyone as a total, and can be taken back
  const openYou = async (pg, act) => {
    while (await pg.locator(".sheet").count()) {
      await pg.keyboard.press("Escape");
      await pg.waitForTimeout(250);
    }
    await pg.click("#chipYou");
    await pg.click(`[data-act="${act}"]`);
  };
  /** Wait until the server holds this many votes. */
  const votes = async (n) => {
    let seen = -1;
    for (const end = Date.now() + 8000; Date.now() < end; ) {
      seen = (await admin.from("roadmap_votes").select("item_id")).data.length;
      if (seen === n) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.equal(seen, n, "votes on the server");
  };
  await step(
    "a vote on what to build next shows as a total to someone else, and can be taken back",
    async () => {
      await openYou(a, "roadmap");
      await a.click('[data-act="roadmapVote"][data-id="widgets"]');
      await a.waitForSelector(
        '[data-act="roadmapVote"][data-id="widgets"][aria-pressed="true"]',
      );
      await votes(1); // the button changes at once; the vote reaches the server a moment later
      await openYou(b, "roadmap");
      await b.waitForSelector('[data-act="roadmapVote"][data-id="widgets"]');
      const theirs = b.locator('[data-act="roadmapVote"][data-id="widgets"]');
      assert.equal(await theirs.getAttribute("aria-pressed"), "false");
      assert.match(await theirs.getAttribute("aria-label"), /, 1 vote$/);
      if (process.env.SHOTS) {
        await b.waitForTimeout(800); // let the sheet finish sliding in
        await b.screenshot({ path: process.env.SHOTS + "/roadmap.png" });
      }
      assert.match(
        await text(b, "#rmBody"),
        /^Home and lock screen widgets/,
        "the most wanted is first",
      );
      await a.click('[data-act="roadmapVote"][data-id="widgets"]');
      await a.waitForSelector(
        '[data-act="roadmapVote"][data-id="widgets"][aria-pressed="false"]',
      );
      await votes(0);
    },
  );
  await step("a suggestion reaches the owner and nobody else", async () => {
    await a.fill("#rmNote", "A widget for the lock screen");
    await a.click('[data-act="roadmapSend"]');
    await a.waitForFunction(
      () => document.querySelector("#rmNote").value === "",
    );
    const notes = (await admin.from("roadmap_notes").select("user_id, body"))
      .data;
    assert.deepEqual(notes, [
      { user_id: people[0], body: "A widget for the lock screen" },
    ]);
  });
  // ---- a diary from another app: days arrive in the account marked Imported, earn nothing, and come out again
  await step(
    "a diary exported from another app is brought into the account, without touching the streak or XP",
    async () => {
      const day = (n) => {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      const rows = [
        "Day,Group,Food Name,Amount,Energy (kcal),Carbs (g),Fat (g),Protein (g)",
      ];
      for (let n = 5; n >= 0; n--)
        rows.push(
          `${day(n)},Breakfast,Porridge,250 g,280,48,5,10`,
          `${day(n)},Dinner,"Chicken, rice",1 plate,640,70,14,52`,
        );
      const xp = await b.innerText(".phero .small").catch(() => "");
      await openYou(b, "importDiary");
      await b.setInputFiles("#fileDiary", {
        name: "servings.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(rows.join("\n")),
      });
      await b.waitForSelector("#dyGo");
      // today already has the banana logged in Ember, so it is left alone: five days come in, not six
      assert.match(
        await text(b, "#dyOut"),
        /Cronometer diary.*6 days.*1 of those days already has food logged.*Bring 5 days in/,
      );
      await b.click("#dyGo");
      await b.waitForSelector("#dyOut .banner");
      assert.match(await text(b, "#dyOut"), /5 days and 10 entries brought in/);
      const stored = async () =>
        (
          await admin
            .from("user_docs")
            .select("id, data")
            .eq("user_id", people[1])
            .eq("kind", "days")
        ).data;
      let days = [];
      for (let i = 0; i < 40; i++) {
        days = await stored();
        if (days.length === 6) break;
        await b.waitForTimeout(250);
      }
      assert.equal(days.length, 6, "five imported days and today");
      const old = days.find((d) => d.id === day(3));
      assert.deepEqual(
        old.data.e.map((e) => [e.n, e.k, e.src, e.m]),
        [
          ["Porridge", 280, "IM", "b"],
          ["Chicken, rice", 640, "IM", "d"],
        ],
      );
      assert.equal(
        days.find((d) => d.id === day(0)).data.e.every((e) => e.src !== "IM"),
        true,
        "today is untouched",
      );
      await b.keyboard.press("Escape");
      await b.waitForTimeout(300);
      assert.match(
        await text(b, ".pstats"),
        /^1 \| day streak \| 6 \| days logged/,
      );
      if (xp) assert.equal(await b.innerText(".phero .small"), xp);
    },
  );
  await step("the imported days can be taken out again", async () => {
    await openYou(b, "importDiary");
    await b.click('[data-act="diaryUnimport"]');
    let left = [];
    for (let i = 0; i < 40; i++) {
      left = (
        await admin
          .from("user_docs")
          .select("id")
          .eq("user_id", people[1])
          .eq("kind", "days")
      ).data;
      if (left.length === 1) break;
      await b.waitForTimeout(250);
    }
    assert.equal(left.length, 1, "only today is left");
  });
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

// Squads in a real browser against the LOCAL Supabase: one person starts a squad, a second joins from the
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

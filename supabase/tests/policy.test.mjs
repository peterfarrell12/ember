// Proves that one account cannot read or write another account's rows.
// Runs against the LOCAL Supabase only (npm run start in this folder); it creates and deletes test users,
// so it refuses to run against anything that is not on this machine.
//   cd supabase && npm run start && npm test
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { supabaseBackend } from "../../web/src/app/backend-supabase.js";
import { squadsApi } from "../../web/src/app/squads.js";

const env = Object.fromEntries(
  execFileSync("npx", ["supabase", "status", "-o", "env"], { encoding: "utf8" })
    .split("\n")
    .map((l) => l.match(/^(\w+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const url = env.API_URL;
assert.match(
  url || "",
  /^http:\/\/(127\.0\.0\.1|localhost):/,
  "policy test only runs against a local Supabase",
);

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, env.SERVICE_ROLE_KEY, opts);
const results = [];
const check = async (name, run) => {
  try {
    await run();
    results.push(["ok  ", name]);
  } catch (e) {
    results.push([
      "FAIL",
      name + "\n      " + String(e && e.message).split("\n")[0],
    ]);
  }
};

async function person(tag) {
  const email = `policy-${tag}-${Date.now()}@example.test`;
  const password = "pw-" + Math.random().toString(36).slice(2) + "-Aa1";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient(url, env.ANON_KEY, opts);
  const s = await client.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return {
    id: data.user.id,
    client,
    store: supabaseBackend(client, data.user.id),
  };
}

const a = await person("a");
const b = await person("b");
const visitor = createClient(url, env.ANON_KEY, opts);

try {
  await a.store.set("profile", undefined, { name: "A", kg: 86 });
  await a.store.set("days", "2026-11-19", {
    date: "2026-11-19",
    e: [{ n: "Porridge", k: 300 }],
  });

  await check("the owner reads back their own documents", async () => {
    assert.deepEqual(await a.store.get("profile"), { name: "A", kg: 86 });
    assert.equal((await a.store.list("days")).length, 1);
  });
  await check(
    "a second account reads nothing through the app`s own calls",
    async () => {
      assert.equal(await b.store.get("profile"), null);
      assert.equal(await b.store.get("days", "2026-11-19"), null);
      assert.deepEqual(await b.store.list("days"), []);
    },
  );
  await check(
    "a second account sees no rows even when it asks for the whole table",
    async () => {
      const { data, error } = await b.client
        .from("user_docs")
        .select("user_id, kind, id");
      assert.equal(error, null);
      assert.deepEqual(data, []);
    },
  );
  await check(
    "a second account sees no rows when it asks for the first account by id",
    async () => {
      const { data } = await b.client
        .from("user_docs")
        .select("*")
        .eq("user_id", a.id);
      assert.deepEqual(data, []);
    },
  );
  await check(
    "a second account cannot write a row in the first account`s name",
    async () => {
      const { error } = await b.client
        .from("user_docs")
        .insert({
          user_id: a.id,
          kind: "days",
          id: "2026-11-20",
          data: { hacked: true },
        });
      assert.ok(error, "the insert should be refused");
      const { error: e2 } = await b.client
        .from("user_docs")
        .upsert(
          { user_id: a.id, kind: "profile", id: "", data: { hacked: true } },
          { onConflict: "user_id,kind,id" },
        );
      assert.ok(e2, "the upsert should be refused");
    },
  );
  await check(
    "a second account cannot change or delete the first account`s rows",
    async () => {
      await b.client
        .from("user_docs")
        .update({ data: { hacked: true } })
        .eq("user_id", a.id);
      await b.client.from("user_docs").delete().eq("user_id", a.id);
      await b.client
        .from("user_docs")
        .update({ user_id: b.id })
        .eq("user_id", a.id);
      assert.deepEqual(await a.store.get("profile"), { name: "A", kg: 86 });
      assert.equal((await a.store.list("days")).length, 1);
    },
  );
  await check(
    "a second account cannot hand one of its own rows to the first account",
    async () => {
      await b.store.set("foods", "mine", { n: "B food" });
      const { error } = await b.client
        .from("user_docs")
        .update({ user_id: a.id })
        .eq("kind", "foods")
        .eq("id", "mine");
      assert.ok(error, "the move should be refused");
      assert.deepEqual(await a.store.list("foods"), []);
    },
  );
  await check(
    "a visitor who is not signed in can read and write nothing",
    async () => {
      const r = await visitor.from("user_docs").select("*");
      assert.ok(r.error || r.data.length === 0);
      const w = await visitor
        .from("user_docs")
        .insert({ user_id: a.id, kind: "days", id: "x", data: {} });
      assert.ok(w.error, "the insert should be refused");
    },
  );
  await check("the database, not the client, sets updated_at", async () => {
    await a.client
      .from("user_docs")
      .upsert({
        user_id: a.id,
        kind: "meta",
        id: "t",
        data: {},
        updated_at: "2001-01-01T00:00:00Z",
      });
    const { data } = await a.client
      .from("user_docs")
      .select("updated_at")
      .eq("kind", "meta")
      .eq("id", "t")
      .single();
    assert.ok(new Date(data.updated_at).getFullYear() > 2001);
  });
  // Claude usage: written only by the server, readable only by its owner
  const day = new Date().toISOString().slice(0, 10);
  await check(
    "only the server can record Claude usage; a person can read their own and nobody else`s",
    async () => {
      const rec = {
        p_user: a.id,
        p_day: day,
        p_input: 1000,
        p_output: 200,
        p_searches: 0,
        p_cost: 0.004,
      };
      assert.equal((await admin.rpc("record_ai_usage", rec)).error, null);
      assert.equal((await admin.rpc("record_ai_usage", rec)).error, null);
      const mine = await a.client
        .from("ai_usage")
        .select("calls, input_tokens, cost_usd");
      assert.deepEqual(mine.data, [
        { calls: 2, input_tokens: 2000, cost_usd: 0.008 },
      ]);
      assert.deepEqual((await b.client.from("ai_usage").select("*")).data, []);
      assert.equal(
        Number((await admin.rpc("ai_spend_on", { p_day: day })).data),
        0.008,
      );
    },
  );
  await check(
    "nobody can lower or invent their own usage, or see the total spent",
    async () => {
      assert.ok(
        (
          await a.client.rpc("record_ai_usage", {
            p_user: a.id,
            p_day: day,
            p_input: 0,
            p_output: 0,
            p_searches: 0,
            p_cost: -1,
          })
        ).error,
      );
      assert.ok(
        (
          await a.client
            .from("ai_usage")
            .update({ cost_usd: 0 })
            .eq("user_id", a.id)
        ).error,
      );
      assert.ok(
        (await a.client.from("ai_usage").delete().eq("user_id", a.id)).error,
      );
      assert.ok(
        (
          await a.client
            .from("ai_usage")
            .insert({ user_id: a.id, day: "2020-01-01" })
        ).error,
      );
      assert.ok((await a.client.rpc("ai_spend_on", { p_day: day })).error);
      assert.ok((await visitor.rpc("ai_spend_on", { p_day: day })).error);
      assert.equal(
        (await a.client.from("ai_usage").select("calls")).data[0].calls,
        2,
      );
    },
  );
  await check(
    "the saved products are reachable only by the server",
    async () => {
      const row = {
        key: "policy|test",
        name: "Test",
        brand: "Policy",
        found: false,
      };
      assert.equal((await admin.from("products").upsert(row)).error, null);
      for (const c of [a.client, visitor]) {
        const r = await c.from("products").select("key");
        assert.ok(r.error || r.data.length === 0);
        assert.ok(
          (await c.from("products").upsert({ ...row, key: "planted" })).error,
        );
        await c.from("products").delete().eq("key", "policy|test");
      }
      assert.equal(
        (await admin.from("products").select("key").eq("key", "policy|test"))
          .data.length,
        1,
      );
      await admin.from("products").delete().eq("key", "policy|test");
    },
  );
  await check(
    "a report that a product is wrong is filed as yourself and seen only by you",
    async () => {
      const report = {
        product: "5000159461122",
        name: "Snickers",
        brand: "Snickers",
        shown: { k: 481 },
        note: "Pack says 488",
      };
      assert.equal(
        (await a.client.from("product_reports").insert(report)).error,
        null,
      );
      assert.equal(
        (await a.client.from("product_reports").select("note")).data.length,
        1,
      );
      assert.deepEqual(
        (await b.client.from("product_reports").select("*")).data,
        [],
      );
      assert.ok(
        (
          await b.client
            .from("product_reports")
            .insert({ ...report, user_id: a.id })
        ).error,
        "not in someone else`s name",
      );
      assert.ok(
        (
          await a.client
            .from("product_reports")
            .insert({ ...report, note: "x".repeat(501) })
        ).error,
        "notes are capped",
      );
      assert.ok((await visitor.from("product_reports").insert(report)).error);
      await a.client
        .from("product_reports")
        .update({ note: "changed" })
        .eq("product", "5000159461122");
      await b.client
        .from("product_reports")
        .delete()
        .eq("product", "5000159461122");
      assert.equal(
        (await admin.from("product_reports").select("note").eq("user_id", a.id))
          .data[0].note,
        "Pack says 488",
      );
    },
  );
  await check(
    "an error report can be filed as yourself, and read by nobody but the owner",
    async () => {
      const row = {
        name: "TypeError",
        message: "x is not a function",
        stack: "render index.js:1:1",
        version: "abc1234",
        screen: "today",
        agent: "test",
      };
      assert.equal(
        (await a.client.from("client_errors").insert(row)).error,
        null,
      );
      assert.ok(
        (await a.client.from("client_errors").select("*")).error,
        "not even your own",
      );
      assert.ok(
        (await b.client.from("client_errors").insert({ ...row, user_id: a.id }))
          .error,
        "not in someone else`s name",
      );
      assert.ok(
        (
          await a.client
            .from("client_errors")
            .insert({ ...row, message: "x".repeat(301) })
        ).error,
        "sizes are capped",
      );
      assert.ok((await visitor.from("client_errors").insert(row)).error);
      assert.equal(
        (await admin.from("client_errors").select("name").eq("user_id", a.id))
          .data.length,
        1,
      );
    },
  );
  // progress photos: private storage, one folder per person
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
    type: "image/jpeg",
  });
  const path = a.id + "/policy.jpg";
  await check(
    "the owner can store, list and sign a link to their own photo",
    async () => {
      assert.equal(
        (
          await a.client.storage
            .from("photos")
            .upload(path, jpeg, { contentType: "image/jpeg" })
        ).error,
        null,
      );
      assert.equal(
        (await a.client.storage.from("photos").list(a.id)).data.length,
        1,
      );
      assert.ok(
        (await a.client.storage.from("photos").createSignedUrl(path, 60)).data
          .signedUrl,
      );
    },
  );
  await check(
    "a second account cannot list, download, link to, replace or remove the first account`s photo",
    async () => {
      const st = b.client.storage.from("photos");
      assert.deepEqual((await st.list(a.id)).data, []);
      assert.ok((await st.download(path)).error, "download refused");
      assert.ok(
        (await st.createSignedUrl(path, 60)).error,
        "signed link refused",
      );
      assert.ok(
        (
          await st.upload(path, jpeg, {
            contentType: "image/jpeg",
            upsert: true,
          })
        ).error,
        "replace refused",
      );
      assert.ok(
        (
          await st.upload(a.id + "/planted.jpg", jpeg, {
            contentType: "image/jpeg",
          })
        ).error,
        "adding to the folder refused",
      );
      await st.remove([path]);
      assert.equal(
        (await a.client.storage.from("photos").list(a.id)).data.length,
        1,
        "still there",
      );
    },
  );
  await check(
    "a photo is not reachable by anyone without a signed link",
    async () => {
      assert.notEqual(
        (await fetch(`${url}/storage/v1/object/public/photos/${path}`)).status,
        200,
      );
      assert.ok((await visitor.storage.from("photos").download(path)).error);
      assert.ok(
        (
          await visitor.storage
            .from("photos")
            .upload("x/y.jpg", jpeg, { contentType: "image/jpeg" })
        ).error,
      );
    },
  );
  // ---- squads: only members see a squad; a member changes only their own row; the owner runs it
  const sa = squadsApi(a.client, a.id),
    sb = squadsApi(b.client, b.id),
    week = "2026-11-23";
  let squad;
  await check(
    "a squad is created with a code, and its creator is the owner and first member",
    async () => {
      squad = await sa.create("Castlerea lifters", "Peter");
      assert.match(squad.code, /^[A-HJ-NP-Z2-9]{6}$/);
      const mine = await sa.mine();
      assert.equal(mine.length, 1);
      assert.equal(mine[0].owned, true);
    },
  );
  await check(
    "someone who has not joined can see neither the squad nor its members, and cannot read its board",
    async () => {
      assert.deepEqual(await sb.mine(), []);
      assert.deepEqual(
        (await b.client.from("squad_members").select("name")).data,
        [],
      );
      await assert.rejects(
        sb.board(squad.id, week),
        (e) => e.code === "not_a_member",
      );
    },
  );
  await check(
    "nobody can insert a squad or a membership directly: only the functions do that",
    async () => {
      assert.ok(
        (
          await b.client
            .from("squads")
            .insert({ code: "ZZZZZZ", name: "Mine", owner: b.id })
        ).error,
      );
      assert.ok(
        (
          await b.client
            .from("squad_members")
            .insert({ squad_id: squad.id, user_id: b.id, name: "B" })
        ).error,
      );
    },
  );
  await check(
    "a wrong code is refused; the right one joins, and joining twice changes nothing",
    async () => {
      await assert.rejects(
        sb.join("NOPE22", "Bee"),
        (e) => e.code === "not_found",
      );
      assert.equal(await sb.join(squad.code.toLowerCase(), "Bee"), squad.id);
      assert.equal(await sb.join(squad.code, "Bee"), squad.id);
      assert.equal((await sb.mine()).length, 1);
      assert.equal((await sb.mine())[0].owned, false);
    },
  );
  await check(
    "the board shows names and numbers for the week, ranks the caller, and carries no ids",
    async () => {
      await sa.publish({ week, xp: 300, streak: 9, sessions: 3 });
      await sb.publish({ week, xp: 120, streak: 2, sessions: 1 });
      const board = await sb.board(squad.id, week);
      assert.equal(board.members, 2);
      assert.equal(board.sessions, 4);
      assert.equal(board.rank, 2);
      assert.deepEqual(board.top, [
        { me: false, name: "Peter", xp: 300, streak: 9, sessions: 3 },
        { me: true, name: "Bee", xp: 120, streak: 2, sessions: 1 },
      ]);
      assert.equal(JSON.stringify(board).includes(a.id), false);
    },
  );
  await check(
    "a member cannot change another member`s row, the squad, or its code",
    async () => {
      await b.client
        .from("squad_members")
        .update({ xp: 99999 })
        .eq("user_id", a.id);
      await b.client
        .from("squads")
        .update({ name: "Taken over" })
        .eq("id", squad.id);
      assert.ok(
        (
          await a.client
            .from("squads")
            .update({ code: "AAAAAA" })
            .eq("id", squad.id)
        ).error,
        "not even the owner",
      );
      const board = await sa.board(squad.id, week);
      assert.equal(board.top[0].xp, 300);
      assert.equal((await sa.mine())[0].name, "Castlerea lifters");
      assert.equal((await sa.mine())[0].code, squad.code);
    },
  );
  await check(
    "figures outside what a person could do are refused by the database",
    async () => {
      assert.ok(
        (
          await b.client
            .from("squad_members")
            .update({ xp: 5000000 })
            .eq("user_id", b.id)
        ).error,
      );
      assert.ok(
        (
          await b.client
            .from("squad_members")
            .update({ sessions: -1 })
            .eq("user_id", b.id)
        ).error,
      );
    },
  );
  await check(
    "only the owner can set a challenge or remove a name; a member can leave",
    async () => {
      await assert.rejects(
        sb.remove(squad.id, "Peter"),
        (e) => e.code === "not_owner",
      );
      await sa.edit(squad.id, {
        challenge: { name: "20 sessions this week", goal: 20 },
      });
      assert.equal((await sb.mine())[0].challenge.goal, 20);
      assert.equal(await sa.remove(squad.id, "Bee"), 1);
      assert.deepEqual(await sb.mine(), []);
      await sb.join(squad.code, "Bee");
      await sb.leave(squad.id);
      assert.deepEqual(await sb.mine(), []);
      assert.equal((await sa.board(squad.id, week)).members, 1);
    },
  );
  await check("a person can own three squads and no more", async () => {
    await sa.create("Second", "Peter");
    await sa.create("Third", "Peter");
    await assert.rejects(
      sa.create("Fourth", "Peter"),
      (e) => e.code === "too_many_owned",
    );
  });
  await check(
    "deleting the owner`s account takes their squads with it",
    async () => {
      await sb.join(squad.code, "Bee");
      const c = await person("c");
      const sc = squadsApi(c.client, c.id);
      const theirs = await sc.create("Short lived", "Cee");
      await sb.join(theirs.code, "Bee");
      assert.equal((await sb.mine()).length, 2);
      assert.equal((await c.client.rpc("delete_my_account")).error, null);
      assert.equal((await sb.mine()).length, 1);
    },
  );
  await check(
    "one account cannot delete another: the delete function only ever removes the caller",
    async () => {
      assert.ok(
        (await visitor.rpc("delete_my_account")).error,
        "a visitor is refused",
      );
      const refused = await a.client.rpc("delete_my_account");
      assert.ok(
        refused.error &&
          /photos must be removed first/.test(refused.error.message),
        "refused while photos remain",
      );
      await a.client.storage.from("photos").remove([path]);
      await b.store.set("profile", undefined, { name: "B" });
      assert.equal((await b.client.rpc("delete_my_account")).error, null);
      assert.ok((await admin.auth.admin.getUserById(b.id)).error, "B is gone");
      assert.equal(
        (await admin.from("user_docs").select("kind").eq("user_id", b.id)).data
          .length,
        0,
        "with B`s rows",
      );
      assert.deepEqual(
        await a.store.get("profile"),
        { name: "A", kg: 86 },
        "A is untouched",
      );
    },
  );
  await check("deleting an account removes its rows", async () => {
    const { error } = await admin.auth.admin.deleteUser(a.id);
    assert.equal(error, null);
    const { data } = await admin
      .from("user_docs")
      .select("kind")
      .eq("user_id", a.id);
    assert.deepEqual(data, []);
  });
} finally {
  await admin.auth.admin.deleteUser(a.id).catch(() => {});
  await admin.auth.admin.deleteUser(b.id).catch(() => {});
}

for (const [s, n] of results) console.log(s, n);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(
  failed
    ? `${failed} of ${results.length} checks failed`
    : `all ${results.length} checks passed`,
);
process.exit(failed ? 1 : 0);

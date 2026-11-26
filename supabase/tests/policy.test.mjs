// Proves that one account cannot read or write another account's rows.
// Runs against the LOCAL Supabase only (npm run start in this folder); it creates and deletes test users,
// so it refuses to run against anything that is not on this machine.
//   cd supabase && npm run start && npm test
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { supabaseBackend } from "../../web/src/app/backend-supabase.js";
import { squadsApi } from "../../web/src/app/squads.js";
import { roadmapApi } from "../../web/src/app/roadmap.js";
import { coachingApi } from "../../web/src/app/coaching.js";

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
      const { error } = await b.client.from("user_docs").insert({
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
    await a.client.from("user_docs").upsert({
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
  // ---- what to build next: one vote each, totals only, the list is the owner`s, suggestions are private
  const ra = roadmapApi(a.client),
    rb = roadmapApi(b.client);
  await check(
    "anyone signed in sees the list with totals; a visitor sees nothing",
    async () => {
      const board = await ra.board();
      assert.ok(board.length >= 5);
      assert.ok(board.every((i) => i.votes === 0 && i.mine === false));
      assert.deepEqual(Object.keys(board[0]).sort(), [
        "about",
        "id",
        "mine",
        "status",
        "title",
        "votes",
      ]);
      assert.ok((await visitor.rpc("roadmap_board")).error);
      assert.ok((await visitor.from("roadmap_votes").select("item_id")).error);
    },
  );
  await check(
    "a vote counts once however often it is cast, and can be taken back",
    async () => {
      await ra.vote("widgets");
      await ra.vote("widgets");
      await rb.vote("widgets");
      await rb.vote("watch");
      const seen = Object.fromEntries(
        (await ra.board()).map((i) => [i.id, [i.votes, i.mine]]),
      );
      assert.deepEqual(seen.widgets, [2, true]);
      assert.deepEqual(seen.watch, [1, false]);
      assert.equal((await ra.board())[0].id, "widgets", "most wanted first");
      await rb.unvote("widgets");
      assert.equal((await ra.board()).find((i) => i.id === "widgets").votes, 1);
    },
  );
  await check(
    "nobody can see who voted, vote as someone else, or take back another person`s vote",
    async () => {
      const mine = (await a.client.from("roadmap_votes").select("user_id"))
        .data;
      assert.ok(mine.length && mine.every((v) => v.user_id === a.id));
      assert.ok(
        (
          await a.client
            .from("roadmap_votes")
            .insert({ item_id: "siri", user_id: b.id })
        ).error,
      );
      await a.client.from("roadmap_votes").delete().eq("item_id", "watch");
      assert.equal((await rb.board()).find((i) => i.id === "watch").votes, 1);
    },
  );
  await check(
    "the list itself cannot be read directly, added to or changed by a member",
    async () => {
      assert.ok((await a.client.from("roadmap_items").select("id")).error);
      assert.ok(
        (
          await a.client
            .from("roadmap_items")
            .insert({ id: "mine", title: "My own idea" })
        ).error,
      );
      assert.ok(
        (
          await a.client
            .from("roadmap_items")
            .update({ title: "Changed" })
            .eq("id", "watch")
        ).error,
      );
      await assert.rejects(ra.vote("no-such-item"));
    },
  );
  await check(
    "a suggestion is private to its writer, and three a day is the limit",
    async () => {
      await ra.suggest("  A barcode scanner for the fridge  ");
      assert.deepEqual(
        (await a.client.from("roadmap_notes").select("body")).data,
        [{ body: "A barcode scanner for the fridge" }],
      );
      assert.deepEqual(
        (await b.client.from("roadmap_notes").select("body")).data,
        [],
      );
      assert.ok(
        (await a.client.from("roadmap_notes").insert({ body: "direct insert" }))
          .error,
      );
      await assert.rejects(ra.suggest("x"));
      await ra.suggest("Second");
      await ra.suggest("Third");
      await assert.rejects(
        ra.suggest("Fourth"),
        (e) => e.code === "too_many_notes",
      );
    },
  );
  // ---- coaching: a coach sees only what a client's app sent, only while the link is active; a third person nothing
  const ca = coachingApi(a.client, a.id), // A is the coach
    cb = coachingApi(b.client, b.id); // B is the client
  let invite, linkId;
  await check(
    "an invitation has a code; the person invited can see who it is from; a coach cannot accept their own",
    async () => {
      invite = await ca.invite("Coach A", "Bee");
      assert.match(invite.code, /^[A-HJ-NP-Z2-9]{8}$/);
      assert.deepEqual(await cb.inviteInfo(invite.code.toLowerCase()), {
        coach_name: "Coach A",
        own: false,
      });
      await assert.rejects(
        ca.accept(invite.code, "Me", {}),
        (e) => e.code === "own_invite",
      );
      await assert.rejects(
        cb.inviteInfo("ZZZZZZZZ"),
        (e) => e.code === "not_found",
      );
      assert.equal(
        (await cb.links()).coach,
        null,
        "not a client until accepted",
      );
    },
  );
  await check(
    "accepting links the two accounts with what the client chose to share, and only one coach at a time",
    async () => {
      linkId = await cb.accept(invite.code, "Bee", {
        food: true,
        training: true,
        weight: false,
        photos: true, // not an area: ignored
      });
      const mine = (await cb.links()).coach;
      assert.equal(mine.status, "active");
      assert.deepEqual(mine.share, {
        food: true,
        training: true,
        weight: false,
        recovery: false,
      });
      assert.equal((await ca.links()).clients[0].client_name, "Bee");
      await assert.rejects(
        cb.accept(invite.code, "Bee", {}),
        (e) => e.code === "not_found",
        "a code works once",
      );
      const other = await coachingApi(visitor, "x")
        .invite("Nobody", "")
        .catch((e) => e);
      assert.ok(other && other.code, "a visitor cannot make an invitation");
    },
  );
  await check(
    "the coach reads what the client`s app sent and nothing else of the client`s",
    async () => {
      await b.store.set("days", "2026-11-25", { e: [{ n: "Secret supper" }] });
      await cb.publish({ name: "Bee", st: { streak: 4 }, ev: [] });
      const seen = await ca.statuses();
      assert.deepEqual(seen[linkId].data, {
        name: "Bee",
        st: { streak: 4 },
        ev: [],
      });
      assert.deepEqual(
        (await a.client.from("user_docs").select("id").eq("user_id", b.id))
          .data,
        [],
        "the diary itself stays closed to the coach",
      );
      await assert.rejects(
        ca.publish({ st: {} }),
        (e) => e.code === "no_coach",
        "a coach cannot write a client`s status",
      );
      assert.ok(
        (
          await a.client
            .from("coach_status")
            .update({ data: { st: { streak: 99 } } })
            .eq("link_id", linkId)
        ).error,
      );
    },
  );
  await check(
    "what the coach sets reaches the client; the client cannot set it, and nobody writes the tables directly",
    async () => {
      await ca.assign(linkId, "t", { k: 2100, p: 140 });
      await ca.assign(linkId, "msg", { t: "Good week" });
      const got = await cb.assigned(linkId);
      assert.equal(got.t.k, 2100);
      assert.equal(got.msg.t, "Good week");
      assert.ok(got.t.v > 0 && got.msg.v >= got.t.v);
      await assert.rejects(
        cb.assign(linkId, "t", { k: 9999 }),
        (e) => e.code === "not_found",
      );
      await assert.rejects(
        ca.assign(linkId, "bad part!", {}),
        (e) => e.code === "not_allowed",
      );
      for (const table of ["coach_links", "coach_assign", "coach_status"])
        assert.ok(
          (await b.client.from(table).delete().eq("link_id", linkId)).error ||
            (await b.client.from(table).delete().eq("id", linkId)).error,
          table,
        );
    },
  );
  await check(
    "messages pass between the two, sent only as yourself",
    async () => {
      await ca.send(linkId, "How did the session go?");
      await cb.send(linkId, "Well, thanks");
      const forB = await cb.messages(linkId);
      assert.deepEqual(
        forB.map((m) => [m.body, m.mine]),
        [
          ["How did the session go?", false],
          ["Well, thanks", true],
        ],
      );
      assert.ok(
        (
          await b.client
            .from("coach_messages")
            .insert({ link_id: linkId, body: "as the coach", sender: a.id })
        ).error,
        "the sender cannot be set by hand",
      );
      assert.equal((await ca.messages(linkId, forB[0].id)).length, 1);
    },
  );
  await check(
    "a third person sees no link, status, assignment or message, and cannot post into the conversation",
    async () => {
      const c = await person("coach-c");
      const cc = coachingApi(c.client, c.id);
      assert.deepEqual(await cc.links(), { clients: [], coach: null });
      assert.deepEqual(await cc.statuses(), {});
      assert.equal(await cc.assigned(linkId), null);
      assert.deepEqual(await cc.messages(linkId), []);
      await assert.rejects(cc.send(linkId, "hello"));
      await assert.rejects(cc.end(linkId), (e) => e.code === "not_found");
      await assert.rejects(
        cc.assign(linkId, "t", {}),
        (e) => e.code === "not_found",
      );
      await admin.auth.admin.deleteUser(c.id);
    },
  );
  await check(
    "changing what is shared, or pausing, takes away what the coach could see at once",
    async () => {
      await cb.setShare(linkId, { food: true });
      assert.deepEqual(await ca.statuses(), {}, "the old copy is gone");
      await cb.publish({ st: { streak: 5 } });
      assert.equal((await ca.statuses())[linkId].data.st.streak, 5);
      await cb.pause(linkId);
      assert.deepEqual(await ca.statuses(), {});
      await assert.rejects(
        cb.publish({ st: {} }),
        (e) => e.code === "no_coach",
        "nothing is sent while paused",
      );
      await assert.rejects(ca.send(linkId, "Still there?"));
      await assert.rejects(
        ca.setShare(linkId, { food: true, weight: true }),
        (e) => e.code === "not_allowed",
        "a coach cannot widen what is shared",
      );
      await cb.resume(linkId);
      await cb.publish({ st: { streak: 6 } });
      assert.equal((await ca.statuses())[linkId].data.st.streak, 6);
    },
  );
  await check(
    "a check-in goes from client to coach and the reply back; nobody else can read or answer it",
    async () => {
      const id = await cb.checkinSend(
        "2026-11-23",
        [{ q: "How was the week?", a: "Good" }],
        { sess: 3 },
      );
      await cb.checkinSend(
        "2026-11-23",
        [{ q: "How was the week?", a: "Better than good" }],
        { sess: 4 },
      );
      const forCoach = await ca.checkins(linkId);
      assert.equal(forCoach.length, 1, "one a week: sending again replaces it");
      assert.equal(forCoach[0].answers[0].a, "Better than good");
      await assert.rejects(
        ca.checkinSend("2026-11-23", [], {}),
        (e) => e.code === "no_coach",
        "a coach cannot write a client`s check-in",
      );
      await assert.rejects(
        cb.checkinReply(id, "Well done me"),
        (e) => e.code === "not_found",
        "a client cannot write the coach`s reply",
      );
      await ca.checkinReply(id, "  Strong week. Keep the protein up.  ");
      assert.equal(
        (await cb.checkins(linkId))[0].feedback,
        "Strong week. Keep the protein up.",
      );
      await assert.rejects(
        cb.checkinSend("2026-11-23", [], {}),
        (e) => e.code === "already_answered",
      );
      assert.ok(
        (
          await b.client
            .from("coach_checkins")
            .update({ feedback: "edited" })
            .eq("id", id)
        ).error,
      );
      const c = await person("checkin-c");
      assert.deepEqual(await coachingApi(c.client, c.id).checkins(linkId), []);
      await admin.auth.admin.deleteUser(c.id);
    },
  );
  await check(
    "a consultation form and a check-in are kept apart; weekly summaries reach the coach and go when sharing changes",
    async () => {
      await cb.checkinSend("1970-01-01", [{ q: "Any injuries?", a: "No" }], {}, "consult", "Consultation");
      const kinds = (await ca.checkins(linkId)).map((k) => k.kind).sort();
      assert.deepEqual(kinds, ["checkin", "consult"]);
      assert.equal((await ca.inbox()).length, 2);
      await assert.rejects(cb.checkinSend("2026-11-23", [], {}, "other"), (e) => e.code === "not_allowed");
      await cb.weekPut("2026-11-16", { kcal: 2100, kg: 80.4 });
      await cb.weekPut("2026-11-23", { kcal: 2050, kg: 80.1 });
      await cb.weekPut("2026-11-23", { kcal: 2060, kg: 80.0 });
      assert.deepEqual(
        (await ca.weeks(linkId)).map((w) => [w.week, w.data.kcal]),
        [
          ["2026-11-16", 2100],
          ["2026-11-23", 2060],
        ],
      );
      await assert.rejects(ca.weekPut("2026-11-23", { kcal: 1 }), (e) => e.code === "no_coach");
      const c = await person("weeks-c");
      assert.deepEqual(await coachingApi(c.client, c.id).weeks(linkId), []);
      assert.deepEqual(await coachingApi(c.client, c.id).inbox(), []);
      await admin.auth.admin.deleteUser(c.id);
      await cb.setShare(linkId, { food: true, training: true });
      assert.deepEqual(await ca.weeks(linkId), [], "changing what is shared removes the summaries");
      await cb.weekPut("2026-11-23", { kcal: 2060 });
    },
  );
  await check(
    "an invitation with an email is found by the person who signs in with that address, and by nobody else",
    async () => {
      const mailC = `invited-${Date.now()}@example.test`;
      await ca.invite("Coach A", "Dee", mailC.toUpperCase());
      const made = await admin.auth.admin.createUser({ email: mailC, password: "pw-Invited-1x", email_confirm: true });
      const dc = createClient(url, env.ANON_KEY, opts);
      await dc.auth.signInWithPassword({ email: mailC, password: "pw-Invited-1x" });
      const forD = await coachingApi(dc, made.data.user.id).invitesForMe();
      assert.equal(forD.length, 1);
      assert.equal(forD[0].coach_name, "Coach A");
      assert.match(forD[0].code, /^[A-HJ-NP-Z2-9]{8}$/);
      assert.deepEqual(await cb.invitesForMe(), [], "another person sees none of it");
      assert.deepEqual(await ca.invitesForMe(), [], "nor does the coach who sent it");
      await admin.auth.admin.deleteUser(made.data.user.id);
    },
  );
  await check(
    "a coach`s page is read by its address, applied to once, and only the coach answers; accepting makes an invitation",
    async () => {
      await ca.savePage({
        slug: "coach-a",
        name: "Coach A",
        about: "Strength for field sports",
        offers: "Online coaching",
        brand: "#0f3d2e",
      });
      const c = await person("apply-c");
      const cc = coachingApi(c.client, c.id);
      const page = await cc.page("Coach-A");
      assert.deepEqual(page, {
        slug: "coach-a",
        name: "Coach A",
        about: "Strength for field sports",
        offers: "Online coaching",
        open: true,
        own: false,
        applied: null,
      });
      assert.equal(await cc.page("nobody-here"), null);
      assert.deepEqual(
        (await c.client.from("coach_pages").select("slug")).data,
        [],
        "pages are not listable",
      );
      await assert.rejects(
        cc.savePage({ slug: "coach-a", name: "Impostor" }),
        (e) => e.code === "taken",
      );
      await assert.rejects(
        ca.apply("coach-a", "Me", ""),
        (e) => e.code === "own_page",
      );
      await cc.apply("coach-a", "Cee", "I play hurling");
      await cc.apply("coach-a", "Cee", "I play hurling and football");
      const inbox = (await ca.applications()).inbox;
      assert.equal(inbox.length, 1);
      assert.equal(inbox[0].note, "I play hurling and football");
      assert.deepEqual(
        (await cb.applications()).inbox,
        [],
        "B sees none of it",
      );
      await assert.rejects(
        cc.answerApplication(inbox[0].id, true),
        (e) => e.code === "not_found",
        "an applicant cannot accept themselves",
      );
      assert.ok(
        (
          await c.client
            .from("coach_applications")
            .update({ status: "accepted" })
            .eq("id", inbox[0].id)
        ).error,
      );
      await ca.answerApplication(inbox[0].id, true);
      const mine = (await cc.applications()).mine[0];
      assert.equal(mine.status, "accepted");
      assert.match(mine.code, /^[A-HJ-NP-Z2-9]{8}$/);
      assert.equal((await cc.inviteInfo(mine.code)).coach_name, "Coach A");
      assert.equal((await cc.page("coach-a")).applied, "accepted");
      await ca.savePage({ slug: "coach-a", name: "Coach A", open: false });
      const d = await person("apply-d");
      await assert.rejects(
        coachingApi(d.client, d.id).apply("coach-a", "Dee", ""),
        (e) => e.code === "closed",
      );
      await admin.auth.admin.deleteUser(c.id);
      await admin.auth.admin.deleteUser(d.id);
    },
  );
  await check(
    "a squad`s owner can offer a programme and pin a note; members read them and cannot change them",
    async () => {
      const mineA = await sa.mine();
      const sq = mineA[0];
      await sa.edit(sq.id, {
        programme: {
          n: "Six weeks to Christmas",
          days: [{ n: "A", items: [] }],
        },
        note: "Session one is Monday.",
      });
      await sb.join(sq.code, "Bee");
      const seen = (await sb.mine()).find((x) => x.id === sq.id);
      assert.equal(seen.programme.n, "Six weeks to Christmas");
      assert.equal(seen.note, "Session one is Monday.");
      await b.client
        .from("squads")
        .update({ note: "Changed by a member" })
        .eq("id", sq.id);
      assert.equal(
        (await sa.mine()).find((x) => x.id === sq.id).note,
        "Session one is Monday.",
      );
      await sb.leave(sq.id);
    },
  );
  await check(
    "either can end it; after that the coach sees nothing and nothing more can be set",
    async () => {
      await cb.end(linkId);
      assert.deepEqual(await ca.statuses(), {});
      assert.deepEqual(
        (await ca.links()).clients.filter((l) => l.id === linkId),
        [],
      );
      assert.equal((await cb.links()).coach, null);
      await assert.rejects(ca.assign(linkId, "t", { k: 1 }));
      const again = await ca.invite("Coach A", "Bee");
      await cb.accept(again.code, "Bee", { training: true });
      await ca.end(
        (await ca.links()).clients.find((l) => l.client_id === b.id).id,
      );
      assert.equal((await cb.links()).coach, null, "the coach can end it too");
    },
  );
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

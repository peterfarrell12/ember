// Supabase Edge Function entry point for `recipe`. The logic is in handler.js.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { createHandler, DAILY_USES } from "./handler.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

const handle = createHandler({
  fetch: (url: string, init?: RequestInit) => fetch(url, init),
  limit: DAILY_USES,
  async whoIs(token: string) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  // a recipe read shares the daily allowance that Claude calls count against
  async callsToday(userId: string, day: string) {
    const { data } = await admin
      .from("ai_usage")
      .select("calls")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle();
    return data ? data.calls : 0;
  },
  async record(userId: string, day: string) {
    const { error } = await admin.rpc("record_ai_usage", {
      p_user: userId,
      p_day: day,
      p_input: 0,
      p_output: 0,
      p_searches: 0,
      p_cost: 0,
    });
    if (error) throw error;
  },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return json(405, { error: { code: "bad_request", message: "POST only." } });
  const token = (req.headers.get("Authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  const body = await req.json().catch(() => null);
  const out = await handle({ token, body });
  return json(out.status, out.body);
});

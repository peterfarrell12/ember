// Supabase Edge Function entry point for `ai`. All the logic is in handler.js; this file connects it to
// the real things: the person's session, the usage table, and the Anthropic API.
//
// Secrets (Supabase dashboard, Edge Functions, Secrets): ANTHROPIC_API_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
import Anthropic from 'npm:@anthropic-ai/sdk@1.10.0';
import { createClient } from 'npm:@supabase/supabase-js@2.119.2';
import { createHandler } from './handler.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const claude = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  // the tests point this at a stand-in; unset, the SDK uses the real API
  baseURL: Deno.env.get('ANTHROPIC_BASE_URL') || undefined,
});

const handle = createHandler({
  claude,
  async whoIs(token: string) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  async spentToday(day: string) {
    const { data, error } = await admin.rpc('ai_spend_on', { p_day: day });
    if (error) throw error;
    return Number(data) || 0;
  },
  async record(userId: string, day: string, u: { input: number; output: number; searches: number; cost: number }) {
    const { error } = await admin.rpc('record_ai_usage', {
      p_user: userId,
      p_day: day,
      p_input: u.input,
      p_output: u.output,
      p_searches: u.searches,
      p_cost: u.cost,
    });
    if (error) throw error;
  },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: { code: 'bad_request', message: 'POST only.' } });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: 'bad_request', message: 'Expected JSON.' } });
  }
  if (!body || body.stream !== true) {
    const out = await handle({ token, body });
    return json(out.status, out.body);
  }
  // Streaming: server-sent events. Each event is one JSON object: {"text": "..."} as words arrive,
  // then {"done": true, "text": the whole reply} or {"error": {...}}.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: unknown) => ctrl.enqueue(enc.encode('data: ' + JSON.stringify(o) + '\n\n'));
      try {
        const out = await handle({ token, body, onText: (delta: string) => send({ text: delta }) });
        send(out.status === 200 ? { done: true, ...out.body } : out.body);
      } catch {
        send({ error: { code: 'upstream_error', message: 'Something went wrong.' } });
      }
      ctrl.close();
    },
  });
  return new Response(stream, {
    headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
});

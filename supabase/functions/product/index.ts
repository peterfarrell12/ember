// Supabase Edge Function entry point for `product`. The logic is in handler.js.
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

const handle = createHandler({
  fetch: (url: string, init?: RequestInit) => fetch(url, init),
  async whoIs(token: string) {
    const { data, error } = await admin.auth.getUser(token);
    return error || !data.user ? null : { id: data.user.id };
  },
  products: {
    async byBarcode(code: string) {
      const { data } = await admin
        .from('products')
        .select('*')
        .eq('key', 'ean:' + code)
        .maybeSingle();
      if (!data) return null;
      return {
        found: data.found,
        checked_at: data.checked_at,
        name: data.name,
        brand: data.brand,
        kcal: data.kcal,
        p: data.protein,
        c: data.carbs,
        f: data.fat,
        sf: data.saturates,
        su: data.sugars,
        fi: data.fibre,
        salt: data.salt,
        serving_g: data.serving_g,
        pack_g: data.pack_g,
      };
    },
    async put(p: any) {
      const { error } = await admin.from('products').upsert({
        key: 'ean:' + p.barcode,
        barcode: p.barcode,
        source: 'openfoodfacts',
        found: p.found,
        name: p.name || '',
        brand: p.brand || '',
        kcal: p.kcal ?? null,
        protein: p.p ?? null,
        carbs: p.c ?? null,
        fat: p.f ?? null,
        saturates: p.sf ?? null,
        sugars: p.su ?? null,
        fibre: p.fi ?? null,
        salt: p.salt ?? null,
        serving_g: p.serving_g ?? null,
        pack_g: p.pack_g ?? null,
        checked_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  },
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: { code: 'bad_request', message: 'POST only.' } });
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const body = await req.json().catch(() => null);
  const out = await handle({ token, body });
  return json(out.status, out.body);
});

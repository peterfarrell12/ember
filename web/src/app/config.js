// Where the app's backend lives. Both values are public by design: the publishable key only lets a
// browser reach the project, and what a signed-in person can then see is decided by the database's
// row-level security (supabase/migrations). The secret and service-role keys are never used here.
// A build can point somewhere else (the local Supabase used by the tests) with these two variables.
const env = import.meta.env || {};
export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'https://unltsodmqvtztqjyfvuq.supabase.co';
export const SUPABASE_KEY = env.VITE_SUPABASE_KEY ?? 'sb_publishable_tIqY0fAJyAtYyKGeTh8Ovw_X63bt4cg';

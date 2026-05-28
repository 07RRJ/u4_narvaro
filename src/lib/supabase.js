// src/lib/supabase.js
// Two separate clients:
//   supabase      — service role key, used for all data operations (bypasses RLS intentionally)
//   supabaseAuth  — anon key, used ONLY to verify user passwords via signInWithPassword
//
// Keeping them separate ensures that calling signInWithPassword never overwrites
// the service role context, which would cause RLS violations on data writes.

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error('[supabase] Missing SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Service role client — data operations only, never used for auth.signIn
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Anon client — used only to verify credentials in auth.routes.js
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

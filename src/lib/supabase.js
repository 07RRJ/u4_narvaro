// src/lib/supabase.js
// Uses the service role key — server-side only, never exposed to the browser.
// This bypasses RLS, which is intentional: RLS protects against direct
// database access; Express auth (sessions) protects the UI.

import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

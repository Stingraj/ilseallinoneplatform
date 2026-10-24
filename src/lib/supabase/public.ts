import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Cookie-less anonymous client for the public website. It can only read what the website_* / public_* views and RLS
 * allow anonymous visitors to read, so it can never expose private archive data even if a query is wrong.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

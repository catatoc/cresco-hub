import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

let _client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service-role key. Bypasses RLS and can
 * read Vault via SECURITY DEFINER RPCs (e.g. the error-tracking registry).
 *
 * NEVER import this from a client component or anything shipped to the browser.
 */
export function getSupabaseService(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      serverEnv.NEXT_PUBLIC_SUPABASE_URL,
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _client;
}

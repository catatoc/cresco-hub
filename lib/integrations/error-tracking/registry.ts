// Server-only: this module resolves decrypted secrets via getSupabaseService(),
// which imports 'server-only' — so importing this from client code fails the build.
import { z } from 'zod';
import { getSupabaseService } from '@/lib/supabase/service';
import { errorSourceSchema, type ErrorSource } from '@/schemas/integrations/source';

/**
 * Read all enabled error-tracking sources from the Supabase registry, each with
 * its provider API key resolved from Vault. Server-only (service role).
 *
 * Throws on RPC error so the cron can log and NOT advance the sync watermark.
 */
export async function getEnabledErrorSources(): Promise<ErrorSource[]> {
  const { data, error } = await getSupabaseService().rpc('get_enabled_error_sources');
  if (error) throw new Error(`registry: get_enabled_error_sources failed: ${error.message}`);
  return z.array(errorSourceSchema).parse(data ?? []);
}

/** Advance a source's delta watermark after a successful reconcile. */
export async function markErrorSourceSynced(sourceId: string): Promise<void> {
  const { error } = await getSupabaseService().rpc('mark_error_source_synced', {
    p_source_id: sourceId,
  });
  if (error) throw new Error(`registry: mark_error_source_synced failed: ${error.message}`);
}

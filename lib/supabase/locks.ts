import { getSupabaseService } from '@/lib/supabase/service';

/**
 * Run `fn` while holding a lease-based lock on a source row, or return null when
 * another run already holds it.
 *
 * Lease locks (a `locked_until` column, advanced atomically) are used instead of
 * Postgres advisory locks because Supabase's transaction pooler does not keep
 * session-level advisory locks across separate RPC calls. The lease also expires
 * on its own, so a crashed run never holds the lock forever.
 */
export async function withSourceLock<T>(
  sourceId: string,
  leaseSeconds: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const supabase = getSupabaseService();

  const acquired = await supabase.rpc('acquire_source_lock', {
    p_source_id: sourceId,
    p_lease_seconds: leaseSeconds,
  });
  if (acquired.error) throw new Error(`locks: acquire failed: ${acquired.error.message}`);
  if (acquired.data !== true) return null;

  try {
    return await fn();
  } finally {
    const released = await supabase.rpc('release_source_lock', { p_source_id: sourceId });
    if (released.error) {
      // Best-effort: a failed release leaves the lease set, but it AUTO-EXPIRES after
      // leaseSeconds (well before the next cron tick), so the lock self-heals.
      console.error(`[locks] release failed for ${sourceId}: ${released.error.message}`);
    }
  }
}

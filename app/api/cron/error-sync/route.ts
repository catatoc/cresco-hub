import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';
import { getEnabledErrorSources } from '@/lib/integrations/error-tracking/registry';
import { reconcileSource } from '@/lib/integrations/error-tracking/reconcile';
import { createAdapter } from '@/lib/integrations/error-tracking/adapters';
import { withSourceLock } from '@/lib/supabase/locks';
import { createRateLimiter } from '@/lib/integrations/error-tracking/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LOCK_LEASE_SECONDS = 360; // > maxDuration so a slow run never expires its own lease
const NOTION_MIN_INTERVAL_MS = 350; // ~3 req/s, shared across every source

/** Constant-time bearer comparison to avoid leaking the secret via timing. */
function tokenMatches(token: string | null, secret: string): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Error-sync cron entrypoint. Triggered by Supabase Cron (pg_cron + pg_net) with
 * `Authorization: Bearer <CRON_SECRET>`. Reconciles every enabled source under a
 * per-source lease lock, isolating failures so one bad source can't stop the rest.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = serverEnv.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!secret || !tokenMatches(token, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sources = await getEnabledErrorSources();
  // One limiter shared across all sources — there is a single Notion workspace.
  const limiter = createRateLimiter({ minIntervalMs: NOTION_MIN_INTERVAL_MS });

  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const outcome = await withSourceLock(source.id, LOCK_LEASE_SECONDS, () =>
          reconcileSource({ source, adapter: createAdapter(source), limiter }),
        );
        return outcome ?? { sourceId: source.id, skipped: 'locked' as const };
      } catch (e) {
        console.error(`[error-sync] source ${source.id}:`, e instanceof Error ? e.message : e);
        return { sourceId: source.id, error: e instanceof Error ? e.message : 'failed' };
      }
    }),
  );

  return NextResponse.json({ sources: results.length, results });
}

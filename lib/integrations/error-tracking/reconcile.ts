import type { ProviderAdapter, IssueContext } from '@/lib/integrations/error-tracking/types';
import { externalKey } from '@/lib/integrations/error-tracking/types';
import type { ErrorSource } from '@/schemas/integrations/source';
import { decideExisting, decideNew, parseSnapshot } from '@/lib/integrations/error-tracking/status-map';
import {
  listBugTasks,
  createBugTask,
  updateBugMirror,
  setBugInternalStatus,
  setBugSnapshot,
  appendReopenNote,
  type BugTaskTarget,
} from '@/lib/integrations/error-tracking/notion-bugs';
import { markErrorSourceSynced } from '@/lib/integrations/error-tracking/registry';
import type { RateLimiter } from '@/lib/integrations/error-tracking/rate-limit';

export interface ReconcileResult {
  sourceId: string;
  issues: number;
  created: number;
  updated: number;
  reopened: number;
  closedInNotion: number;
  closedInProvider: number;
  skippedNoise: number;
  errors: number;
}

/**
 * Reconcile one error-tracking source against Notion (bidirectional, idempotent).
 *
 * Full sweep (not delta): the provider issue volume per project is small. The
 * `last_synced_at` watermark is observational in v1 — the sweep always processes
 * everything, so a persistently-failing issue never blocks the others, and "not
 * advancing on error" is harmless (no retry storm).
 *
 * Assumptions / known limits (revisit in hardening):
 * - The provider's `listIssues(null)` returns every issue we care about within its
 *   window (PostHog: ~90d). A Notion task whose issue falls outside that window is
 *   not re-evaluated, so a human-close of a very old bug may not reach the provider.
 * - The rate limiter protects the single shared Notion workspace. Adapters own their
 *   own provider rate limiting / retries (provider call volume is tiny).
 * - Per-source isolation is the caller's job: a failure in listIssues/listBugTasks
 *   throws to the cron route, which wraps each source so one bad source cannot stop
 *   the rest. Per-issue failures are caught here and counted.
 */
export async function reconcileSource(args: {
  source: ErrorSource;
  adapter: ProviderAdapter;
  limiter: RateLimiter;
}): Promise<ReconcileResult> {
  const { source, adapter, limiter } = args;
  const result: ReconcileResult = {
    sourceId: source.id,
    issues: 0,
    created: 0,
    updated: 0,
    reopened: 0,
    closedInNotion: 0,
    closedInProvider: 0,
    skippedNoise: 0,
    errors: 0,
  };

  const issues = await adapter.listIssues(null);
  result.issues = issues.length;

  const prefix = `${source.provider}:${source.externalProjectId}:`;
  const existing = await listBugTasks(prefix);
  const byKey = new Map(existing.map((b) => [b.externalKey, b]));

  const target: BugTaskTarget = {
    notionProviderId: source.notionProviderId,
    notionCustomerId: source.notionCustomerId,
    notionProjectId: source.notionProjectId,
  };

  for (const issue of issues) {
    const key = externalKey({
      provider: issue.provider,
      externalProjectId: issue.externalProjectId,
      externalId: issue.externalId,
    });
    const task = byKey.get(key);

    try {
      if (!task) {
        // Noise filter applies only to NEW issues — never hide an existing task.
        if (issue.occurrences < source.minOccurrences) {
          result.skippedNoise++;
          continue;
        }
        const decision = decideNew(issue.status);
        let context: IssueContext | null = null;
        try {
          context = (await adapter.getIssueContext?.(issue.externalId)) ?? null;
        } catch {
          // context is best-effort — never block a create on it
        }
        await limiter.run(() =>
          createBugTask({
            externalKey: key,
            issue,
            target,
            internalStatus: decision.internalStatus,
            lastSyncedStatus: decision.snapshot,
            context,
          }),
        );
        result.created++;
        continue;
      }

      // Existing task: refresh the read-only mirror ONLY when it changed. Count +
      // status are exact-comparable and a count bump always implies new activity
      // (and a newer lastSeen), so this avoids write-amplification against Notion's
      // rate limit on large boards.
      const mirrorChanged =
        task.externalStatus !== issue.status || task.externalCount !== issue.occurrences;
      if (mirrorChanged) {
        await limiter.run(() => updateBugMirror(task.id, issue));
      }

      const decision = decideExisting({
        external: issue.status,
        notionStatus: task.status,
        snapshot: parseSnapshot(task.lastSyncedStatus),
      });

      if (decision.kind === 'noop') {
        if (task.lastSyncedStatus !== decision.snapshot) {
          await limiter.run(() => setBugSnapshot(task.id, decision.snapshot));
        }
        result.updated++;
      } else if (decision.kind === 'set-notion-status') {
        await limiter.run(() => setBugInternalStatus(task.id, decision.status, decision.snapshot));
        if (decision.reopened) {
          await limiter.run(() => appendReopenNote(task.id, issue));
          result.reopened++;
        } else {
          result.closedInNotion++;
        }
      } else {
        // close-provider: reflect a Notion-side close back into the provider.
        // Order matters — resolve FIRST, then snapshot: resolveIssue is idempotent
        // (resolving an already-resolved issue is a no-op), and if the snapshot write
        // fails, the next sweep sees both sides closed → the noop branch self-heals
        // the snapshot WITHOUT re-resolving. Reversing the order would risk reopening
        // a human-closed task if the provider call then failed.
        await adapter.resolveIssue(issue.externalId, decision.providerStatus);
        await limiter.run(() => setBugSnapshot(task.id, decision.snapshot));
        result.closedInProvider++;
      }
    } catch (e) {
      result.errors++;
      console.error(`[reconcile] ${key}:`, e instanceof Error ? e.message : e);
    }
  }

  // Only advance the watermark on a clean run, so a partial failure retries next time.
  if (result.errors === 0) {
    await markErrorSourceSynced(source.id);
  }
  return result;
}

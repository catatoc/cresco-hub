import type { NormalizedIssue } from '@/schemas/integrations/error-issue';
import type { Provider } from '@/schemas/integrations/source';

/** Best-effort "where did this come from" context, pulled from one sample event. */
export interface IssueContext {
  currentUrl: string | null;
  browser: string | null; // "Chrome iOS 148"
  os: string | null; // "iOS 26.0.0"
  handled: boolean | null; // false = uncaught
  topFrame: string | null; // "fn @ file:line"
  environments: string[]; // all environments the issue appears in (from event URL hosts)
  replayUrl: string | null; // session replay
}

/**
 * One implementation per error-tracking provider (PostHog, Sentry…). Instantiated
 * per source with that source's credentials. The reconcile engine only ever talks
 * to this interface, so adding a provider never touches the engine.
 */
export interface ProviderAdapter {
  readonly provider: Provider;
  /** Issues changed since `since` (or all when null), already normalized. */
  listIssues(since: Date | null): Promise<NormalizedIssue[]>;
  /**
   * Reflect a Notion-side close back into the provider. Status mapping is
   * Notion → provider: Done → 'resolved', Archived → 'suppressed'.
   */
  resolveIssue(externalId: string, status: 'resolved' | 'suppressed'): Promise<void>;

  /** Optional: a sample event's context (URL, env, top frame, replay) for the body. */
  getIssueContext?(externalId: string): Promise<IssueContext | null>;
}

/**
 * Stable dedupe key stored in the Notion `External Key` property. Namespaced by
 * provider + project so issue ids never collide across clients.
 */
export function externalKey(issue: {
  provider: Provider;
  externalProjectId: string;
  externalId: string;
}): string {
  return `${issue.provider}:${issue.externalProjectId}:${issue.externalId}`;
}

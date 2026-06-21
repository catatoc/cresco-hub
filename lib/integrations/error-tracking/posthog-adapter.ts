import {
  normalizedIssueSchema,
  externalStatusSchema,
  type NormalizedIssue,
} from '@/schemas/integrations/error-issue';
import type { ProviderAdapter, IssueContext } from '@/lib/integrations/error-tracking/types';

export interface PostHogAdapterConfig {
  /** e.g. https://us.posthog.com */
  host: string;
  /** PostHog project id, e.g. 94699 */
  projectId: string;
  /** Personal API key with scopes: query:read, error_tracking:read, error_tracking:write */
  apiKey: string;
  /** Exclude PostHog's internal/test accounts from the issue list. */
  filterTestAccounts: boolean;
}

/** One row of the ErrorTrackingQuery response (only the fields we map). */
interface PostHogIssueRow {
  id: string;
  name: string | null;
  description: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
  library: string | null;
  source: string | null;
  aggregations: { occurrences?: number; users?: number; sessions?: number } | null;
}

/**
 * PostHog error-tracking adapter. Lists issues via the query API (`ErrorTrackingQuery`)
 * and resolves them via the error_tracking REST endpoint.
 *
 * Note: `volumeResolution` MUST be >= 1 — sending 0 makes the query engine divide by
 * zero. Counts (`occurrences`, `users`) come back as floats, so they are rounded.
 */
export class PostHogAdapter implements ProviderAdapter {
  readonly provider = 'posthog' as const;

  constructor(private readonly config: PostHogAdapterConfig) {}

  async listIssues(since: Date | null): Promise<NormalizedIssue[]> {
    const res = (await this.fetchJson(`/api/projects/${this.config.projectId}/query/`, {
      method: 'POST',
      body: JSON.stringify({
        // A sync must see current issue status, not a stale cached result, so
        // recompute fresh each run — cheap at error-tracking volume. (Status writes
        // still take a few seconds to propagate to this query; a miss is corrected by
        // the next sweep — the reconcile is eventually consistent.)
        refresh: 'force_blocking',
        query: {
          kind: 'ErrorTrackingQuery',
          status: 'all',
          orderBy: 'last_seen',
          orderDirection: 'DESC',
          dateRange: { date_from: since ? since.toISOString() : '-90d' },
          limit: 200,
          offset: 0,
          volumeResolution: 1,
          filterTestAccounts: this.config.filterTestAccounts,
        },
      }),
    })) as { results?: PostHogIssueRow[] } | null;

    return (res?.results ?? []).map((row) => this.normalize(row));
  }

  async resolveIssue(externalId: string, status: 'resolved' | 'suppressed'): Promise<void> {
    await this.fetchJson(
      `/api/projects/${this.config.projectId}/error_tracking/issues/${externalId}/`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
    );
  }

  /** Pull "where did this come from" context from the most recent sample event. */
  async getIssueContext(externalId: string): Promise<IssueContext | null> {
    const sql =
      'SELECT properties.$current_url, properties.$browser, properties.$browser_version, ' +
      'properties.$os, properties.$os_version, properties.$session_id, properties.$exception_list ' +
      "FROM events WHERE event = '$exception' AND properties.$exception_issue_id = {issueId} " +
      'ORDER BY timestamp DESC LIMIT 20';

    const res = (await this.fetchJson(`/api/projects/${this.config.projectId}/query/`, {
      method: 'POST',
      body: JSON.stringify({
        refresh: 'force_blocking',
        // `values` is PostHog's server-side HogQL parameter binding (not string
        // concat), so the issue id is safely bound — no injection via {issueId}.
        query: { kind: 'HogQLQuery', query: sql, values: { issueId: externalId } },
      }),
    })) as { results?: unknown[][] } | null;

    const rows = res?.results ?? [];
    const row = rows[0];
    if (!row) return null;
    const [url, browser, browserV, os, osV, sessionId, exList] = row as [
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      string | null,
      unknown,
    ];

    const join = (parts: Array<string | null>) => parts.filter(Boolean).join(' ').trim() || null;
    const { handled, topFrame } = parseExceptionList(exList);

    // Distinct environments across the sampled events — a bug can span dev + prod.
    const environments = [
      ...new Set(
        rows
          .map((r) => deriveEnvironment(((r as unknown[])[0] as string | null) ?? null))
          .filter((e): e is string => e !== null),
      ),
    ].sort();

    return {
      currentUrl: url || null,
      browser: join([browser, browserV]),
      os: join([os, osV]),
      handled,
      topFrame,
      environments,
      replayUrl: sessionId
        ? `${this.config.host}/project/${this.config.projectId}/replay/${sessionId}`
        : null,
    };
  }

  private normalize(row: PostHogIssueRow): NormalizedIssue {
    const agg = row.aggregations ?? {};
    return normalizedIssueSchema.parse({
      externalId: row.id,
      provider: 'posthog',
      externalProjectId: this.config.projectId,
      name: row.name ?? 'Error',
      description: row.description ?? '',
      status: externalStatusSchema.catch('active').parse(row.status),
      occurrences: Math.round(agg.occurrences ?? 0),
      users: Math.round(agg.users ?? 0),
      sessions: Math.round(agg.sessions ?? 0),
      library: row.library ?? null,
      sourceFile: row.source ?? null,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      url: `${this.config.host}/project/${this.config.projectId}/error_tracking/${row.id}`,
    });
  }

  private async fetchJson(path: string, init: RequestInit): Promise<unknown> {
    const res = await fetch(`${this.config.host}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `posthog ${init.method ?? 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`,
      );
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
}

/** Infer the environment from the page host: localhost/dev/staging → non-prod, else production. */
function deriveEnvironment(url: string | null): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return 'dev';
  if (host.includes('staging')) return 'staging';
  if (host.startsWith('dev.') || host.includes('.ngrok.')) return 'dev';
  return 'production';
}

/** Extract handled-ness + the top (preferably in-app) stack frame from $exception_list. */
function parseExceptionList(raw: unknown): { handled: boolean | null; topFrame: string | null } {
  let list: unknown;
  try {
    list = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { handled: null, topFrame: null };
  }
  const first = (Array.isArray(list) ? list[0] : null) as {
    mechanism?: { handled?: boolean };
    stacktrace?: { frames?: Array<Record<string, unknown>> };
  } | null;
  if (!first) return { handled: null, topFrame: null };

  const handled = typeof first.mechanism?.handled === 'boolean' ? first.mechanism.handled : null;

  const frames = first.stacktrace?.frames ?? [];
  const frame = frames.find((f) => f.in_app === true) ?? frames[frames.length - 1];
  let topFrame: string | null = null;
  if (frame) {
    const fn = String(frame.resolved_name ?? frame.function ?? frame.mangled_name ?? '?');
    const file = String(frame.source ?? frame.filename ?? '');
    const line = (frame.line ?? frame.lineno) as number | undefined;
    topFrame = `${fn}${file ? ` @ ${file}` : ''}${line ? `:${line}` : ''}`.slice(0, 300);
  }
  return { handled, topFrame };
}

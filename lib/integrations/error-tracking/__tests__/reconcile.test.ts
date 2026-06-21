import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/integrations/error-tracking/notion-bugs', () => ({
  listBugTasks: vi.fn(),
  createBugTask: vi.fn(async () => ({ id: 'new-1', url: 'u' })),
  updateBugMirror: vi.fn(async () => undefined),
  setBugInternalStatus: vi.fn(async () => undefined),
  setBugSnapshot: vi.fn(async () => undefined),
  appendReopenNote: vi.fn(async () => undefined),
}));
vi.mock('@/lib/integrations/error-tracking/registry', () => ({
  markErrorSourceSynced: vi.fn(async () => undefined),
}));

import * as bugs from '@/lib/integrations/error-tracking/notion-bugs';
import type { BugTaskRow } from '@/lib/integrations/error-tracking/notion-bugs';
import { markErrorSourceSynced } from '@/lib/integrations/error-tracking/registry';
import { reconcileSource } from '../reconcile';
import type { NormalizedIssue } from '@/schemas/integrations/error-issue';
import type { ErrorSource } from '@/schemas/integrations/source';
import type { IssueContext } from '../types';
import type { RateLimiter } from '../rate-limit';

const limiter: RateLimiter = { run: <T>(fn: () => Promise<T>): Promise<T> => fn() };

const SOURCE: ErrorSource = {
  id: 'src1',
  provider: 'posthog',
  host: 'https://us.posthog.com',
  apiKey: 'phx_x',
  externalProjectId: '94699',
  notionProjectId: null,
  notionCustomerId: 'cust-amedi',
  notionProviderId: 'prov-ph',
  minOccurrences: 3,
  filterTestAccounts: true,
  lastSyncedAt: null,
};

function issue(over: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    externalId: 'abc',
    provider: 'posthog',
    externalProjectId: '94699',
    name: 'Error',
    description: 'boom',
    status: 'active',
    occurrences: 10,
    users: 1,
    sessions: 1,
    library: 'web',
    sourceFile: null,
    firstSeen: '2026-06-01T00:00:00Z',
    lastSeen: '2026-06-02T00:00:00Z',
    url: 'https://us.posthog.com/project/94699/error_tracking/abc',
    ...over,
  };
}

function bugRow(over: Partial<BugTaskRow> = {}): BugTaskRow {
  return {
    id: 'task-1',
    externalKey: 'posthog:94699:abc',
    status: 'In Progress',
    lastSyncedStatus: 'open',
    externalStatus: 'active',
    externalCount: 10,
    externalLastSeen: '2026-06-02T00:00:00Z',
    ...over,
  };
}

function adapterWith(issues: NormalizedIssue[], context: IssueContext | null = null) {
  return {
    provider: 'posthog' as const,
    listIssues: vi.fn(async () => issues),
    resolveIssue: vi.fn(async () => undefined),
    getIssueContext: vi.fn(async () => context),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('reconcileSource', () => {
  it('creates a Bug task for a new issue above the noise threshold', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([]);
    const adapter = adapterWith([issue({ occurrences: 10 })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(vi.mocked(bugs.createBugTask).mock.calls[0]![0].externalKey).toBe('posthog:94699:abc');
    expect(res.created).toBe(1);
    expect(markErrorSourceSynced).toHaveBeenCalledWith('src1');
  });

  it('fetches issue context and passes it to createBugTask', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([]);
    const ctx: IssueContext = {
      currentUrl: 'https://app/login',
      browser: 'Chrome 147',
      os: 'Mac OS X',
      handled: false,
      topFrame: 'fn @ a.ts:1',
      environments: ['dev'],
      replayUrl: 'https://ph/replay/s1',
    };
    const adapter = adapterWith([issue({ occurrences: 10 })], ctx);
    await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(adapter.getIssueContext).toHaveBeenCalledWith('abc');
    expect(vi.mocked(bugs.createBugTask).mock.calls[0]![0].context).toEqual(ctx);
  });

  it('skips a NEW issue below the noise threshold', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([]);
    const adapter = adapterWith([issue({ occurrences: 2 })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(bugs.createBugTask).not.toHaveBeenCalled();
    expect(res.skippedNoise).toBe(1);
  });

  it('still processes an EXISTING task even if below the noise threshold', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([bugRow({ externalCount: 1 })]);
    const adapter = adapterWith([issue({ occurrences: 1 })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(bugs.createBugTask).not.toHaveBeenCalled();
    expect(res.skippedNoise).toBe(0);
    expect(res.updated).toBe(1);
  });

  it('skips the mirror write when count and status are unchanged', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([
      bugRow({ status: 'In Progress', externalStatus: 'active', externalCount: 10, lastSyncedStatus: 'open' }),
    ]);
    const adapter = adapterWith([issue({ status: 'active', occurrences: 10 })]);
    await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(bugs.updateBugMirror).not.toHaveBeenCalled();
    expect(bugs.setBugSnapshot).not.toHaveBeenCalled();
  });

  it('refreshes the mirror when the count changed', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([bugRow({ externalCount: 5 })]);
    const adapter = adapterWith([issue({ status: 'active', occurrences: 11 })]);
    await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(bugs.updateBugMirror).toHaveBeenCalledWith('task-1', expect.objectContaining({ occurrences: 11 }));
  });

  it('closes the Notion task when the provider resolved it', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([
      bugRow({ status: 'In Progress', lastSyncedStatus: 'open', externalStatus: 'active' }),
    ]);
    const adapter = adapterWith([issue({ status: 'resolved' })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(bugs.setBugInternalStatus).toHaveBeenCalledWith('task-1', 'Done', 'closed');
    expect(res.closedInNotion).toBe(1);
  });

  it('reopens the Notion task when the bug recurred', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([
      bugRow({ status: 'Done', lastSyncedStatus: 'closed', externalStatus: 'resolved' }),
    ]);
    const adapter = adapterWith([issue({ status: 'active' })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(bugs.setBugInternalStatus).toHaveBeenCalledWith('task-1', 'Not Started', 'open');
    expect(bugs.appendReopenNote).toHaveBeenCalledWith('task-1', expect.objectContaining({ externalId: 'abc' }));
    expect(res.reopened).toBe(1);
  });

  it('resolves the provider when a human closed the Notion task', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([
      bugRow({ status: 'Done', lastSyncedStatus: 'open', externalStatus: 'resolved' }),
    ]);
    const adapter = adapterWith([issue({ status: 'active' })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(adapter.resolveIssue).toHaveBeenCalledWith('abc', 'resolved');
    expect(bugs.setBugSnapshot).toHaveBeenCalledWith('task-1', 'closed');
    expect(res.closedInProvider).toBe(1);
  });

  it('does not advance the watermark when a write fails', async () => {
    vi.mocked(bugs.listBugTasks).mockResolvedValueOnce([]);
    vi.mocked(bugs.createBugTask).mockRejectedValueOnce(new Error('notion 500'));
    const adapter = adapterWith([issue({ occurrences: 10 })]);
    const res = await reconcileSource({ source: SOURCE, adapter, limiter });

    expect(res.errors).toBe(1);
    expect(res.created).toBe(0);
    expect(markErrorSourceSynced).not.toHaveBeenCalled();
  });
});

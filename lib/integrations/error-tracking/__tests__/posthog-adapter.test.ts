import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostHogAdapter } from '../posthog-adapter';

// Real ErrorTrackingQuery row (Amedi project 94699), counts as floats.
const ISSUE = {
  id: '019e714d-c2a6-7bd2-9f85-7c3272093241',
  name: 'DOMException',
  description: 'AbortError: Lock was stolen by another request',
  status: 'active',
  first_seen: '2026-05-28T21:16:19.251000-04:00',
  last_seen: '2026-06-04T10:33:43.066000-04:00',
  library: 'web',
  source: null,
  assignee: null,
  aggregations: { occurrences: 69.0, sessions: 2.0, users: 1.0 },
};

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })) as unknown as typeof fetch;
}

const adapter = new PostHogAdapter({
  host: 'https://us.posthog.com',
  projectId: '94699',
  apiKey: 'phx_test',
  filterTestAccounts: true,
});

describe('PostHogAdapter.listIssues', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('maps the real query API response to NormalizedIssue', async () => {
    global.fetch = mockFetch(200, { results: [ISSUE] });
    const issues = await adapter.listIssues(null);
    expect(issues).toEqual([
      {
        externalId: '019e714d-c2a6-7bd2-9f85-7c3272093241',
        provider: 'posthog',
        externalProjectId: '94699',
        name: 'DOMException',
        description: 'AbortError: Lock was stolen by another request',
        status: 'active',
        occurrences: 69,
        users: 1,
        sessions: 2,
        library: 'web',
        sourceFile: null,
        firstSeen: '2026-05-28T21:16:19.251000-04:00',
        lastSeen: '2026-06-04T10:33:43.066000-04:00',
        url: 'https://us.posthog.com/project/94699/error_tracking/019e714d-c2a6-7bd2-9f85-7c3272093241',
      },
    ]);
  });

  it('sends volumeResolution: 1, the since date, and a Bearer token', async () => {
    const f = mockFetch(200, { results: [] });
    global.fetch = f;
    await adapter.listIssues(new Date('2026-06-01T00:00:00Z'));
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(url).toBe('https://us.posthog.com/api/projects/94699/query/');
    const sent = JSON.parse(init.body as string);
    expect(sent.refresh).toBe('force_blocking');
    expect(sent.query.kind).toBe('ErrorTrackingQuery');
    expect(sent.query.volumeResolution).toBe(1);
    expect(sent.query.filterTestAccounts).toBe(true);
    expect(sent.query.dateRange.date_from).toBe('2026-06-01T00:00:00.000Z');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer phx_test');
  });

  it('defaults an unknown provider status to active', async () => {
    global.fetch = mockFetch(200, { results: [{ ...ISSUE, status: 'weird_new_status' }] });
    const issues = await adapter.listIssues(null);
    expect(issues[0]!.status).toBe('active');
  });

  it('throws on a non-2xx response', async () => {
    global.fetch = mockFetch(403, { detail: 'nope' });
    await expect(adapter.listIssues(null)).rejects.toThrow(/403/);
  });
});

describe('PostHogAdapter.resolveIssue', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('PATCHes the error_tracking issue status', async () => {
    const f = mockFetch(200, '');
    global.fetch = f;
    await adapter.resolveIssue('issue-1', 'resolved');
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
    expect(url).toBe('https://us.posthog.com/api/projects/94699/error_tracking/issues/issue-1/');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ status: 'resolved' });
  });
});

describe('PostHogAdapter.getIssueContext', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('extracts url, env, handled, top in-app frame and replay link', async () => {
    const exList = JSON.stringify([
      {
        mechanism: { handled: false },
        stacktrace: {
          frames: [
            { in_app: false, function: 'vendor' },
            { in_app: true, resolved_name: 'doLogin', source: 'app/login.ts', line: 42 },
          ],
        },
      },
    ]);
    global.fetch = mockFetch(200, {
      results: [
        ['https://app/login', 'Chrome', '147', 'Mac OS X', '10.15.7', 'sess-1', exList],
        ['http://localhost:4000/x', 'Chrome', '147', 'Mac', '1', 'sess-2', null],
      ],
    });
    expect(await adapter.getIssueContext('issue-1')).toEqual({
      currentUrl: 'https://app/login',
      browser: 'Chrome 147',
      os: 'Mac OS X 10.15.7',
      handled: false,
      topFrame: 'doLogin @ app/login.ts:42',
      environments: ['dev', 'production'],
      replayUrl: 'https://us.posthog.com/project/94699/replay/sess-1',
    });
  });

  it('returns null when there are no sample events', async () => {
    global.fetch = mockFetch(200, { results: [] });
    expect(await adapter.getIssueContext('issue-1')).toBeNull();
  });

  it('is robust to a malformed exception_list (no throw)', async () => {
    global.fetch = mockFetch(200, {
      results: [['https://x', 'Chrome', '1', 'iOS', '1', null, 'not-json']],
    });
    const ctx = await adapter.getIssueContext('i');
    expect(ctx).toMatchObject({ handled: null, topFrame: null, replayUrl: null });
  });

  it('handles an exception_list with no frames', async () => {
    const exList = JSON.stringify([{ mechanism: { handled: true }, stacktrace: { frames: [] } }]);
    global.fetch = mockFetch(200, { results: [['https://x', null, null, null, null, null, exList]] });
    const ctx = await adapter.getIssueContext('i');
    expect(ctx).toMatchObject({ handled: true, topFrame: null });
  });
});

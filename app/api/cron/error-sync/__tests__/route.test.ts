import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({ serverEnv: { CRON_SECRET: 'secret-x' } }));
vi.mock('@/lib/integrations/error-tracking/registry', () => ({ getEnabledErrorSources: vi.fn() }));
vi.mock('@/lib/integrations/error-tracking/reconcile', () => ({ reconcileSource: vi.fn() }));
vi.mock('@/lib/supabase/locks', () => ({ withSourceLock: vi.fn() }));
vi.mock('@/lib/integrations/error-tracking/adapters', () => ({
  createAdapter: vi.fn(() => ({ provider: 'posthog' })),
}));

import { getEnabledErrorSources } from '@/lib/integrations/error-tracking/registry';
import { reconcileSource } from '@/lib/integrations/error-tracking/reconcile';
import { withSourceLock } from '@/lib/supabase/locks';
import { GET } from '../route';

function req(token?: string) {
  return new Request('http://localhost/api/cron/error-sync', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const SRC = (id: string) =>
  ({
    id,
    provider: 'posthog',
    host: 'h',
    apiKey: 'k',
    externalProjectId: 'p',
    notionProjectId: null,
    notionCustomerId: null,
    notionProviderId: null,
    minOccurrences: 3,
    filterTestAccounts: true,
    lastSyncedAt: null,
  }) as never;

beforeEach(() => vi.clearAllMocks());

describe('GET /api/cron/error-sync', () => {
  it('returns 401 without the right bearer token', async () => {
    const res = await GET(req('wrong'));
    expect(res.status).toBe(401);
    expect(getEnabledErrorSources).not.toHaveBeenCalled();
  });

  it('reconciles each enabled source under a lock', async () => {
    vi.mocked(getEnabledErrorSources).mockResolvedValueOnce([SRC('a'), SRC('b')]);
    vi.mocked(withSourceLock).mockImplementation((_id, _lease, fn) => fn() as never);
    vi.mocked(reconcileSource).mockResolvedValue({ sourceId: 'x', created: 1 } as never);

    const res = await GET(req('secret-x'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sources).toBe(2);
    expect(reconcileSource).toHaveBeenCalledTimes(2);
  });

  it('marks a source as skipped when the lock is held', async () => {
    vi.mocked(getEnabledErrorSources).mockResolvedValueOnce([SRC('a')]);
    vi.mocked(withSourceLock).mockResolvedValueOnce(null);

    const body = await (await GET(req('secret-x'))).json();
    expect(body.results[0].skipped).toBe('locked');
    expect(reconcileSource).not.toHaveBeenCalled();
  });

  it('isolates a per-source failure (others still run)', async () => {
    vi.mocked(getEnabledErrorSources).mockResolvedValueOnce([SRC('a'), SRC('b')]);
    vi.mocked(withSourceLock)
      .mockImplementationOnce(async () => {
        throw new Error('source a down');
      })
      .mockImplementationOnce((_id, _lease, fn) => fn() as never);
    vi.mocked(reconcileSource).mockResolvedValue({ sourceId: 'b' } as never);

    const res = await GET(req('secret-x'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0].error).toMatch(/source a down/);
    expect(body.results[1].sourceId).toBe('b');
  });
});

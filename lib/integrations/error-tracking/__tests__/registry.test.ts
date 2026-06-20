import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/service', () => ({ getSupabaseService: () => mockSupabase }));

const mockSupabase = { rpc: vi.fn() };

import { getEnabledErrorSources, markErrorSourceSynced } from '../registry';

const ROW = {
  source_id: '11111111-1111-1111-1111-111111111111',
  provider: 'posthog',
  host: 'https://us.posthog.com',
  api_key: 'phx_secret',
  external_project_id: '94699',
  notion_project_id: 'proj-1',
  notion_customer_id: null,
  notion_provider_id: '5df37376-a170-4e62-a29d-032971b39ff7',
  min_occurrences: 3,
  last_synced_at: null,
};

describe('getEnabledErrorSources', () => {
  beforeEach(() => mockSupabase.rpc.mockReset());

  it('calls the resolver RPC and parses rows into camelCase', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: [ROW], error: null });
    const sources = await getEnabledErrorSources();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_enabled_error_sources');
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      provider: 'posthog',
      apiKey: 'phx_secret',
      externalProjectId: '94699',
      notionProviderId: '5df37376-a170-4e62-a29d-032971b39ff7',
      minOccurrences: 3,
    });
  });

  it('returns [] when the registry is empty', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await getEnabledErrorSources()).toEqual([]);
  });

  it('throws on RPC error (so the cron does not advance the watermark)', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(getEnabledErrorSources()).rejects.toThrow(/boom/);
  });
});

describe('markErrorSourceSynced', () => {
  beforeEach(() => mockSupabase.rpc.mockReset());

  it('calls the watermark RPC with the source id', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ error: null });
    await markErrorSourceSynced('src-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_error_source_synced', {
      p_source_id: 'src-1',
    });
  });

  it('throws on RPC error', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ error: { message: 'nope' } });
    await expect(markErrorSourceSynced('src-1')).rejects.toThrow(/nope/);
  });
});

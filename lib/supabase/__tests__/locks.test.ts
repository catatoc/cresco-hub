import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/service', () => ({ getSupabaseService: () => mockSupabase }));

const mockSupabase = { rpc: vi.fn() };

import { withSourceLock } from '../locks';

beforeEach(() => mockSupabase.rpc.mockReset());

describe('withSourceLock', () => {
  it('runs fn and releases when the lock is acquired', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null }); // acquire
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null }); // release
    const fn = vi.fn(async () => 'done');

    const out = await withSourceLock('src1', 300, fn);

    expect(out).toBe('done');
    expect(fn).toHaveBeenCalled();
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'acquire_source_lock', {
      p_source_id: 'src1',
      p_lease_seconds: 300,
    });
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'release_source_lock', { p_source_id: 'src1' });
  });

  it('returns null and does NOT run fn when the lock is held', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null });
    const fn = vi.fn();

    const out = await withSourceLock('src1', 300, fn);

    expect(out).toBeNull();
    expect(fn).not.toHaveBeenCalled();
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1); // no release without acquire
  });

  it('releases even when fn throws', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      withSourceLock('src1', 300, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'release_source_lock', { p_source_id: 'src1' });
  });

  it('throws when acquire errors (and never runs fn)', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    const fn = vi.fn();
    await expect(withSourceLock('src1', 300, fn)).rejects.toThrow(/db down/);
    expect(fn).not.toHaveBeenCalled();
  });
});

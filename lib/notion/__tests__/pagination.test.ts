import { describe, it, expect, vi } from 'vitest';
import { queryAllPages } from '../pagination';

describe('queryAllPages', () => {
  it('returns single page when has_more=false', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      results: [1, 2, 3],
      has_more: false,
      next_cursor: null,
    });
    const out = await queryAllPages(fetchPage, { cap: 100 });
    expect(out.items).toEqual([1, 2, 3]);
    expect(out.truncated).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(undefined);
  });

  it('loops until has_more=false using next_cursor', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1, 2], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [3, 4], has_more: true, next_cursor: 'c2' })
      .mockResolvedValueOnce({ results: [5], has_more: false, next_cursor: null });
    const out = await queryAllPages(fetchPage, { cap: 100 });
    expect(out.items).toEqual([1, 2, 3, 4, 5]);
    expect(out.truncated).toBe(false);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 'c1');
    expect(fetchPage).toHaveBeenNthCalledWith(3, 'c2');
  });

  it('truncates exactly at cap and sets truncated=true', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1, 2, 3], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [4, 5, 6], has_more: true, next_cursor: 'c2' });
    const out = await queryAllPages(fetchPage, { cap: 5 });
    expect(out.items).toEqual([1, 2, 3, 4, 5]);
    expect(out.truncated).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('cap=Infinity loops without ever truncating', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: Array(100).fill(0), has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: Array(100).fill(0), has_more: false, next_cursor: null });
    const out = await queryAllPages(fetchPage, { cap: Infinity });
    expect(out.items).toHaveLength(200);
    expect(out.truncated).toBe(false);
  });

  it('propagates errors from underlying fetcher', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1], has_more: true, next_cursor: 'c1' })
      .mockRejectedValueOnce(new Error('boom'));
    await expect(queryAllPages(fetchPage, { cap: 100 })).rejects.toThrow('boom');
  });

  it('does not call fetcher again after has_more=false even if next_cursor is set', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      results: [1],
      has_more: false,
      next_cursor: 'c1',
    });
    const out = await queryAllPages(fetchPage, { cap: 100 });
    expect(out.items).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

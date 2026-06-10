import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  blocks: {
    children: {
      list: vi.fn(),
    },
  },
};

import { getBlocks } from '../blocks';

describe('getBlocks', () => {
  beforeEach(() => {
    mockNotion.blocks.children.list.mockReset();
  });

  it('returns the single page when has_more=false', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [{ id: 'b-1' }, { id: 'b-2' }],
      has_more: false,
      next_cursor: null,
    });

    const out = await getBlocks('task-id');

    expect(out).toEqual([{ id: 'b-1' }, { id: 'b-2' }]);
    expect(mockNotion.blocks.children.list).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.children.list).toHaveBeenCalledWith({
      block_id: 'task-id',
      page_size: 100,
    });
  });

  it('paginates when has_more=true (would otherwise truncate >100-block tasks)', async () => {
    mockNotion.blocks.children.list
      .mockResolvedValueOnce({
        results: [{ id: 'a-1' }, { id: 'a-2' }],
        has_more: true,
        next_cursor: 'cur-1',
      })
      .mockResolvedValueOnce({
        results: [{ id: 'b-1' }],
        has_more: false,
        next_cursor: null,
      });

    const out = await getBlocks('task-id');

    expect(out).toEqual([{ id: 'a-1' }, { id: 'a-2' }, { id: 'b-1' }]);
    expect(mockNotion.blocks.children.list).toHaveBeenCalledTimes(2);
    expect(mockNotion.blocks.children.list).toHaveBeenNthCalledWith(2, {
      block_id: 'task-id',
      page_size: 100,
      start_cursor: 'cur-1',
    });
  });
});

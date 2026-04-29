// lib/notion/__tests__/tasks-blocks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  blocks: {
    children: {
      list: vi.fn(),
      append: vi.fn(),
    },
    delete: vi.fn(),
  },
  pages: {
    retrieve: vi.fn(),
  },
};

import { replaceTaskBlocks } from '../tasks-blocks';

describe('replaceTaskBlocks', () => {
  beforeEach(() => {
    mockNotion.blocks.children.list.mockReset();
    mockNotion.blocks.children.append.mockReset();
    mockNotion.blocks.delete.mockReset();
    mockNotion.pages.retrieve.mockReset();
  });

  it('lists, deletes (reverse), appends, then returns last_edited_time', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [
        { id: 'b-1' },
        { id: 'b-2' },
        { id: 'b-3' },
      ],
    });
    mockNotion.blocks.delete.mockResolvedValue({});
    mockNotion.blocks.children.append.mockResolvedValueOnce({});
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      last_edited_time: '2026-04-29T12:00:00.000Z',
    });

    const newBlocks = [
      { type: 'paragraph', paragraph: { rich_text: [] } },
    ];
    const out = await replaceTaskBlocks('task-id', newBlocks);

    // Verify order of calls and reverse-deletion order
    expect(mockNotion.blocks.children.list).toHaveBeenCalledWith({
      block_id: 'task-id',
      page_size: 100,
    });
    expect(mockNotion.blocks.delete).toHaveBeenNthCalledWith(1, { block_id: 'b-3' });
    expect(mockNotion.blocks.delete).toHaveBeenNthCalledWith(2, { block_id: 'b-2' });
    expect(mockNotion.blocks.delete).toHaveBeenNthCalledWith(3, { block_id: 'b-1' });
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: newBlocks,
    });
    expect(mockNotion.pages.retrieve).toHaveBeenCalledWith({ page_id: 'task-id' });
    expect(out).toEqual({ ok: true, lastEditedTime: '2026-04-29T12:00:00.000Z' });
  });

  it('skips delete and append when there are no existing children and the new array is empty', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      last_edited_time: '2026-04-29T12:00:00.000Z',
    });

    const out = await replaceTaskBlocks('task-id', []);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
    expect(out.ok).toBe(true);
  });

  it('still appends when the page had no children but new blocks were given', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });
    mockNotion.blocks.children.append.mockResolvedValueOnce({});
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      last_edited_time: '2026-04-29T12:00:00.000Z',
    });

    const blocks = [{ type: 'paragraph', paragraph: { rich_text: [] } }];
    await replaceTaskBlocks('task-id', blocks);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: blocks,
    });
  });

  it('returns a stage:"delete" failure when delete throws', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [{ id: 'b-1' }, { id: 'b-2' }],
    });
    mockNotion.blocks.delete.mockResolvedValueOnce({}); // first ok
    mockNotion.blocks.delete.mockRejectedValueOnce(new Error('boom'));

    await expect(replaceTaskBlocks('task-id', [])).rejects.toMatchObject({
      stage: 'delete',
      remaining: expect.any(Number),
    });
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('returns a stage:"append" failure when append throws after deletes succeed', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [{ id: 'b-1' }],
    });
    mockNotion.blocks.delete.mockResolvedValueOnce({});
    mockNotion.blocks.children.append.mockRejectedValueOnce(new Error('rate limit'));

    await expect(
      replaceTaskBlocks('task-id', [
        { type: 'paragraph', paragraph: { rich_text: [] } },
      ]),
    ).rejects.toMatchObject({ stage: 'append' });
  });
});

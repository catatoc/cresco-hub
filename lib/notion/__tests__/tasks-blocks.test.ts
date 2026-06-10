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
    update: vi.fn(),
  },
};

import { replaceTaskBlocks } from '../tasks-blocks';

// Helpers to build Notion-shaped blocks for the list response.
function paraOld(id: string, text: string) {
  return {
    id,
    type: 'paragraph',
    paragraph: {
      rich_text: text
        ? [
            {
              plain_text: text,
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default',
              },
              href: null,
            },
          ]
        : [],
    },
  };
}

function paraNew(text: string) {
  return {
    type: 'paragraph',
    paragraph: {
      rich_text: text
        ? [
            {
              type: 'text',
              text: { content: text, link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                code: false,
                underline: false,
                color: 'default',
              },
            },
          ]
        : [],
    },
  };
}

function todoOld(id: string, text: string, checked: boolean) {
  return {
    id,
    type: 'to_do',
    to_do: {
      checked,
      rich_text: [
        {
          plain_text: text,
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default',
          },
          href: null,
        },
      ],
    },
  };
}

function todoNew(text: string, checked: boolean) {
  return {
    type: 'to_do',
    to_do: {
      checked,
      rich_text: [
        {
          type: 'text',
          text: { content: text, link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            code: false,
            underline: false,
            color: 'default',
          },
        },
      ],
    },
  };
}

function reset() {
  mockNotion.blocks.children.list.mockReset();
  mockNotion.blocks.children.append.mockReset();
  mockNotion.blocks.delete.mockReset();
  mockNotion.blocks.update.mockReset();
}

describe('replaceTaskBlocks — diff path', () => {
  beforeEach(reset);

  it('no-ops when old and new blocks are byte-equivalent', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'hello'), paraOld('b-2', 'world')],
    });

    const newBlocks = [paraNew('hello'), paraNew('world')];
    const out = await replaceTaskBlocks('task-id', newBlocks);

    expect(out).toEqual({ ok: true });
    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.update).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('updates a single edited block in place (no delete/append)', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [
        paraOld('b-1', 'hello'),
        paraOld('b-2', 'old text'),
        paraOld('b-3', 'tail'),
      ],
    });
    mockNotion.blocks.update.mockResolvedValueOnce({});

    const newBlocks = [
      paraNew('hello'),
      paraNew('new text'),
      paraNew('tail'),
    ];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
    expect(mockNotion.blocks.update).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.update).toHaveBeenCalledWith({
      block_id: 'b-2',
      paragraph: newBlocks[1]!.paragraph,
    });
  });

  it('appends a new block at the end with after=last kept id', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a'), paraOld('b-2', 'b')],
    });
    mockNotion.blocks.children.append.mockResolvedValueOnce({});

    const newBlocks = [paraNew('a'), paraNew('b'), paraNew('c')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.update).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: [newBlocks[2]],
      after: 'b-2',
    });
  });

  it('inserts a new block in the middle with after=preceding kept id', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a'), paraOld('b-2', 'b')],
    });
    mockNotion.blocks.children.append.mockResolvedValueOnce({});

    const newBlocks = [paraNew('a'), paraNew('mid'), paraNew('b')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.update).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: [newBlocks[1]],
      after: 'b-1',
    });
  });

  it('deletes a single block from the middle without touching the rest', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [
        paraOld('b-1', 'a'),
        paraOld('b-2', 'mid'),
        paraOld('b-3', 'tail'),
      ],
    });
    mockNotion.blocks.delete.mockResolvedValueOnce({});

    const newBlocks = [paraNew('a'), paraNew('tail')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.delete).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.delete).toHaveBeenCalledWith({ block_id: 'b-2' });
    expect(mockNotion.blocks.update).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('toggles a to_do checked attribute via update (same fingerprint? no — checked is part of fp)', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [todoOld('b-1', 'task', false)],
    });
    mockNotion.blocks.update.mockResolvedValueOnce({});

    const newBlocks = [todoNew('task', true)];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.update).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.update).toHaveBeenCalledWith({
      block_id: 'b-1',
      to_do: newBlocks[0]!.to_do,
    });
  });

  it('groups consecutive inserts with the same anchor into one append call', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a')],
    });
    mockNotion.blocks.children.append.mockResolvedValueOnce({});

    const newBlocks = [paraNew('a'), paraNew('x'), paraNew('y'), paraNew('z')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.children.append).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: [newBlocks[1], newBlocks[2], newBlocks[3]],
      after: 'b-1',
    });
  });
});

describe('replaceTaskBlocks — fallback path', () => {
  beforeEach(reset);

  it('falls back to full replace when a new block is inserted at position 0', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a')],
    });
    mockNotion.blocks.delete.mockResolvedValue({});
    mockNotion.blocks.children.append.mockResolvedValueOnce({});

    const newBlocks = [paraNew('top'), paraNew('a')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.delete).toHaveBeenCalledTimes(1);
    expect(mockNotion.blocks.delete).toHaveBeenCalledWith({ block_id: 'b-1' });
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: newBlocks,
    });
  });

  it('full-replace when starting from an empty page (no old blocks, new blocks given)', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });
    mockNotion.blocks.children.append.mockResolvedValueOnce({});

    const newBlocks = [paraNew('hello')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: newBlocks,
    });
  });

  it('no-ops when both sides are empty', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });

    const out = await replaceTaskBlocks('task-id', []);

    expect(out).toEqual({ ok: true });
    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('chunks fallback append into groups of 100', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });
    mockNotion.blocks.children.append.mockResolvedValue({});

    const newBlocks = Array.from({ length: 250 }, (_, i) => paraNew(`p${i}`));
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.children.append).toHaveBeenCalledTimes(3);
    const calls = mockNotion.blocks.children.append.mock.calls;
    expect((calls[0]![0] as { children: unknown[] }).children).toHaveLength(100);
    expect((calls[1]![0] as { children: unknown[] }).children).toHaveLength(100);
    expect((calls[2]![0] as { children: unknown[] }).children).toHaveLength(50);
  });
});

describe('replaceTaskBlocks — pagination + errors', () => {
  beforeEach(reset);

  it('paginates list when has_more=true', async () => {
    mockNotion.blocks.children.list
      .mockResolvedValueOnce({
        results: [paraOld('a-1', 'one'), paraOld('a-2', 'two')],
        has_more: true,
        next_cursor: 'cur-1',
      })
      .mockResolvedValueOnce({
        results: [paraOld('b-1', 'three')],
        has_more: false,
        next_cursor: null,
      });

    // Identical doc → no mutations.
    const newBlocks = [paraNew('one'), paraNew('two'), paraNew('three')];
    await replaceTaskBlocks('task-id', newBlocks);

    expect(mockNotion.blocks.children.list).toHaveBeenCalledTimes(2);
    expect(mockNotion.blocks.children.list).toHaveBeenNthCalledWith(2, {
      block_id: 'task-id',
      page_size: 100,
      start_cursor: 'cur-1',
    });
    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.update).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('returns a stage:"delete" failure when a delete throws (fallback path)', async () => {
    // An "insert at position 0 with no preceding kept anchor" forces the
    // fallback path: planSync bails, the caller deletes everything and
    // re-appends.
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a'), paraOld('b-2', 'b')],
    });
    mockNotion.blocks.delete.mockResolvedValueOnce({});
    mockNotion.blocks.delete.mockRejectedValueOnce(new Error('boom'));

    await expect(
      replaceTaskBlocks('task-id', [paraNew('top'), paraNew('a'), paraNew('b')]),
    ).rejects.toMatchObject({
      stage: 'delete',
      remaining: expect.any(Number),
    });
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('returns a stage:"update" failure when update throws on the diff path', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a')],
    });
    mockNotion.blocks.update.mockRejectedValueOnce(new Error('rate limit'));

    await expect(
      replaceTaskBlocks('task-id', [paraNew('a edited')]),
    ).rejects.toMatchObject({ stage: 'update' });
  });

  it('returns a stage:"append" failure when append throws on the diff path', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [paraOld('b-1', 'a')],
    });
    mockNotion.blocks.children.append.mockRejectedValueOnce(new Error('rate limit'));

    await expect(
      replaceTaskBlocks('task-id', [paraNew('a'), paraNew('b')]),
    ).rejects.toMatchObject({ stage: 'append' });
  });
});

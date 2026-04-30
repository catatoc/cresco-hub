import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { queryTasksByCustomerAndSprintPaginated } from '../tasks';

const taskRow = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  properties: {
    'Task name': { title: [{ plain_text: id }] },
    Status: { status: { name: 'Not Started' } },
    Customer: { relation: [{ id: 'cust-1' }] },
  },
});

describe('queryTasksByCustomerAndSprintPaginated', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('uses Customer + Sprint filter when sprintId provided', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [taskRow('t1')],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerAndSprintPaginated('cust-1', 'sprint-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.data_source_id).toBe('tasks-ds');
    expect(call.filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Sprint', relation: { contains: 'sprint-7' } },
      ],
    });
  });

  it('uses only Customer filter when sprintId is null', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerAndSprintPaginated('cust-1', null);
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({ property: 'Customer', relation: { contains: 'cust-1' } });
  });

  it('paginates with start_cursor until has_more=false', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({
        results: [taskRow('t1'), taskRow('t2')],
        has_more: true,
        next_cursor: 'cur-1',
      })
      .mockResolvedValueOnce({
        results: [taskRow('t3')],
        has_more: false,
        next_cursor: null,
      });

    const out = await queryTasksByCustomerAndSprintPaginated('cust-1', 'sprint-7');
    expect(out.tasks.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    expect(out.truncated).toBe(false);
    expect(mockNotion.dataSources.query.mock.calls[1]![0].start_cursor).toBe('cur-1');
  });

  it('caps at 500 by default and reports truncated=true', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`a${i}`)),
        has_more: true,
        next_cursor: 'c1',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`b${i}`)),
        has_more: true,
        next_cursor: 'c2',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`c${i}`)),
        has_more: true,
        next_cursor: 'c3',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`d${i}`)),
        has_more: true,
        next_cursor: 'c4',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`e${i}`)),
        has_more: true,
        next_cursor: 'c5',
      });

    const out = await queryTasksByCustomerAndSprintPaginated('cust-1', 'sprint-7');
    expect(out.tasks).toHaveLength(500);
    expect(out.truncated).toBe(true);
    expect(mockNotion.dataSources.query).toHaveBeenCalledTimes(5);
  });

  it('honors custom cap', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: Array.from({ length: 10 }, (_, i) => taskRow(`x${i}`)),
      has_more: true,
      next_cursor: 'c1',
    });
    const out = await queryTasksByCustomerAndSprintPaginated('cust-1', null, 5);
    expect(out.tasks).toHaveLength(5);
    expect(out.truncated).toBe(true);
  });
});

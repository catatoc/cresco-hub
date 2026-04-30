import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));
const mockNotion = { dataSources: { query: vi.fn() } };

import { queryTasksByCustomerSprintAndMember } from '../tasks';

const taskRow = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  properties: {
    'Task name': { title: [{ plain_text: id }] },
    Status: { status: { name: 'Not Started' } },
    Customer: { relation: [{ id: 'cust-1' }] },
    Team: { relation: [{ id: 'mem-7' }] },
  },
});

describe('queryTasksByCustomerSprintAndMember', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('builds and-filter with Customer + Sprint + Team', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [taskRow('t1')],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerSprintAndMember('cust-1', 'sprint-7', 'mem-7');
    const filter = mockNotion.dataSources.query.mock.calls[0]![0].filter;
    expect(filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Sprint', relation: { contains: 'sprint-7' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
  });

  it('omits Sprint when sprintId is null', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerSprintAndMember('cust-1', null, 'mem-7');
    const filter = mockNotion.dataSources.query.mock.calls[0]![0].filter;
    expect(filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
  });

  it('paginates fully (no cap)', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({
        results: [taskRow('t1')],
        has_more: true,
        next_cursor: 'c1',
      })
      .mockResolvedValueOnce({
        results: [taskRow('t2')],
        has_more: false,
        next_cursor: null,
      });
    const tasks = await queryTasksByCustomerSprintAndMember('cust-1', null, 'mem-7');
    expect(tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });
});

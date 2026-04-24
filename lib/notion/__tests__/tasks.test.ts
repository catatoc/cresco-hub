import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-db' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  pages: { update: vi.fn(), retrieve: vi.fn() },
};

import { queryTasksByClientAndCycle, updateTaskStatus } from '../tasks';

// TODO(refactor-B): rewrite with real schemas
describe.skip('queryTasksByClientAndCycle', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('queries tasks filtered by client and cycle', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          properties: {
            Title: { title: [{ plain_text: 'Fix login' }] },
            Status: { status: { name: 'En progreso' } },
            Priority: { select: { name: 'Alta' } },
            Assignee: { relation: [{ id: 'm-1' }] },
            Project: { relation: [{ id: 'p-1' }] },
            Client: { relation: [{ id: 'client-123' }] },
            Cycle: { rich_text: [{ plain_text: '2026-W17' }] },
            'Due date': { date: { start: '2026-04-24', end: null } },
            Labels: { multi_select: [{ name: 'Backend' }] },
          },
        },
      ],
    });

    const tasks = await queryTasksByClientAndCycle('client-123', '2026-W17');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'task-1',
      title: 'Fix login',
      status: 'En progreso',
      priority: 'Alta',
      clientId: 'client-123',
      cycle: '2026-W17',
      labels: ['Backend'],
    });
  });
});

// TODO(refactor-B): rewrite with real schemas
describe.skip('updateTaskStatus', () => {
  beforeEach(() => mockNotion.pages.update.mockReset());

  it('patches the Status property', async () => {
    mockNotion.pages.update.mockResolvedValueOnce({ id: 'task-1' });
    await updateTaskStatus('task-1', 'Hecho');
    expect(mockNotion.pages.update).toHaveBeenCalledWith({
      page_id: 'task-1',
      properties: { Status: { status: { name: 'Hecho' } } },
    });
  });
});

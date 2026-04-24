import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  pages: { update: vi.fn(), retrieve: vi.fn() },
};

import { queryTasksByCustomerAndSprint, updateTaskStatus } from '../tasks';

describe('queryTasksByCustomerAndSprint', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses real Notion task shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          properties: {
            'Task name': { title: [{ plain_text: 'Fix onboarding bug' }] },
            Status: { status: { name: 'In Progress' } },
            Priority: { select: { name: 'High' } },
            Type: { select: { name: '🐛 Bug' } },
            Assignee: { people: [{ id: 'user-carlos' }] },
            Project: { relation: [{ id: 'proj-1' }] },
            Customer: { relation: [{ id: 'cust-focus' }] },
            Sprint: { relation: [{ id: 'sprint-17' }] },
            Due: { date: { start: '2026-04-24', end: null } },
            Planned: { date: { start: '2026-04-22', end: null } },
            'Completed on': { date: null },
            Tags: { multi_select: [{ name: 'Mobile' }] },
            Progress: { number: 0.6 },
          },
        },
      ],
    });

    const tasks = await queryTasksByCustomerAndSprint('cust-focus', 'sprint-17');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'task-1',
      title: 'Fix onboarding bug',
      status: 'In Progress',
      priority: 'High',
      type: '🐛 Bug',
      assigneeIds: ['user-carlos'],
      projectId: 'proj-1',
      customerId: 'cust-focus',
      sprintId: 'sprint-17',
      dueDate: '2026-04-24',
      plannedDate: '2026-04-22',
      tags: ['Mobile'],
      progress: 0.6,
    });
  });

  it('filters without sprint when sprintId is null', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryTasksByCustomerAndSprint('cust-x', null);
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({ property: 'Customer', relation: { contains: 'cust-x' } });
  });
});

describe('updateTaskStatus', () => {
  beforeEach(() => mockNotion.pages.update.mockReset());

  it('writes the real enum value', async () => {
    mockNotion.pages.update.mockResolvedValueOnce({ id: 'task-1' });
    await updateTaskStatus('task-1', 'Done');
    expect(mockNotion.pages.update).toHaveBeenCalledWith({
      page_id: 'task-1',
      properties: { Status: { status: { name: 'Done' } } },
    });
  });
});

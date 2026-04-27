import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryTasksByProject } from '../tasks';

describe('queryTasksByProject', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters by Project relation contains projectId', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryTasksByProject('proj-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.data_source_id).toBe('tasks-ds');
    expect(call.filter).toEqual({ property: 'Project', relation: { contains: 'proj-7' } });
  });

  it('parses returned tasks via the existing taskSchema shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          properties: {
            'Task name': { title: [{ plain_text: 'QA mobile' }] },
            Status: { status: { name: 'In Progress' } },
            Priority: { select: { name: 'High' } },
            Type: { select: { name: '✅ Task' } },
            Team: { relation: [{ id: 'team-1' }] },
            Project: { relation: [{ id: 'proj-7' }] },
            Customer: { relation: [{ id: 'c1' }] },
            Sprint: { relation: [] },
            Due: { date: { start: '2026-04-30', end: null } },
            Planned: { date: null },
            'Completed on': { date: null },
            Tags: { multi_select: [] },
            Progress: { number: null },
          },
        },
      ],
    });

    const tasks = await queryTasksByProject('proj-7');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'task-1',
      title: 'QA mobile',
      status: 'In Progress',
      projectId: 'proj-7',
      dueDate: '2026-04-30',
    });
  });
});

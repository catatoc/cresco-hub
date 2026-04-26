import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  pages: { update: vi.fn(), retrieve: vi.fn(), create: vi.fn() },
  blocks: { children: { append: vi.fn() } },
};

import { queryTasksByCustomerAndSprint, updateTaskStatus, createTask } from '../tasks';

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
            Team: { relation: [{ id: 'team-carlos' }] },
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
      assigneeIds: ['team-carlos'],
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

describe('createTask (extended)', () => {
  beforeEach(() => {
    mockNotion.pages.create.mockReset();
    mockNotion.blocks.children.append.mockReset();
  });

  it('maps assigneeIds to Team relation (NOT Assignee people)', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({
      id: 'task-x',
      url: 'https://notion.so/task-x',
    });
    await createTask({
      customerId: 'cust-1',
      title: 'New task',
      assigneeIds: ['team-1', 'team-2'],
    });
    const call = mockNotion.pages.create.mock.calls[0]![0];
    expect(call.properties.Team).toEqual({
      relation: [{ id: 'team-1' }, { id: 'team-2' }],
    });
    expect(call.properties.Assignee).toBeUndefined();
  });

  it('maps projectId, priority, dueDate', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({
      id: 't', url: 'u',
    });
    await createTask({
      customerId: 'c',
      title: 't',
      projectId: 'proj-1',
      priority: 'High',
      dueDate: '2026-05-01',
    });
    const props = mockNotion.pages.create.mock.calls[0]![0].properties;
    expect(props.Project).toEqual({ relation: [{ id: 'proj-1' }] });
    expect(props.Priority).toEqual({ select: { name: 'High' } });
    expect(props.Due).toEqual({ date: { start: '2026-05-01' } });
  });

  it('appends description as paragraph block when present', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({
      id: 'task-y', url: 'u',
    });
    await createTask({
      customerId: 'c',
      title: 't',
      description: 'Hello body',
    });
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-y',
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Hello body' } }],
          },
        },
      ],
    });
  });

  it('does NOT call blocks.append when description is empty', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'x', url: 'u' });
    await createTask({ customerId: 'c', title: 't' });
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('trims description before writing the paragraph block', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'task-z', url: 'u' });
    await createTask({
      customerId: 'c',
      title: 't',
      description: '  Hello world  ',
    });
    const call = mockNotion.blocks.children.append.mock.calls[0]![0];
    expect(call.children[0].paragraph.rich_text[0].text.content).toBe('Hello world');
  });

  it('does NOT call blocks.append when description is whitespace only', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'task-w', url: 'u' });
    await createTask({
      customerId: 'c',
      title: 't',
      description: '   ',
    });
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });
});

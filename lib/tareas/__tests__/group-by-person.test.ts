import { describe, it, expect } from 'vitest';
import { groupTasksByPerson } from '../group-by-person';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

const member = (id: string, name: string): TeamMember => ({
  id,
  name,
  email: `${id}@example.com`,
  role: null,
  area: null,
  customerIds: [],
  projectIds: [],
  portalSignIn: false,
});

const task = (overrides: Partial<Task>): Task => ({
  id: 'task-' + Math.random().toString(36).slice(2, 8),
  title: 'task',
  status: 'Not Started',
  priority: null,
  type: null,
  assigneeIds: [],
  projectId: null,
  customerId: null,
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://example.com',
  ...overrides,
});

describe('groupTasksByPerson', () => {
  it('returns empty array when there are no tasks', () => {
    expect(groupTasksByPerson([], [member('a', 'Ana')])).toEqual([]);
  });

  it('groups tasks under their primary assignee', () => {
    const ana = member('a', 'Ana');
    const bea = member('b', 'Bea');
    const tasks = [
      task({ id: '1', assigneeIds: ['a'] }),
      task({ id: '2', assigneeIds: ['b'] }),
      task({ id: '3', assigneeIds: ['a'] }),
    ];
    const result = groupTasksByPerson(tasks, [ana, bea]);
    const aGroup = result.find((g) => g.member?.id === 'a')!;
    const bGroup = result.find((g) => g.member?.id === 'b')!;
    expect(aGroup.tasks.map((t) => t.id).sort()).toEqual(['1', '3']);
    expect(bGroup.tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('uses only the first assignee for multi-assigned tasks', () => {
    const ana = member('a', 'Ana');
    const bea = member('b', 'Bea');
    const tasks = [task({ id: '1', assigneeIds: ['a', 'b'] })];
    const result = groupTasksByPerson(tasks, [ana, bea]);
    expect(result.find((g) => g.member?.id === 'a')!.tasks).toHaveLength(1);
    expect(result.find((g) => g.member?.id === 'b')).toBeUndefined();
  });

  it('orders by In Progress count desc, then total desc', () => {
    const ana = member('a', 'Ana'); // 1 in progress, 1 total
    const bea = member('b', 'Bea'); // 0 in progress, 5 total
    const cam = member('c', 'Cam'); // 2 in progress, 2 total
    const tasks = [
      task({ id: '1', assigneeIds: ['a'], status: 'In Progress' }),
      task({ id: '2', assigneeIds: ['b'], status: 'Not Started' }),
      task({ id: '3', assigneeIds: ['b'], status: 'Not Started' }),
      task({ id: '4', assigneeIds: ['b'], status: 'Not Started' }),
      task({ id: '5', assigneeIds: ['b'], status: 'Done' }),
      task({ id: '6', assigneeIds: ['b'], status: 'Done' }),
      task({ id: '7', assigneeIds: ['c'], status: 'In Progress' }),
      task({ id: '8', assigneeIds: ['c'], status: 'In Progress' }),
    ];
    const result = groupTasksByPerson(tasks, [ana, bea, cam]);
    const ids = result.map((g) => g.member?.id);
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  it('skips members without tasks', () => {
    const ana = member('a', 'Ana');
    const bea = member('b', 'Bea');
    const tasks = [task({ assigneeIds: ['a'] })];
    const result = groupTasksByPerson(tasks, [ana, bea]);
    expect(result).toHaveLength(1);
    expect(result[0]!.member?.id).toBe('a');
  });

  it('puts unassigned tasks into a trailing null-member group', () => {
    const ana = member('a', 'Ana');
    const tasks = [
      task({ id: '1', assigneeIds: ['a'] }),
      task({ id: '2', assigneeIds: [] }),
      task({ id: '3', assigneeIds: [] }),
    ];
    const result = groupTasksByPerson(tasks, [ana]);
    expect(result).toHaveLength(2);
    expect(result[0]!.member?.id).toBe('a');
    expect(result[1]!.member).toBeNull();
    expect(result[1]!.tasks.map((t) => t.id).sort()).toEqual(['2', '3']);
  });

  it('does not create the "Sin asignar" group when there are no orphans', () => {
    const ana = member('a', 'Ana');
    const tasks = [task({ assigneeIds: ['a'] })];
    expect(groupTasksByPerson(tasks, [ana])).toHaveLength(1);
  });

  it('drops Archived tasks', () => {
    const ana = member('a', 'Ana');
    const tasks = [
      task({ id: '1', assigneeIds: ['a'], status: 'Archived' }),
      task({ id: '2', assigneeIds: ['a'], status: 'Not Started' }),
    ];
    const result = groupTasksByPerson(tasks, [ana]);
    expect(result).toHaveLength(1);
    expect(result[0]!.tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('drops orphans that are Archived', () => {
    const tasks = [task({ assigneeIds: [], status: 'Archived' })];
    expect(groupTasksByPerson(tasks, [])).toEqual([]);
  });

  it('skips assignee ids that are not in the members list', () => {
    const ana = member('a', 'Ana');
    const tasks = [
      task({ id: '1', assigneeIds: ['ghost'] }),
      task({ id: '2', assigneeIds: ['a'] }),
    ];
    const result = groupTasksByPerson(tasks, [ana]);
    // Tasks for unknown members fall through to "Sin asignar"
    expect(result).toHaveLength(2);
    expect(result[0]!.member?.id).toBe('a');
    expect(result[1]!.member).toBeNull();
    expect(result[1]!.tasks.map((t) => t.id)).toEqual(['1']);
  });
});

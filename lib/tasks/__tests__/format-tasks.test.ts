import { describe, it, expect } from 'vitest';
import { serializeTasksJson } from '@/lib/tasks/format-tasks';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

const emptyMembers = new Map<string, TeamMember>();

describe('serializeTasksJson', () => {
  it('returns a payload with count 0 and empty tasks for an empty list', () => {
    const json = serializeTasksJson([], emptyMembers);
    const parsed = JSON.parse(json);

    expect(parsed.count).toBe(0);
    expect(parsed.tasks).toEqual([]);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(() => new Date(parsed.exportedAt).toISOString()).not.toThrow();
  });
});

const fullTask: Task = {
  id: 'task-1',
  title: 'Implementar copiar tareas',
  status: 'In Progress',
  priority: 'High',
  type: '🐛 Bug',
  assigneeIds: ['user-1', 'user-unknown'],
  projectId: 'proj-1',
  customerId: null,
  sprintId: 'sprint-1',
  dueDate: '2026-05-02',
  plannedDate: '2026-04-30',
  completedAt: null,
  tags: ['backend', 'urgent'],
  progress: 0.5,
  url: 'https://notion.so/abc123',
};

const minimalTask: Task = {
  id: 'task-2',
  title: 'Tarea minima',
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
  url: 'https://notion.so/min',
};

const membersWithDani = new Map<string, TeamMember>([
  ['user-1', { id: 'user-1', name: 'Dani', email: 'd@x', role: null, area: null, customerIds: [], projectIds: [] }],
]);

describe('serializeTasksJson — field mapping', () => {
  it('maps a full task to the 9-field shape and resolves assignee names', () => {
    const json = serializeTasksJson([fullTask], membersWithDani);
    const parsed = JSON.parse(json);

    expect(parsed.count).toBe(1);
    expect(parsed.tasks[0]).toEqual({
      title: 'Implementar copiar tareas',
      status: 'In Progress',
      priority: 'High',
      type: '🐛 Bug',
      assignees: ['Dani', 'Desconocido'],
      tags: ['backend', 'urgent'],
      dueDate: '2026-05-02',
      plannedDate: '2026-04-30',
      url: 'https://notion.so/abc123',
    });
  });

  it('omits id/projectId/customerId/sprintId/progress/completedAt from payload', () => {
    const json = serializeTasksJson([fullTask], membersWithDani);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed.tasks[0]).sort();

    expect(keys).toEqual(
      ['assignees', 'dueDate', 'plannedDate', 'priority', 'status', 'tags', 'title', 'type', 'url'].sort(),
    );
  });

  it('handles a minimal task with all nullables', () => {
    const json = serializeTasksJson([minimalTask], new Map());
    const parsed = JSON.parse(json);

    expect(parsed.tasks[0]).toEqual({
      title: 'Tarea minima',
      status: 'Not Started',
      priority: null,
      type: null,
      assignees: [],
      tags: [],
      dueDate: null,
      plannedDate: null,
      url: 'https://notion.so/min',
    });
  });

  it('preserves task order', () => {
    const json = serializeTasksJson([minimalTask, fullTask], membersWithDani);
    const parsed = JSON.parse(json);

    expect(parsed.tasks.map((t: { title: string }) => t.title)).toEqual([
      'Tarea minima',
      'Implementar copiar tareas',
    ]);
  });
});

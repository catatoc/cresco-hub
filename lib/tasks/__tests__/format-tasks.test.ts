import { describe, it, expect } from 'vitest';
import { serializeTasksJson, serializeTasksMarkdown } from '@/lib/tasks/format-tasks';
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

describe('serializeTasksMarkdown — header', () => {
  it('starts with a header line containing the count and a date', () => {
    const md = serializeTasksMarkdown([fullTask], membersWithDani);
    const firstLine = md.split('\n')[0];

    expect(firstLine).toMatch(/^# 1 tareas \(exportadas \d{4}-\d{2}-\d{2}\)$/);
  });

  it('uses plural correctly for empty/many', () => {
    const empty = serializeTasksMarkdown([], new Map());
    expect(empty.split('\n')[0]).toMatch(/^# 0 tareas /);
  });
});

describe('serializeTasksMarkdown — task body', () => {
  it('renders a full task with all metadata inline and indented continuation lines', () => {
    const md = serializeTasksMarkdown([fullTask], membersWithDani);

    expect(md).toContain('- [ ] **Implementar copiar tareas** · 🐛 Bug · High · Due 2 may');
    expect(md).toContain('      Asignados: Dani, Desconocido · Tags: backend, urgent');
    expect(md).toContain('      https://notion.so/abc123');
  });

  it('omits empty metadata segments without leaving stray separators', () => {
    const md = serializeTasksMarkdown([minimalTask], new Map());

    expect(md).toContain('- [ ] **Tarea minima**');
    expect(md).not.toContain(' · null');
    expect(md).not.toContain('Asignados:');
    expect(md).not.toContain('Tags:');
    expect(md).toContain('      https://notion.so/min');
  });

  it('drops the assignees/tags continuation line entirely when both are empty', () => {
    const md = serializeTasksMarkdown([minimalTask], new Map());
    const lines = md.trim().split('\n');

    // header, blank, line1 (- [ ] ...), line3 (url)
    expect(lines).toHaveLength(4);
    expect(lines[2]).toMatch(/^- \[ \] /);
    expect(lines[3]?.trim()).toBe('https://notion.so/min');
  });

  it('formats Spanish dates as "D mes"', () => {
    const t: Task = { ...minimalTask, dueDate: '2026-11-15' };
    const md = serializeTasksMarkdown([t], new Map());
    expect(md).toContain('Due 15 nov');
  });

  it('omits Due segment when dueDate is unparseable', () => {
    const t: Task = { ...minimalTask, dueDate: 'not-a-date' };
    const md = serializeTasksMarkdown([t], new Map());
    expect(md).not.toContain('Due ');
  });

  it('preserves task order', () => {
    const md = serializeTasksMarkdown([minimalTask, fullTask], membersWithDani);
    const idxMin = md.indexOf('Tarea minima');
    const idxFull = md.indexOf('Implementar copiar tareas');
    expect(idxMin).toBeGreaterThan(-1);
    expect(idxFull).toBeGreaterThan(idxMin);
  });
});

describe('serializeTasksJson — with content', () => {
  it('includes a content field when contentByTaskId is provided', () => {
    const contentMap = new Map<string, string>([
      ['task-1', '# Heading\nParagraph text'],
    ]);
    const json = serializeTasksJson([fullTask], membersWithDani, contentMap);
    const parsed = JSON.parse(json);

    expect(parsed.tasks[0].content).toBe('# Heading\nParagraph text');
  });

  it('uses empty string when content map is provided but missing this task', () => {
    const contentMap = new Map<string, string>();
    const json = serializeTasksJson([fullTask], membersWithDani, contentMap);
    const parsed = JSON.parse(json);

    expect(parsed.tasks[0].content).toBe('');
  });

  it('omits content field when contentByTaskId is undefined', () => {
    const json = serializeTasksJson([fullTask], membersWithDani);
    const parsed = JSON.parse(json);

    expect(parsed.tasks[0]).not.toHaveProperty('content');
  });
});

describe('serializeTasksMarkdown — with content', () => {
  it('appends an indented content block under the URL', () => {
    const contentMap = new Map<string, string>([
      ['task-1', '# Heading\nParagraph text\n- item'],
    ]);
    const md = serializeTasksMarkdown([fullTask], membersWithDani, contentMap);

    expect(md).toContain('      https://notion.so/abc123');
    expect(md).toContain('      ---');
    expect(md).toContain('      # Heading');
    expect(md).toContain('      Paragraph text');
    expect(md).toContain('      - item');
  });

  it('omits the content block when content is empty', () => {
    const contentMap = new Map<string, string>([['task-1', '']]);
    const md = serializeTasksMarkdown([fullTask], membersWithDani, contentMap);

    expect(md).not.toContain('---');
  });

  it('omits the content block when contentByTaskId is undefined', () => {
    const md = serializeTasksMarkdown([fullTask], membersWithDani);

    expect(md).not.toContain('---');
  });
});

import { describe, it, expect } from 'vitest';
import { buildPrompt } from './build-prompt';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

const baseTask: Task = {
  id: 'task-id',
  title: 'Implementar deeplink a Claude Code',
  status: 'In Progress',
  priority: 'High',
  type: '🐛 Bug',
  assigneeIds: [],
  projectId: 'p1',
  customerId: 'c1',
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://www.notion.so/abcdef',
};

const baseProject: Project = {
  id: 'p1',
  name: 'Notion Hub',
  icon: null,
  summary: null,
  repoUrl: 'https://github.com/me/notion-hub',
  status: 'In Progress',
  priority: null,
  completion: null,
  ownerIds: [],
  customerId: 'c1',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://www.notion.so/p1',
};

describe('buildPrompt', () => {
  it('includes title, metadata, project, repo, Notion URL, and description', () => {
    const out = buildPrompt({
      task: baseTask,
      project: baseProject,
      description: 'Allow users to start a session.',
    });
    expect(out).toContain('Implementar deeplink a Claude Code');
    expect(out).toContain('Estado: In Progress');
    expect(out).toContain('Prioridad: High');
    expect(out).toContain('Tipo: 🐛 Bug');
    expect(out).toContain('Proyecto: Notion Hub');
    expect(out).toContain('Repo: https://github.com/me/notion-hub');
    expect(out).toContain('Notion: https://www.notion.so/abcdef');
    expect(out).toContain('Descripción:\nAllow users to start a session.');
  });

  it('omits the Repo line when project has no repoUrl', () => {
    const project = { ...baseProject, repoUrl: null };
    const out = buildPrompt({ task: baseTask, project, description: 'x' });
    expect(out).not.toContain('Repo:');
    expect(out).toContain('Proyecto: Notion Hub');
  });

  it('omits Proyecto and Repo when project is null', () => {
    const out = buildPrompt({ task: baseTask, project: null, description: 'x' });
    expect(out).not.toContain('Proyecto:');
    expect(out).not.toContain('Repo:');
    expect(out).toContain('Notion: https://www.notion.so/abcdef');
  });

  it('omits Descripción section when description is empty', () => {
    const out = buildPrompt({ task: baseTask, project: baseProject, description: '' });
    expect(out).not.toContain('Descripción:');
  });

  it('omits Prioridad and Tipo when null', () => {
    const task = { ...baseTask, priority: null, type: null };
    const out = buildPrompt({ task, project: baseProject, description: '' });
    expect(out).not.toContain('Prioridad:');
    expect(out).not.toContain('Tipo:');
    expect(out).toContain('Estado: In Progress');
  });
});

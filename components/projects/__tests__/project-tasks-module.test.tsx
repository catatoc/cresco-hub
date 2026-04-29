import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTasksModule } from '../project-tasks-module';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

const mk = (over: Partial<Task>): Task => ({
  id: 't',
  title: 'Untitled',
  status: 'Not Started',
  priority: null,
  type: null,
  assigneeIds: [],
  projectId: 'p',
  customerId: 'c',
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://notion.so/t',
  ...over,
});

const project: Project = {
  id: 'p',
  name: 'Test Project',
  icon: null,
  summary: null,
  repoUrl: null,
  status: 'In Progress',
  priority: null,
  completion: null,
  ownerIds: [],
  customerId: null,
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p',
};

describe('ProjectTasksModule', () => {
  it('shows empty state when no tasks', () => {
    render(<ProjectTasksModule tasks={[]} project={project} />);
    expect(screen.getByText(/Sin tareas/i)).toBeInTheDocument();
  });

  it('renders top 5 sorted by status then dueDate', () => {
    const tasks: Task[] = [
      mk({ id: '1', title: 'Done old', status: 'Done', dueDate: '2026-01-01' }),
      mk({ id: '2', title: 'Active soon', status: 'In Progress', dueDate: '2026-04-30' }),
      mk({ id: '3', title: 'Active later', status: 'In Progress', dueDate: '2026-05-15' }),
      mk({ id: '4', title: 'In review', status: 'In Review', dueDate: '2026-05-01' }),
      mk({ id: '5', title: 'Refining', status: 'Refining' }),
      mk({ id: '6', title: 'Not started', status: 'Not Started' }),
      mk({ id: '7', title: 'Sixth active', status: 'In Progress', dueDate: '2026-05-20' }),
    ];
    render(<ProjectTasksModule tasks={tasks} project={project} />);
    const taskLinks = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/tareas/'));
    const titles = taskLinks.map((r) => r.getAttribute('aria-label') ?? '');
    expect(titles[0]).toContain('Active soon');
    expect(taskLinks).toHaveLength(5);
    expect(screen.getByRole('link', { name: /Ver todas/ })).toHaveAttribute('href', '/tareas');
  });

  it('renders each row as a link to /tareas/[id]', () => {
    const tasks = [mk({ id: 'abc', title: 'Hello' })];
    render(<ProjectTasksModule tasks={tasks} project={project} />);
    const link = screen.getByLabelText('Hello');
    expect(link).toHaveAttribute('href', '/tareas/abc');
  });
});

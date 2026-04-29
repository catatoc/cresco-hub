import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyTasksMenu } from '@/components/kanban/copy-tasks-menu';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';

const emptyMembers = new Map<string, TeamMember>();

describe('<CopyTasksMenu />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disabled when there are no tasks', () => {
    render(<CopyTasksMenu tasks={[]} membersById={emptyMembers} sprintLabel="Sprint #142" />);
    const trigger = screen.getByRole('button', { name: /copiar tareas/i });
    expect(trigger).toBeDisabled();
  });
});

const t1: Task = {
  id: 't1',
  title: 'Tarea 1',
  status: 'In Progress',
  priority: 'High',
  type: '✅ Task',
  assigneeIds: [],
  projectId: null,
  customerId: null,
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://notion.so/t1',
};

describe('<CopyTasksMenu /> — interactions', () => {
  it('shows the visible-task count in the dropdown header', async () => {
    const user = userEvent.setup();
    render(<CopyTasksMenu tasks={[t1, { ...t1, id: 't2' }]} membersById={emptyMembers} sprintLabel="Sprint #142" />);
    await user.click(screen.getByRole('button', { name: /copiar tareas/i }));
    expect(await screen.findByText(/Copiar 2 tareas visibles/)).toBeInTheDocument();
  });

  it('writes JSON to the clipboard when "Como JSON" is selected', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<CopyTasksMenu tasks={[t1]} membersById={emptyMembers} sprintLabel="Sprint #142" />);
    await user.click(screen.getByRole('button', { name: /copiar tareas/i }));
    await user.click(await screen.findByText('Como JSON'));

    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed.count).toBe(1);
    expect(parsed.tasks[0].title).toBe('Tarea 1');
  });
});

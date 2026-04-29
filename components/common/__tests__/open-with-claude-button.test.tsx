import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenWithClaudeButton } from '../open-with-claude-button';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

const open = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/claude-code/open-with-claude-code', () => ({
  openWithClaudeCode: (args: unknown) => open(args),
}));

const task: Task = {
  id: 'tid', title: 'T', status: 'In Progress', priority: null,
  type: null, assigneeIds: [], projectId: null, customerId: 'c',
  sprintId: null, dueDate: null, plannedDate: null, completedAt: null,
  tags: [], progress: null, url: 'https://notion.so/tid',
};

const project: Project = {
  id: 'p', name: 'P', icon: null, summary: null, repoUrl: null,
  status: null, priority: null, completion: null, ownerIds: [],
  customerId: 'c', teamIds: [], startDate: null, endDate: null,
  url: 'https://notion.so/p',
};

beforeEach(() => open.mockClear());

describe('OpenWithClaudeButton', () => {
  it('renders an icon-only button with aria-label in row variant', () => {
    render(<OpenWithClaudeButton variant="row" task={task} project={null} description="" />);
    expect(screen.getByRole('button', { name: /abrir con claude code/i })).toBeInTheDocument();
  });

  it('renders an icon-only button in card variant', () => {
    render(<OpenWithClaudeButton variant="card" task={task} project={null} description="" />);
    expect(screen.getByRole('button', { name: /abrir con claude code/i })).toBeInTheDocument();
  });

  it('renders a labeled gradient button in cta variant', () => {
    render(<OpenWithClaudeButton variant="cta" task={task} project={null} description="" />);
    expect(screen.getByRole('button', { name: /abrir con claude code/i })).toHaveTextContent(
      /Abrir con Claude Code/i,
    );
  });

  it('calls openWithClaudeCode with the right args on click', async () => {
    const user = userEvent.setup();
    render(
      <OpenWithClaudeButton
        variant="row"
        task={task}
        project={project}
        description="hello"
      />,
    );
    await user.click(screen.getByRole('button', { name: /abrir con claude code/i }));
    expect(open).toHaveBeenCalledWith({ task, project, description: 'hello' });
  });

  it('stops propagation on click so it does not trigger ancestor handlers', async () => {
    const ancestorClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={ancestorClick}>
        <OpenWithClaudeButton variant="row" task={task} project={null} description="" />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /abrir con claude code/i }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(ancestorClick).not.toHaveBeenCalled();
  });
});

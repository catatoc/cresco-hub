import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenWithClaudeMenu } from '../open-with-claude-menu';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

const open = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/claude-code/open-with-claude-code', () => ({
  openWithClaudeCode: (args: unknown) => open(args),
}));

const successToast = vi.fn();
const errorToast = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

const writeText = vi.fn();

const task: Task = {
  id: 'tid', title: 'My Task', status: 'In Progress', priority: 'High',
  type: '🐛 Bug', assigneeIds: [], projectId: 'p', customerId: 'c',
  sprintId: null, dueDate: null, plannedDate: null, completedAt: null,
  tags: [], progress: null, url: 'https://notion.so/tid',
};

const project: Project = {
  id: 'p', name: 'P', icon: null, summary: null, repoUrl: 'https://github.com/me/p',
  status: null, priority: null, completion: null, ownerIds: [],
  customerId: 'c', teamIds: [], startDate: null, endDate: null,
  url: 'https://notion.so/p',
};

/**
 * userEvent.setup() installs its own fake clipboard on `navigator.clipboard`.
 * To keep the test in control of clipboard observations, install our mock
 * AFTER calling userEvent.setup() — otherwise userEvent's stub replaces it.
 */
function installClipboardMock() {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

beforeEach(() => {
  open.mockClear();
  successToast.mockClear();
  errorToast.mockClear();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
});

describe('OpenWithClaudeMenu', () => {
  it('renders an icon trigger with aria-label', () => {
    render(
      <OpenWithClaudeMenu task={task} project={project} description="" />,
    );
    expect(
      screen.getByRole('button', { name: /open in claude code/i }),
    ).toBeInTheDocument();
  });

  it('shows three menu items when opened', async () => {
    const user = userEvent.setup();
    render(
      <OpenWithClaudeMenu task={task} project={project} description="" />,
    );
    await user.click(screen.getByRole('button', { name: /open in claude code/i }));
    expect(await screen.findByText(/copy as prompt/i)).toBeInTheDocument();
    expect(await screen.findByText(/open in claude code/i)).toBeInTheDocument();
    expect(await screen.findByText(/copy cli command/i)).toBeInTheDocument();
  });

  it('Copy as prompt copies the built prompt to clipboard and shows success toast', async () => {
    const user = userEvent.setup();
    installClipboardMock();
    render(
      <OpenWithClaudeMenu task={task} project={project} description="Body" />,
    );
    await user.click(screen.getByRole('button', { name: /open in claude code/i }));
    const label = await screen.findByText(/copy as prompt/i);
    const menuItem = label.closest('[role="menuitem"]') as HTMLElement;
    await user.click(menuItem);
    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0]?.[0] as string;
    expect(written).toContain('My Task');
    expect(written).toContain('Notion: https://notion.so/tid');
    expect(written).toContain('Descripción:\nBody');
    expect(successToast).toHaveBeenCalled();
  });

  it('Open in Claude Code calls openWithClaudeCode with task/project/description', async () => {
    const user = userEvent.setup();
    render(
      <OpenWithClaudeMenu task={task} project={project} description="x" />,
    );
    await user.click(screen.getByRole('button', { name: /open in claude code/i }));
    const items = await screen.findAllByText(/open in claude code/i);
    // Click the menu item, not the trigger
    const menuItem = items.find((el) => el.closest('[role="menuitem"]'))!;
    await user.click(menuItem);
    expect(open).toHaveBeenCalledWith({ task, project, description: 'x' });
  });

  it('Copy CLI command copies a claude shell command to clipboard', async () => {
    const user = userEvent.setup();
    installClipboardMock();
    render(
      <OpenWithClaudeMenu task={task} project={project} description="x" />,
    );
    await user.click(screen.getByRole('button', { name: /open in claude code/i }));
    const label = await screen.findByText(/copy cli command/i);
    const menuItem = label.closest('[role="menuitem"]') as HTMLElement;
    await user.click(menuItem);
    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0]?.[0] as string;
    expect(written).toMatch(/^claude "/);
    expect(written).toContain('My Task');
    expect(successToast).toHaveBeenCalled();
  });

  it('Copy as prompt shows error toast when clipboard write rejects', async () => {
    writeText.mockReset();
    writeText.mockRejectedValue(new Error('denied'));
    const user = userEvent.setup();
    installClipboardMock();
    render(
      <OpenWithClaudeMenu task={task} project={project} description="" />,
    );
    await user.click(screen.getByRole('button', { name: /open in claude code/i }));
    const label = await screen.findByText(/copy as prompt/i);
    const menuItem = label.closest('[role="menuitem"]') as HTMLElement;
    await user.click(menuItem);
    expect(errorToast).toHaveBeenCalled();
  });
});

describe('OpenWithClaudeMenu variants', () => {
  it('renders icon-only trigger in row variant (no chevron)', () => {
    render(
      <OpenWithClaudeMenu
        variant="row"
        task={task}
        project={project}
        description=""
      />,
    );
    const trigger = screen.getByRole('button', { name: /open in claude code/i });
    expect(trigger).toBeInTheDocument();
    // The cta variant has visible "ChevronDown" SVG; row/card don't.
    // We assert by checking the trigger text/aria — both variants have the same aria-label.
    // Visual diff is asserted via missing chevron in DOM:
    expect(trigger.querySelectorAll('svg').length).toBe(1);
  });

  it('renders icon-only trigger in card variant (no chevron)', () => {
    render(
      <OpenWithClaudeMenu
        variant="card"
        task={task}
        project={project}
        description=""
      />,
    );
    const trigger = screen.getByRole('button', { name: /open in claude code/i });
    expect(trigger.querySelectorAll('svg').length).toBe(1);
  });

  it('renders chevron in cta variant', () => {
    render(
      <OpenWithClaudeMenu
        variant="cta"
        task={task}
        project={project}
        description=""
      />,
    );
    const trigger = screen.getByRole('button', { name: /open in claude code/i });
    // SquareTerminal + ChevronDown
    expect(trigger.querySelectorAll('svg').length).toBe(2);
  });

  it('opens the same three actions regardless of variant', async () => {
    const user = userEvent.setup();
    installClipboardMock();
    render(
      <OpenWithClaudeMenu
        variant="row"
        task={task}
        project={project}
        description="x"
      />,
    );
    await user.click(screen.getByRole('button', { name: /open in claude code/i }));
    expect(await screen.findByText(/copy as prompt/i)).toBeInTheDocument();
    expect(await screen.findByText(/copy cli command/i)).toBeInTheDocument();
  });
});

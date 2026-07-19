import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openWithClaudeCode } from './open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

import { toast } from 'sonner';

const task: Task = {
  id: 'tid', title: 'Title', status: 'In Progress', priority: 'High',
  type: null, assigneeIds: [], projectId: null, customerId: 'c',
  sprintId: null, dueDate: null, plannedDate: null, completedAt: null,
  tags: [], progress: null, url: 'https://notion.so/tid',
};

const project: Project = {
  id: 'p', name: 'P', icon: null, summary: null, repoUrl: null, designUrl: null,
  status: null, priority: null, completion: null, ownerIds: [],
  customerId: 'c', teamIds: [], startDate: null, endDate: null,
  url: 'https://notion.so/p',
};

describe('openWithClaudeCode', () => {
  let originalOpen: typeof window.open;
  let originalClipboard: Clipboard | undefined;
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    originalOpen = window.open;
    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.open = originalOpen;
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    }
  });

  it('opens claude.ai/code in a new tab with noopener,noreferrer', async () => {
    const open = vi.fn().mockReturnValue({} as Window);
    window.open = open;

    await openWithClaudeCode({ task, project, description: '' });

    expect(open).toHaveBeenCalledWith(
      'https://claude.ai/code',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('writes the built prompt to the clipboard and shows a success toast', async () => {
    window.open = vi.fn().mockReturnValue({} as Window);

    await openWithClaudeCode({ task, project, description: 'Body.' });

    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0]?.[0] as string;
    expect(written).toContain('Title');
    expect(written).toContain('Notion: https://notion.so/tid');
    expect(written).toContain('Descripción:\nBody.');
    expect(toast.success).toHaveBeenCalledWith(
      'Sesión abierta en Claude Code',
      expect.objectContaining({ description: expect.stringContaining('copiado') }),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the popup-blocked toast when window.open returns null', async () => {
    window.open = vi.fn().mockReturnValue(null);

    await openWithClaudeCode({ task, project, description: '' });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('bloqueó'),
      expect.any(Object),
    );
  });

  it('shows the clipboard-failed toast and console.info-logs the prompt when writeText rejects', async () => {
    window.open = vi.fn().mockReturnValue({} as Window);
    writeText.mockRejectedValueOnce(new Error('denied'));
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    await openWithClaudeCode({ task, project, description: '' });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('no pude copiar'),
      expect.any(Object),
    );
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it('still attempts the clipboard write when popup is blocked', async () => {
    window.open = vi.fn().mockReturnValue(null);

    await openWithClaudeCode({ task, project, description: '' });

    expect(writeText).toHaveBeenCalledTimes(1);
  });
});

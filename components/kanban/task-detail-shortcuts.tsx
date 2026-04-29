'use client';

import { useEffect } from 'react';
import { openWithClaudeCode } from '@/lib/claude-code/open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

type Props = { task: Task; project: Project | null; description: string };

/**
 * Renders nothing — registers the ⌘⇧. (Cmd/Ctrl+Shift+.) shortcut
 * that triggers `openWithClaudeCode` from the task detail page.
 */
export function TaskDetailShortcuts({ task, project, description }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.shiftKey && e.key === '.') {
        e.preventDefault();
        void openWithClaudeCode({ task, project, description });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, project, description]);
  return null;
}

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { buildPrompt } from '@/lib/claude-code/build-prompt';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

type Props = { task: Task; project: Project | null; description: string };

/**
 * Renders nothing — registers the ⌘⌥P (Cmd/Ctrl+Alt/Option+P) shortcut
 * that copies the task's prompt to the clipboard. Mirrors Linear's
 * "Copy as prompt" shortcut.
 */
export function TaskDetailShortcuts({ task, project, description }: Props) {
  const t = useTranslations('kanban.shortcuts');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      const isMeta = e.metaKey || e.ctrlKey;
      const isAlt = e.altKey;
      // e.code is "KeyP" regardless of layout; e.key on Mac with Option held may yield "π"
      if (isMeta && isAlt && (e.code === 'KeyP' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        const prompt = buildPrompt({ task, project, description });
        void navigator.clipboard
          .writeText(prompt)
          .then(() => {
            toast.success(t('copied'), {
              description: t('copiedDescription'),
            });
          })
          .catch(() => {
            // eslint-disable-next-line no-console
            console.info('[task-detail-shortcuts] prompt:\n', prompt);
            toast.error(t('copyFailed'), {
              description: t('copyFailedDescription'),
            });
          });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, project, description, t]);
  return null;
}

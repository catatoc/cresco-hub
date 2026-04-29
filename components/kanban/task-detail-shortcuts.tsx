'use client';

import { useEffect } from 'react';
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
            toast.success('Prompt copiado al portapapeles', {
              description: 'Pégalo en Claude Code, ChatGPT, Cursor, o tu terminal.',
            });
          })
          .catch(() => {
            // eslint-disable-next-line no-console
            console.info('[task-detail-shortcuts] prompt:\n', prompt);
            toast.error('No se pudo copiar el prompt', {
              description: 'Hay un fallback en la consola del navegador.',
            });
          });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, project, description]);
  return null;
}

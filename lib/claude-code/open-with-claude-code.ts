// lib/claude-code/open-with-claude-code.ts
'use client';

import { toast } from 'sonner';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import { CLAUDE_CODE_WEB_URL } from './constants';
import { buildPrompt } from './build-prompt';

type Args = {
  task: Task;
  project: Project | null;
  /**
   * Plain-text description. Empty string is fine when the caller
   * doesn't have the Notion blocks loaded (e.g. list rows). The
   * detail surface should pass the extracted text so Claude gets
   * full context.
   */
  description: string;
};

const POPUP_BLOCKED_TITLE = 'Tu navegador bloqueó la pestaña';
const POPUP_BLOCKED_DESC = 'Habilita popups para abrir Claude Code automáticamente.';
const CLIPBOARD_OK_TITLE = 'Sesión abierta en Claude Code';
const CLIPBOARD_OK_DESC = 'Prompt copiado · pégalo si no se prellenó.';
const CLIPBOARD_FAIL_TITLE = 'Abrí Claude Code, pero no pude copiar el prompt';
const CLIPBOARD_FAIL_DESC = 'Pégalo desde la consola del navegador (devtools).';

export async function openWithClaudeCode({ task, project, description }: Args): Promise<void> {
  const prompt = buildPrompt({ task, project, description });

  const popup = window.open(CLAUDE_CODE_WEB_URL, '_blank', 'noopener,noreferrer');
  const popupBlocked = popup === null;

  let clipboardOk = false;
  try {
    await navigator.clipboard.writeText(prompt);
    clipboardOk = true;
  } catch {
    clipboardOk = false;
    // eslint-disable-next-line no-console
    console.info('[open-with-claude-code] prompt:\n', prompt);
  }

  if (popupBlocked) {
    toast.error(POPUP_BLOCKED_TITLE, { description: POPUP_BLOCKED_DESC });
    return;
  }
  if (!clipboardOk) {
    toast.error(CLIPBOARD_FAIL_TITLE, { description: CLIPBOARD_FAIL_DESC });
    return;
  }
  toast.success(CLIPBOARD_OK_TITLE, { description: CLIPBOARD_OK_DESC });
}

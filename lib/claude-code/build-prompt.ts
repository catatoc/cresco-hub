// lib/claude-code/build-prompt.ts
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

type BuildPromptArgs = {
  task: Task;
  project: Project | null;
  /**
   * Plain-text description (already extracted from Notion blocks via
   * `extractPlainText`). Pass an empty string when the caller doesn't
   * have the blocks loaded — the Descripción section is omitted.
   */
  description: string;
};

/**
 * Build the prompt string we copy to the clipboard / paste into
 * claude.ai/code. Sections are omitted when their data is missing
 * rather than rendered as "—" so the prompt stays compact.
 */
export function buildPrompt({ task, project, description }: BuildPromptArgs): string {
  const meta: string[] = [`Estado: ${task.status}`];
  if (task.priority) meta.push(`Prioridad: ${task.priority}`);
  if (task.type) meta.push(`Tipo: ${task.type}`);

  const refs: string[] = [];
  if (project) refs.push(`Proyecto: ${project.name}`);
  if (project?.repoUrl) refs.push(`Repo: ${project.repoUrl}`);
  refs.push(`Notion: ${task.url}`);

  const sections: string[] = [
    'Trabaja en esta tarea de Notion:',
    '',
    task.title,
    '',
    meta.join(' · '),
    refs.join('\n'),
  ];

  const trimmedDescription = description.trim();
  if (trimmedDescription.length > 0) {
    sections.push('', 'Descripción:', trimmedDescription);
  }

  return sections.join('\n');
}

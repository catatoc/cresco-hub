import type { Task, TaskStatus, TaskPriority, TaskType } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

export type TaskExport = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  type: TaskType | null;
  assignees: string[];
  tags: string[];
  dueDate: string | null;
  plannedDate: string | null;
  url: string;
  content?: string;
};

export type TasksExportPayload = {
  exportedAt: string;
  count: number;
  tasks: TaskExport[];
};

export function serializeTasksJson(
  tasks: Task[],
  membersById: Map<string, TeamMember>,
  contentByTaskId?: Map<string, string>,
): string {
  const payload: TasksExportPayload = {
    exportedAt: new Date().toISOString(),
    count: tasks.length,
    tasks: tasks.map((t) => taskToExport(t, membersById, contentByTaskId)),
  };
  return JSON.stringify(payload, null, 2);
}

function taskToExport(
  t: Task,
  membersById: Map<string, TeamMember>,
  contentByTaskId?: Map<string, string>,
): TaskExport {
  const base: TaskExport = {
    title: t.title,
    status: t.status,
    priority: t.priority,
    type: t.type,
    assignees: t.assigneeIds.map((id) => membersById.get(id)?.name ?? 'Desconocido'),
    tags: t.tags,
    dueDate: t.dueDate,
    plannedDate: t.plannedDate,
    url: t.url,
  };
  if (contentByTaskId) {
    base.content = contentByTaskId.get(t.id) ?? '';
  }
  return base;
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateEs(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function serializeTasksMarkdown(
  tasks: Task[],
  membersById: Map<string, TeamMember>,
  contentByTaskId?: Map<string, string>,
): string {
  const header = `# ${tasks.length} tareas (exportadas ${todayIsoDate()})`;
  if (tasks.length === 0) return header + '\n';

  const items = tasks.map((t) => formatTaskMarkdown(t, membersById, contentByTaskId));
  return [header, '', ...items].join('\n');
}

function formatTaskMarkdown(
  t: Task,
  membersById: Map<string, TeamMember>,
  contentByTaskId?: Map<string, string>,
): string {
  const meta1: string[] = [];
  if (t.type) meta1.push(t.type);
  if (t.priority) meta1.push(t.priority);
  const due = formatDateEs(t.dueDate);
  if (due) meta1.push(`Due ${due}`);

  const line1Suffix = meta1.length > 0 ? ` · ${meta1.join(' · ')}` : '';
  const line1 = `- [ ] **${t.title}**${line1Suffix}`;

  const assignees = t.assigneeIds.map((id) => membersById.get(id)?.name ?? 'Desconocido');
  const meta2Parts: string[] = [];
  if (assignees.length > 0) meta2Parts.push(`Asignados: ${assignees.join(', ')}`);
  if (t.tags.length > 0) meta2Parts.push(`Tags: ${t.tags.join(', ')}`);
  const line2 = meta2Parts.length > 0 ? `      ${meta2Parts.join(' · ')}` : null;

  const line3 = `      ${t.url}`;

  const content = contentByTaskId?.get(t.id);
  const contentBlock = content && content.trim().length > 0
    ? '\n      ---\n' + content.split('\n').map((l) => `      ${l}`).join('\n')
    : null;

  return [line1, line2, line3, contentBlock].filter(Boolean).join('\n') + '\n';
}

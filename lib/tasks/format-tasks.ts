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
};

export type TasksExportPayload = {
  exportedAt: string;
  count: number;
  tasks: TaskExport[];
};

export function serializeTasksJson(
  tasks: Task[],
  membersById: Map<string, TeamMember>,
): string {
  const payload: TasksExportPayload = {
    exportedAt: new Date().toISOString(),
    count: tasks.length,
    tasks: tasks.map((t) => taskToExport(t, membersById)),
  };
  return JSON.stringify(payload, null, 2);
}

function taskToExport(t: Task, membersById: Map<string, TeamMember>): TaskExport {
  return {
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
}

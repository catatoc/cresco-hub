import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Task, TaskStatus } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import type { Project } from '@/schemas/project';
import { AssigneeStack } from '@/components/kanban/card';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<TaskStatus, { cls: string; label: string }> = {
  Refining: { cls: 'bg-[#f7f7f8] text-muted-foreground', label: 'Refinando' },
  'Not Started': { cls: 'bg-[#f7f7f8] text-[#57575c]', label: 'Por hacer' },
  'In Progress': { cls: 'bg-[#eeeffc] text-[#5e6ad2]', label: 'En progreso' },
  Testing: { cls: 'bg-[#fef9e7] text-[#b58a1f]', label: 'Testing' },
  'In Review': { cls: 'bg-[#faf0db] text-[#c78a2c]', label: 'En revisión' },
  Done: { cls: 'bg-[#e8f5ec] text-[#3f9f5c]', label: 'Hecho' },
  Archived: { cls: 'bg-[#f7f7f8] text-muted-foreground', label: 'Archivado' },
};

const PRIORITY_LABEL: Record<string, string> = { High: 'Alta', Medium: 'Media', Low: 'Baja' };

function fmt(iso: string | null): string | null {
  return iso ? format(parseISO(iso), 'd MMM', { locale: es }) : null;
}

type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
  projectsById: Map<string, Project>;
};

export function UpcomingTaskList({ tasks, membersById, projectsById }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
        Nada planificado para la próxima semana todavía.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {tasks.map((t, i) => {
        const badge = STATUS_BADGE[t.status];
        const assignees = t.assigneeIds
          .map((id) => membersById.get(id))
          .filter((m): m is TeamMember => !!m);
        const project = t.projectId ? projectsById.get(t.projectId) : null;
        const planned = fmt(t.plannedDate);
        const due = fmt(t.dueDate);
        const range = planned && due ? `${planned} → ${due}` : (planned ?? due);

        return (
          <div
            key={t.id}
            className={cn(
              'relative p-3 sm:p-4 hover:bg-[#f7f7f8] transition-colors',
              i < tasks.length - 1 && 'border-b border-border',
            )}
          >
            <Link href={`/tareas/${t.id}`} className="absolute inset-0" aria-label={t.title} />
            <div className="relative flex items-start justify-between gap-3 pointer-events-none">
              <div className="min-w-0">
                <div className="text-[13px] font-medium mb-1.5">{t.title}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span className={cn('px-1.5 py-0.5 rounded font-medium', badge.cls)}>
                    {badge.label}
                  </span>
                  {t.type && (
                    <span className="px-1.5 py-0.5 rounded bg-[#f7f7f8] text-[#57575c]">
                      {t.type}
                    </span>
                  )}
                  {t.priority && (
                    <span className="text-muted-foreground">
                      Prioridad {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                  )}
                  {project && (
                    <span className="text-muted-foreground truncate">· {project.name}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {range && <span className="text-[11px] text-muted-foreground">{range}</span>}
                <AssigneeStack assignees={assignees} size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

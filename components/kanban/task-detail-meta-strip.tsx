import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Calendar, CalendarClock } from 'lucide-react';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { cn } from '@/lib/utils';
import { PRIORITY_LABEL, PriorityBars, TAG_MAP } from './task-detail-shared';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { TeamMember } from '@/schemas/team-member';

function formatShort(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  return format(d, 'd MMM', { locale: es });
}

type Props = {
  task: Task;
  assignees: TeamMember[];
  project?: Project | null;
};

export function TaskDetailMetaStrip({ task, assignees, project }: Props) {
  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  return (
    <div className="lg:hidden border-b border-border bg-[#fafafa] px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 flex-wrap text-[11.5px] text-foreground">
      <TaskStatusPill taskId={task.id} status={task.status} />

      {task.priority && (
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <PriorityBars priority={task.priority} />
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
      )}

      {progressPct !== null && (
        <span className="inline-flex items-center gap-2 text-muted-foreground shrink-0">
          <span className="relative w-16 sm:w-20 h-1.5 rounded-full bg-[#eeeff1] overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-[#5e6ad2]" style={{ width: `${progressPct}%` }} />
          </span>
          {progressPct}%
        </span>
      )}

      {task.dueDate && (
        <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
          <Calendar className="w-3 h-3" />
          {formatShort(task.dueDate)}
        </span>
      )}

      {task.plannedDate && (
        <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
          <CalendarClock className="w-3 h-3" />
          {formatShort(task.plannedDate)}
        </span>
      )}

      {assignees.length > 0 && (
        <span className="inline-flex items-center gap-1 shrink-0">
          {assignees.slice(0, 3).map((m) => (
            <AssigneeAvatar key={m.id} member={m} size={16} />
          ))}
          {assignees.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{assignees.length - 3}</span>
          )}
        </span>
      )}

      {project && (
        <Link
          href={`/proyectos?project=${project.id}`}
          className="inline-flex items-center gap-1 text-[#5e6ad2] hover:underline shrink-0 min-w-0 max-w-[55vw]"
        >
          {project.icon && <span className="shrink-0">{project.icon}</span>}
          <span className="truncate">{project.name}</span>
        </Link>
      )}

      {task.tags.length > 0 && (
        <span className="inline-flex items-center gap-1 flex-wrap min-w-0">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[40vw]',
                TAG_MAP[t] ?? 'bg-[#f7f7f8] text-[#57575c]',
              )}
            >
              {t}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
          )}
        </span>
      )}
    </div>
  );
}

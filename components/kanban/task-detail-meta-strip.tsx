import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { cn } from '@/lib/utils';
import { PRIORITY_LABEL, PriorityBars } from './task-detail-shared';
import type { Task } from '@/schemas/task';
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
};

export function TaskDetailMetaStrip({ task, assignees }: Props) {
  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  return (
    <div className="lg:hidden border-b border-border bg-[#fafafa] px-6 py-3 flex items-center gap-3 flex-wrap text-[11.5px] text-foreground">
      <TaskStatusPill taskId={task.id} status={task.status} />

      {task.priority && (
        <span className="inline-flex items-center gap-1.5">
          <PriorityBars priority={task.priority} />
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
      )}

      {progressPct !== null && (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="relative w-12 h-1 rounded-full bg-[#eeeff1] overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-[#5e6ad2]" style={{ width: `${progressPct}%` }} />
          </span>
          {progressPct}%
        </span>
      )}

      {task.dueDate && (
        <span className={cn('text-muted-foreground')}>
          📅 {formatShort(task.dueDate)}
        </span>
      )}

      {assignees.length > 0 && (
        <span className="inline-flex items-center gap-1">
          {assignees.slice(0, 3).map((m) => (
            <AssigneeAvatar key={m.id} member={m} size={16} />
          ))}
          {assignees.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{assignees.length - 3}</span>
          )}
        </span>
      )}
    </div>
  );
}

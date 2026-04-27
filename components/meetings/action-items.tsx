import Link from 'next/link';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssigneeStack } from '@/components/kanban/card';

function DueCell({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-[11px] text-muted-foreground">—</span>;
  const d = parseISO(dueDate);
  const today = new Date();
  const isToday = isSameDay(d, today);
  const isYesterday = isSameDay(d, subDays(today, 1));
  const isPast = d.getTime() < today.getTime() && !isToday;

  const label = isToday
    ? 'Hoy'
    : isYesterday
      ? 'Ayer'
      : format(d, 'MMM d', { locale: es });

  return (
    <span
      className={cn(
        'text-[11px]',
        isToday && 'text-[#5e6ad2] font-medium',
        isPast && 'text-[#d24949] font-medium',
        !isToday && !isPast && 'text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
};

export function ActionItems({ tasks, membersById }: Props) {
  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {tasks.map((t, i) => {
        const done = t.status === 'Done';
        const assignees = t.assigneeIds
          .map((id) => membersById.get(id))
          .filter((m): m is TeamMember => !!m);
        return (
          <Link
            href={`/tareas/${t.id}`}
            key={t.id}
            className={cn(
              'flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 hover:bg-[#f7f7f8] active:bg-[#eeeffc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              i < tasks.length - 1 && 'border-b border-border',
            )}
          >
            <span
              className={cn(
                'w-3.5 h-3.5 rounded-[3px] border-[1.5px] shrink-0 grid place-items-center',
                done ? 'bg-[#3f9f5c] border-[#3f9f5c] text-white' : 'border-muted-foreground',
              )}
            >
              {done && (
                <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span
              className={cn(
                'text-[13px] flex-1 min-w-0 truncate',
                done && 'line-through text-muted-foreground',
              )}
            >
              {t.title}
            </span>
            {t.type && (
              <span className="hidden sm:inline-flex px-1.5 rounded text-[11px] font-medium bg-[#eeeffc] text-[#5e6ad2] shrink-0">
                {t.type}
              </span>
            )}
            <div className="shrink-0 min-w-[20px]">
              <AssigneeStack assignees={assignees} />
            </div>
            <span className="shrink-0">
              <DueCell dueDate={t.dueDate} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

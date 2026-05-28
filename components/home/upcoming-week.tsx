import Link from 'next/link';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import type { Sprint } from '@/schemas/sprint';
import { cn } from '@/lib/utils';
import { AssigneeStack } from '@/components/kanban/card';

type Props = {
  sprint: Sprint | null;
  tasks: Task[];
  membersById: Map<string, TeamMember>;
};

/**
 * "Próxima semana" — a heads-up of the sprint that comes after the current one,
 * so you can see what's coming before it becomes the active sprint.
 */
export function UpcomingWeek({ sprint, tasks, membersById }: Props) {
  if (!sprint) return null;

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-3 min-w-0">
        <h2 className="text-[13px] font-semibold flex items-baseline gap-2 min-w-0 truncate">
          <span className="shrink-0">Próxima semana</span>
          <span className="text-[12px] font-normal text-muted-foreground truncate hidden sm:inline">
            · {sprint.name}
          </span>
        </h2>
        <Link
          href="/tareas"
          className="shrink-0 text-[12px] text-muted-foreground hover:text-[#5e6ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Ver todas →
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Nada planificado para la próxima semana todavía.
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-white overflow-hidden">
          {tasks.map((t, i) => {
            const assignees = t.assigneeIds
              .map((id) => membersById.get(id))
              .filter((m): m is TeamMember => !!m);
            return (
              <div
                key={t.id}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 sm:px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 hover:bg-[#f7f7f8] active:bg-[#f0f0f1] transition-colors',
                  i < tasks.length - 1 && 'border-b border-border',
                )}
              >
                <Link
                  href={`/tareas/${t.id}`}
                  className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label={t.title}
                />
                <span className="relative w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="relative text-[13px] flex-1 min-w-0 truncate">{t.title}</span>
                <div className="relative shrink-0 min-w-[20px]">
                  <AssigneeStack assignees={assignees} size={20} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

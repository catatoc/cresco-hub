import Link from 'next/link';
import type { Task } from '@/schemas/task';
import { buildWeekDays, taskBarSpan, type BarSpan } from '@/lib/upcoming/week';
import { cn } from '@/lib/utils';

// Bar color by task type, matching the Tasks DB Type colors.
const TYPE_BAR: Record<string, string> = {
  '🏥 Quality': 'bg-[#5e6ad2]',
  '✅ Task': 'bg-[#8a8a91]',
  '📖 Research': 'bg-[#b07d4f]',
  '🐛 Bug': 'bg-[#d97a3a]',
  '🗓️ Meeting': 'bg-[#c78a2c]',
};

const GRID = { gridTemplateColumns: 'minmax(150px, 1.4fr) repeat(7, 1fr)' } as const;

type Props = { weekStart: string; tasks: Task[] };

export function WeekTimeline({ weekStart, tasks }: Props) {
  const days = buildWeekDays(weekStart);
  const rows = tasks
    .map((t) => ({ task: t, bar: taskBarSpan(weekStart, t.plannedDate, t.dueDate) }))
    .filter((r): r is { task: Task; bar: BarSpan } => r.bar !== null);

  return (
    <div className="border border-border rounded-lg bg-white p-3 sm:p-4 overflow-x-auto">
      <div className="min-w-[620px]">
        {/* Day header */}
        <div className="grid" style={GRID}>
          <div />
          {days.map((d) => (
            <div key={d.iso} className={cn('text-center pb-2', d.weekend && 'opacity-50')}>
              <div className="text-[10px] text-muted-foreground">{d.dowLabel}</div>
              <div className="text-[13px] font-medium">{d.dom}</div>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Sin tareas con fecha en esta semana.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rows.map(({ task, bar }) => (
              <div key={task.id} className="grid items-center" style={GRID}>
                <Link
                  href={`/tareas/${task.id}`}
                  className="text-[12px] truncate pr-3 hover:text-[#5e6ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  title={task.title}
                >
                  {task.title}
                </Link>
                <div className="col-span-7 relative h-7">
                  <Link
                    href={`/tareas/${task.id}`}
                    className={cn(
                      'absolute top-1 h-5 rounded-md flex items-center px-2 text-[11px] font-medium text-white truncate',
                      TYPE_BAR[task.type ?? ''] ?? 'bg-[#8a8a91]',
                    )}
                    style={{
                      left: `${(bar.offset / 7) * 100}%`,
                      width: `${(bar.span / 7) * 100}%`,
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

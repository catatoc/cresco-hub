import type { Task } from '@/schemas/task';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * Week stripe for the Kanban "Week" view. Always shows the current ISO week;
 * sprint anchoring is handled at the page level via the sprint selector.
 */
export function WeekStripe({ tasks }: { tasks: Task[] }) {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });

  return (
    <div className="grid grid-cols-7 gap-1 py-2.5 pb-4 border-b border-border mb-3.5">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(start, i);
        const dayTasks = tasks.filter(
          (t) => t.dueDate && isSameDay(new Date(t.dueDate), d),
        );
        const isToday = isSameDay(d, today);
        const isWeekend = i >= 5;

        return (
          <div
            key={i}
            className={cn(
              'p-2 rounded-md bg-[#fafafa] border border-border',
              isToday && 'bg-[#eeeffc] border-[#c9cbe8]',
              isWeekend && 'bg-transparent border-transparent opacity-50',
            )}
          >
            <div className="flex justify-between items-baseline mb-1.5">
              <span
                className={cn(
                  'text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em]',
                  isToday && 'text-[#5e6ad2]',
                )}
              >
                {format(d, 'EEE', { locale: es })}{isToday && ' · Hoy'}
              </span>
              <span className={cn('text-[15px] font-semibold', isToday && 'text-[#5e6ad2]')}>
                {format(d, 'd')}
              </span>
            </div>
            <div className="flex gap-1 items-center h-2">
              {dayTasks.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    t.status === 'Done' && 'bg-[#3f9f5c]',
                    t.status === 'In Progress' && 'bg-[#5e6ad2]',
                    (t.status === 'Not Started' || t.status === 'Refining') && 'bg-[#d1d1d4]',
                  )}
                />
              ))}
              {dayTasks.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto">{dayTasks.length}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

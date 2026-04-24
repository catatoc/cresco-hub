import type { Task } from '@/schemas/task';
import { cycleRange } from '@/lib/cycles';
import { addDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function WeekStripe({ tasks, cycle }: { tasks: Task[]; cycle: string }) {
  const { start } = cycleRange(cycle);
  const today = new Date();

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
                    t.status === 'Hecho' && 'bg-[#3f9f5c]',
                    t.status === 'En progreso' && 'bg-[#5e6ad2]',
                    (t.status === 'Por hacer' || t.status === 'Backlog') && 'bg-[#d1d1d4]',
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

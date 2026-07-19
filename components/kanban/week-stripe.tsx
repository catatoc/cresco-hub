import type { Task } from '@/schemas/task';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { dateLocale } from '@/lib/i18n/date-locale';
import { cn } from '@/lib/utils';

/**
 * Week stripe for the Kanban "Week" view. Always shows the current ISO week;
 * sprint anchoring is handled at the page level via the sprint selector.
 */
export function WeekStripe({ tasks }: { tasks: Task[] }) {
  const t = useTranslations('kanban.weekStripe');
  const locale = useLocale();
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });

  return (
    <div className="flex lg:grid lg:grid-cols-7 gap-1 py-2 sm:py-2.5 pb-3 sm:pb-4 border-b border-border mb-3 sm:mb-3.5 overflow-x-auto -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 lg:overflow-visible snap-x snap-mandatory lg:snap-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              'p-2 rounded-md bg-[#fafafa] border border-border min-w-0 shrink-0 w-[64px] sm:w-[80px] lg:w-auto lg:shrink snap-start',
              isToday && 'bg-[#eeeffc] border-[#c9cbe8]',
              isWeekend && 'bg-transparent border-transparent opacity-50',
            )}
          >
            <div className="flex justify-between items-baseline mb-1.5 gap-1 min-w-0">
              <span
                className={cn(
                  'text-[10px] sm:text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] truncate',
                  isToday && 'text-[#5e6ad2]',
                )}
              >
                {format(d, t('weekdayFormat'), { locale: dateLocale(locale) })}
                {isToday && <span className="hidden sm:inline"> · {t('today')}</span>}
              </span>
              <span
                className={cn(
                  'text-[14px] sm:text-[15px] font-semibold shrink-0',
                  isToday && 'text-[#5e6ad2]',
                )}
              >
                {format(d, 'd')}
              </span>
            </div>
            <div className="flex gap-1 items-center h-2 min-w-0">
              {dayTasks.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    t.status === 'Done' && 'bg-[#3f9f5c]',
                    t.status === 'In Progress' && 'bg-[#5e6ad2]',
                    (t.status === 'Not Started' || t.status === 'Refining') && 'bg-[#d1d1d4]',
                  )}
                />
              ))}
              {dayTasks.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {dayTasks.length}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

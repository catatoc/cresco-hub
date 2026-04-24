import Link from 'next/link';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

function DueCell({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-[11px] text-muted-foreground">—</span>;
  const d = parseISO(dueDate);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const isPast = d.getTime() < today.getTime() && !isToday;
  return (
    <span
      className={cn(
        'text-[11px]',
        isToday && 'text-[#5e6ad2] font-medium',
        isPast && 'text-[#d24949] font-medium',
        !isToday && !isPast && 'text-muted-foreground',
      )}
    >
      {isToday ? 'Hoy' : isPast ? 'Ayer' : format(d, 'MMM d', { locale: es })}
    </span>
  );
}

export function ActionItems({ tasks }: { tasks: Task[] }) {
  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {tasks.map((t, i) => {
        const done = t.status === 'Hecho';
        return (
          <Link
            href={`/tareas/${t.id}`}
            key={t.id}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#f7f7f8]',
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
                'text-[13px] flex-1 truncate',
                done && 'line-through text-muted-foreground',
              )}
            >
              {t.title}
            </span>
            {t.number && (
              <span className="px-1.5 rounded text-[11px] font-medium bg-[#eeeffc] text-[#5e6ad2]">
                {t.number}
              </span>
            )}
            <div className="w-[18px] h-[18px] rounded-full bg-[#6da88e] text-white text-[9px] font-semibold grid place-items-center">
              DL
            </div>
            <DueCell dueDate={t.dueDate} />
          </Link>
        );
      })}
    </div>
  );
}

import Link from 'next/link';
import { format, parseISO, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';
import { cn } from '@/lib/utils';

type Props = { meetings: Meeting[]; currentId?: string };

export function HistoryPanel({ meetings, currentId }: Props) {
  return (
    <aside className="border-l border-border bg-[#f7f7f8] overflow-auto p-5">
      <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-[0.04em] mb-3 px-1.5">
        Historial
      </h3>
      {meetings.map((m) => {
        const active = m.id === currentId;
        const d = m.date ? parseISO(m.date) : null;
        const week = d ? getISOWeek(d) : null;

        return (
          <Link
            key={m.id}
            href={`/reuniones/${m.id}`}
            className={cn(
              'block p-3 rounded-md cursor-pointer mb-1 border border-transparent hover:bg-white hover:border-border transition-colors',
              active && 'bg-white border-[#c9cbe8] shadow-sm',
            )}
          >
            <div
              className={cn(
                'text-[11px] uppercase font-medium tracking-[0.03em] mb-1',
                active ? 'text-[#5e6ad2]' : 'text-muted-foreground',
              )}
            >
              {d && format(d, 'MMM d', { locale: es })}
              {week && ` · Sem ${week}`}
            </div>
            <div className="text-[12px] font-medium leading-snug">{m.title}</div>
          </Link>
        );
      })}

      {meetings.length === 0 && (
        <div className="text-[12px] text-muted-foreground text-center p-4">
          Sin reuniones aún.
        </div>
      )}
    </aside>
  );
}

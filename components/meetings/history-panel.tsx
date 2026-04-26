import Link from 'next/link';
import { format, parseISO, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';
import { cn } from '@/lib/utils';

type Props = { meetings: Meeting[]; currentId?: string };

type MonthGroup = { key: string; label: string; meetings: Meeting[] };

function groupByMonth(meetings: Meeting[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const m of meetings) {
    if (!m.date) continue;
    const d = parseISO(m.date);
    const key = format(d, 'yyyy-MM');
    const label = format(d, 'MMMM yyyy', { locale: es }).toUpperCase();
    if (!groups.has(key)) groups.set(key, { key, label, meetings: [] });
    groups.get(key)!.meetings.push(m);
  }
  return Array.from(groups.values());
}

export function HistoryPanel({ meetings, currentId }: Props) {
  const groups = groupByMonth(meetings);

  return (
    <aside className="border-l border-border bg-[#f7f7f8] overflow-auto">
      <div className="p-5 pb-4">
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-[0.04em] px-1">
          Historial
        </h3>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="px-5 pb-3">
          <h4 className="sticky top-0 z-10 bg-[#f7f7f8] text-[10px] font-bold tracking-[0.05em] text-muted-foreground py-2 mb-1.5 border-b border-border">
            {g.label}
          </h4>

          {g.meetings.map((m) => {
            const active = m.id === currentId;
            const d = m.date ? parseISO(m.date) : null;
            const week = d ? getISOWeek(d) : null;

            return (
              <Link
                key={m.id}
                href={`/reuniones/${m.id}`}
                className={cn(
                  'block py-2 pl-3 pr-1 mb-2 border-l-2 transition-colors hover:bg-white/60 rounded-r-sm',
                  active ? 'border-[#5e6ad2] bg-white/40' : 'border-[#e5e5e5]',
                )}
              >
                <div
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-[0.04em]',
                    active ? 'text-[#5e6ad2]' : 'text-muted-foreground',
                  )}
                >
                  {d && format(d, 'MMM d', { locale: es })}
                  {week && ` · Sem ${week}`}
                </div>
                <div className={cn('text-[12px] leading-snug mt-0.5', active ? 'font-semibold' : 'font-medium')}>
                  {m.title}
                </div>
                {m.summary && (
                  <p
                    className={cn(
                      'text-[11px] leading-[1.5] mt-1 line-clamp-3',
                      active ? 'text-[#555]' : 'text-[#888]',
                    )}
                  >
                    {m.summary}
                  </p>
                )}
              </Link>
            );
          })}
        </section>
      ))}

      {groups.length === 0 && (
        <div className="text-[12px] text-muted-foreground text-center p-4">Sin reuniones aún.</div>
      )}
    </aside>
  );
}

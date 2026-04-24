import { format } from 'date-fns';
import type { Meeting } from '@/schemas/meeting';

type Props = {
  stats: { inProgress: number; todo: number; done: number; total: number };
  upcomingMeeting: Meeting | null;
  overdueCount?: number;
};

function Stat({ label, value, unit, sub, subClass }: { label: string; value: React.ReactNode; unit?: string; sub?: string; subClass?: string }) {
  return (
    <div className="bg-[#f7f7f8] border border-border rounded-lg px-4 py-3.5">
      <div className="text-[11px] uppercase font-medium tracking-[0.03em] text-muted-foreground mb-1.5">{label}</div>
      <div className="text-[22px] font-semibold tracking-[-0.01em]">
        {value}
        {unit && <span className="text-[13px] text-muted-foreground font-medium ml-1">{unit}</span>}
      </div>
      {sub && <div className={`text-[11px] mt-1 ${subClass ?? 'text-muted-foreground'}`}>{sub}</div>}
    </div>
  );
}

function formatAmPm(d: Date): string {
  return format(d, 'h:mmaaa').replace(/\s/g, '');
}

export function StatsStrip({ stats, upcomingMeeting, overdueCount = 0 }: Props) {
  const meetingLabel = (() => {
    if (!upcomingMeeting?.date) return 'Sin próximas';
    const d = new Date(upcomingMeeting.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sameDay = d.toDateString() === today.toDateString();
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    if (sameDay) return `Hoy ${formatAmPm(d)}`;
    if (isTomorrow) return `Mañana ${formatAmPm(d)}`;
    return format(d, 'd MMM');
  })();

  return (
    <div className="grid grid-cols-4 gap-2 mb-8">
      <Stat label="En progreso" value={stats.inProgress} sub="tareas activas" />
      <Stat
        label="Por hacer"
        value={stats.todo}
        sub={overdueCount > 0 ? `${overdueCount} atrasada${overdueCount === 1 ? '' : 's'}` : undefined}
        subClass={overdueCount > 0 ? 'text-[#d24949]' : undefined}
      />
      <Stat
        label="Completadas"
        value={stats.done}
        unit={`/${stats.total}`}
        sub="↑ esta semana"
        subClass="text-[#3f9f5c]"
      />
      <Stat
        label="Próxima reunión"
        value={<span className="text-[16px] leading-none">{meetingLabel}</span>}
        sub={upcomingMeeting?.title ?? undefined}
      />
    </div>
  );
}

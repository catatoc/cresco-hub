import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';

type Props = {
  stats: { inProgress: number; todo: number; done: number; total: number };
  lastMeeting: Meeting | null;
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

export function StatsStrip({ stats, lastMeeting, overdueCount = 0 }: Props) {
  const meetingLabel = (() => {
    if (!lastMeeting) return 'Sin reuniones';
    const d = parseISO(lastMeeting.createdTime);
    const today = new Date();
    const diffDays = differenceInCalendarDays(today, d);

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return format(d, 'd MMM', { locale: es });
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
        label="Última reunión"
        value={<span className="text-[16px] leading-none">{meetingLabel}</span>}
        sub={lastMeeting?.title ?? undefined}
      />
    </div>
  );
}

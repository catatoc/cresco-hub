import { Calendar, User, Users } from 'lucide-react';

type Props = {
  startDate: string | null;
  endDate: string | null;
  ownerName: string | null;
  teamCount: number;
};

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function ProjectMetaRow({ startDate, endDate, ownerName, teamCount }: Props) {
  const hasDates = startDate || endDate;
  const dateLabel = startDate && endDate
    ? `${fmt(startDate)} – ${fmt(endDate)}`
    : endDate
      ? `Vence ${fmt(endDate)}`
      : startDate
        ? `Inicia ${fmt(startDate)}`
        : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground mb-4">
      {dateLabel && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {dateLabel}
        </span>
      )}
      {ownerName && (
        <>
          {hasDates && <span className="text-border">·</span>}
          <span className="inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Owner: <span className="text-foreground font-medium">{ownerName}</span>
          </span>
        </>
      )}
      {teamCount > 0 && (
        <>
          {(hasDates || ownerName) && <span className="text-border">·</span>}
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {teamCount} {teamCount === 1 ? 'persona' : 'personas'}
          </span>
        </>
      )}
    </div>
  );
}

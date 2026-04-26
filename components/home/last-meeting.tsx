import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';
import Link from 'next/link';

export function LastMeeting({ meeting }: { meeting: Meeting | null }) {
  if (!meeting) {
    return (
      <div>
        <h2 className="text-[13px] font-semibold mb-3">Última reunión</h2>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Aún no hay reuniones registradas.
        </div>
      </div>
    );
  }

  const d = parseISO(meeting.createdTime);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold">Última reunión</h2>
        <Link href="/reuniones" className="text-[12px] text-muted-foreground hover:text-[#5e6ad2]">
          Ver todas →
        </Link>
      </div>
      <Link
        href={`/reuniones/${meeting.id}`}
        className="block border border-border rounded-lg p-4 bg-gradient-to-b from-[#fdfdfd] to-[#f7f7f8] hover:border-[#c9cbe8] transition-colors"
      >
        <div className="flex items-baseline gap-2 mb-2.5">
          <div className="text-2xl font-semibold tracking-[-0.01em]">{format(d, 'd')}</div>
          <div className="text-[12px] uppercase text-muted-foreground tracking-[0.04em] font-medium">
            {format(d, 'MMM · EEE', { locale: es })}
          </div>
        </div>
        <div className="text-[15px] font-medium mb-1.5">{meeting.title}</div>
        {meeting.summary && (
          <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">
            {meeting.summary}
          </p>
        )}
        {meeting.meetingType && (
          <div className="text-[12px] text-muted-foreground flex items-center gap-2">
            <span>{meeting.meetingType}</span>
          </div>
        )}
      </Link>
    </div>
  );
}

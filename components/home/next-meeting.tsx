import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Video } from 'lucide-react';
import type { Meeting } from '@/schemas/meeting';
import Link from 'next/link';

export function NextMeeting({ meeting }: { meeting: Meeting | null }) {
  if (!meeting) {
    return (
      <div>
        <h2 className="text-[13px] font-semibold mb-3">Próxima reunión</h2>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin reuniones próximas.
        </div>
      </div>
    );
  }

  const d = meeting.date ? parseISO(meeting.date) : null;
  const endD = meeting.endDate ? parseISO(meeting.endDate) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold">Próxima reunión</h2>
        <Link href="/reuniones" className="text-[12px] text-muted-foreground hover:text-[#5e6ad2]">
          Ver todas →
        </Link>
      </div>
      <div className="border border-border rounded-lg p-4 bg-gradient-to-b from-[#fdfdfd] to-[#f7f7f8]">
        {d && (
          <div className="flex items-baseline gap-2 mb-2.5">
            <div className="text-2xl font-semibold tracking-[-0.01em]">{format(d, 'd')}</div>
            <div className="text-[12px] uppercase text-muted-foreground tracking-[0.04em] font-medium">
              {format(d, 'MMM · EEE', { locale: es })}
            </div>
            <div className="ml-auto text-[12px] text-[#57575c] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#3f9f5c] rounded-full shadow-[0_0_0_3px_#e8f5ec]" />
              {format(d, 'HH:mm')}{endD ? ` — ${format(endD, 'HH:mm')}` : ''}
            </div>
          </div>
        )}
        <div className="text-[15px] font-medium mb-1.5">{meeting.title}</div>
        <div className="text-[12px] text-muted-foreground flex items-center gap-2">
          {meeting.meetUrl && (<><Video className="w-3.5 h-3.5" /> Google Meet<span>·</span></>)}
          {meeting.recurrence && <span>{meeting.recurrence}</span>}
        </div>
        <div className="mt-3.5 pt-3 border-t border-dashed border-border flex gap-2">
          {meeting.meetUrl && (
            <a href={meeting.meetUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-[#5e6ad2] text-white hover:bg-[#525db9]">
              Unirse
            </a>
          )}
          <a href={meeting.url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-md text-[12px] font-medium border border-border bg-white hover:bg-[#f7f7f8]">
            Ver agenda
          </a>
        </div>
      </div>
    </div>
  );
}

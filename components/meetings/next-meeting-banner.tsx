import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';

type Props = { nextMeeting: Meeting };

export function NextMeetingBanner({ nextMeeting }: Props) {
  if (!nextMeeting.date) return null;
  const d = parseISO(nextMeeting.date);
  const time = format(d, 'h:mmaaa', { locale: es }).replace(/\s/g, '');
  const dayRaw = format(d, "EEEE d 'de' MMMM", { locale: es });
  const day = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1);

  return (
    <Link
      href={`/reuniones/${nextMeeting.id}`}
      aria-label={`Ver próxima reunión: ${day} a las ${time}`}
      className="flex items-center justify-between gap-3 px-3.5 py-2 mb-5 rounded-md border border-[#c7e6d2] bg-[#eef9f1] text-[#2c5d3f] hover:bg-[#e3f3e7] transition-colors"
    >
      <span className="text-[11.5px] leading-tight">
        <strong className="font-semibold">Próxima reunión</strong>
        <span className="mx-1.5 opacity-60">·</span>
        <span>{day}</span>
        <span className="mx-1.5 opacity-60">·</span>
        {time}
      </span>
      <span className="text-[11px] font-semibold text-[#3f9f5c]" aria-hidden="true">Ver →</span>
    </Link>
  );
}

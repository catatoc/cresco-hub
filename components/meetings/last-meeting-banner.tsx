import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';

type Props = { lastMeeting: Meeting | null };

export function LastMeetingBanner({ lastMeeting }: Props) {
  if (!lastMeeting) return null;
  const d = parseISO(lastMeeting.createdTime);
  const dayRaw = format(d, "EEEE d 'de' MMMM", { locale: es });
  const day = dayRaw.charAt(0).toUpperCase() + dayRaw.slice(1);

  return (
    <Link
      href={`/reuniones/${lastMeeting.id}`}
      aria-label={`Ver reunión anterior: ${lastMeeting.title}, ${day}`}
      className="flex items-center justify-between gap-3 px-3.5 py-2 mb-5 rounded-md border border-[#dfe1f2] bg-[#f6f7fc] text-[#3a3f6b] hover:bg-[#eeeffc] transition-colors"
    >
      <span className="text-[11.5px] leading-tight">
        <strong className="font-semibold">Última reunión</strong>
        <span className="mx-1.5 opacity-60">·</span>
        <span>{day}</span>
        <span className="mx-1.5 opacity-60">·</span>
        <span className="opacity-80">{lastMeeting.title}</span>
      </span>
      <span className="text-[11px] font-semibold text-[#5e6ad2]" aria-hidden="true">Ver anterior →</span>
    </Link>
  );
}

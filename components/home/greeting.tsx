import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';

type Props = {
  name: string;
  stats: { inProgress: number; todo: number; done: number; total: number };
  upcomingMeeting: Meeting | null;
};

export function Greeting({ name, stats, upcomingMeeting }: Props) {
  const now = new Date();
  const h = now.getHours();
  const salute = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = name.split(' ')[0];

  const todayMeetings = upcomingMeeting && upcomingMeeting.date
    ? (new Date(upcomingMeeting.date).toDateString() === now.toDateString() ? 1 : 0)
    : 0;

  const statusLine = [
    stats.inProgress > 0 && `${stats.inProgress} tareas activas`,
    todayMeetings === 1 && `1 reunión hoy`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="mb-8">
      <div className="text-[13px] text-muted-foreground mb-1.5 tracking-[0.01em]">
        {format(now, "EEEE · d 'de' MMMM · yyyy", { locale: es })}
      </div>
      <h1 className="text-2xl font-semibold tracking-[-0.01em] mb-1.5">
        {salute}, {firstName} 👋
      </h1>
      {statusLine && <p className="text-sm text-[#57575c]">{statusLine}.</p>}
    </div>
  );
}

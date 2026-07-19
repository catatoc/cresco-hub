import { format, parseISO } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { dateLocale } from '@/lib/i18n/date-locale';
import type { Meeting } from '@/schemas/meeting';

type Props = {
  name: string;
  stats: { inProgress: number; todo: number; done: number; total: number };
  lastMeeting: Meeting | null;
};

export function Greeting({ name, stats, lastMeeting }: Props) {
  const t = useTranslations('home.greeting');
  const locale = useLocale();
  const now = new Date();
  const h = now.getHours();
  const salute = h < 12 ? t('morning') : h < 19 ? t('afternoon') : t('evening');
  const firstName = name.split(' ')[0];

  const isToday = lastMeeting
    ? parseISO(lastMeeting.createdTime).toDateString() === now.toDateString()
    : false;

  const statusLine = [
    stats.inProgress > 0 && t('activeTasks', { count: stats.inProgress }),
    isToday && t('meetingToday'),
  ].filter(Boolean).join(' · ');

  return (
    <div className="mb-6 sm:mb-8">
      <div className="text-[13px] text-muted-foreground mb-1.5 tracking-[0.01em] truncate">
        {format(now, t('dateFormat'), { locale: dateLocale(locale) })}
      </div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.01em] mb-1.5 break-words">
        {salute}, {firstName}
        <span aria-hidden className="whitespace-nowrap"> 👋</span>
      </h1>
      {statusLine && <p className="text-sm text-[#57575c]">{statusLine}.</p>}
    </div>
  );
}

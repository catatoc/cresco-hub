import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { dateLocale } from '@/lib/i18n/date-locale';
import type { Meeting } from '@/schemas/meeting';

type Props = {
  stats: { inProgress: number; todo: number; done: number; total: number };
  lastMeeting: Meeting | null;
  overdueCount?: number;
};

function Stat({ label, value, unit, sub, subClass }: { label: string; value: React.ReactNode; unit?: string; sub?: string; subClass?: string }) {
  return (
    <div className="bg-[#f7f7f8] border border-border rounded-lg px-3 py-3 sm:px-4 sm:py-3.5 min-w-0">
      <div className="text-[11px] uppercase font-medium tracking-[0.03em] text-muted-foreground mb-1.5 truncate">{label}</div>
      <div className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] leading-[1.1] truncate">
        {value}
        {unit && <span className="text-[13px] text-muted-foreground font-medium ml-1">{unit}</span>}
      </div>
      {sub && (
        <div className={`text-[11px] mt-1 truncate ${subClass ?? 'text-muted-foreground'}`} title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function StatsStrip({ stats, lastMeeting, overdueCount = 0 }: Props) {
  const t = useTranslations('home.stats');
  const locale = useLocale();
  const meetingLabel = (() => {
    if (!lastMeeting) return t('noMeetings');
    const d = parseISO(lastMeeting.createdTime);
    const today = new Date();
    const diffDays = differenceInCalendarDays(today, d);

    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
    return format(d, t('dateFormat'), { locale: dateLocale(locale) });
  })();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 mb-6 sm:mb-8">
      <Stat label={t('inProgress')} value={stats.inProgress} sub={t('activeTasks')} />
      <Stat
        label={t('todo')}
        value={stats.todo}
        sub={overdueCount > 0 ? t('overdue', { count: overdueCount }) : undefined}
        subClass={overdueCount > 0 ? 'text-[#d24949]' : undefined}
      />
      <Stat
        label={t('done')}
        value={stats.done}
        unit={`/${stats.total}`}
        sub={t('thisWeek')}
        subClass="text-[#3f9f5c]"
      />
      <Stat
        label={t('lastMeeting')}
        value={<span className="text-[15px] sm:text-[16px]">{meetingLabel}</span>}
        sub={lastMeeting?.title ?? undefined}
      />
    </div>
  );
}

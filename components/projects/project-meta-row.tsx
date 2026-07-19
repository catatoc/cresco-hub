import { Calendar, User, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

type Props = {
  startDate: string | null;
  endDate: string | null;
  ownerName: string | null;
  teamCount: number;
};

function fmt(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function ProjectMetaRow({ startDate, endDate, ownerName, teamCount }: Props) {
  const t = useTranslations('projects.metaRow');
  const locale = useLocale();
  const hasDates = startDate || endDate;
  const dateLabel = startDate && endDate
    ? `${fmt(startDate, locale)} – ${fmt(endDate, locale)}`
    : endDate
      ? t('due', { date: fmt(endDate, locale) })
      : startDate
        ? t('starts', { date: fmt(startDate, locale) })
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
            {t('owner')} <span className="text-foreground font-medium">{ownerName}</span>
          </span>
        </>
      )}
      {teamCount > 0 && (
        <>
          {(hasDates || ownerName) && <span className="text-border">·</span>}
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {t('people', { count: teamCount })}
          </span>
        </>
      )}
    </div>
  );
}

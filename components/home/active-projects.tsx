import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { TeamMember } from '@/schemas/team-member';
import type { HomeProject } from '@/lib/home/queries';
import { AssigneeStack } from '@/components/kanban/card';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<
  string,
  { pill: string; bar: string }
> = {
  'In Progress': {
    pill: 'bg-[#eff6ff] text-[#3a5fcc]',
    bar: 'bg-gradient-to-r from-[#3a5fcc] to-[#5e6ad2]',
  },
  Planning: {
    pill: 'bg-[#eeeffc] text-[#5e6ad2]',
    bar: 'bg-gradient-to-r from-[#5e6ad2] to-[#818bdb]',
  },
  Paused: {
    pill: 'bg-[#faf0db] text-[#c78a2c]',
    bar: 'bg-gradient-to-r from-[#c78a2c] to-[#d9a558]',
  },
};

function formatEndDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

type Props = {
  projects: HomeProject[];
  membersById: Map<string, TeamMember>;
};

export function ActiveProjects({ projects, membersById }: Props) {
  const t = useTranslations('home.activeProjects');
  const locale = useLocale();

  const buildMeta = (p: HomeProject): string | null => {
    const parts: string[] = [];
    if (p.openTaskCount > 0) {
      parts.push(t('openTasks', { count: p.openTaskCount }));
    }
    const end = formatEndDate(p.endDate, locale);
    if (end) parts.push(t('delivery', { date: end }));
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  if (projects.length === 0) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline justify-between gap-3 mb-3 min-w-0">
          <h2 className="text-[13px] font-semibold truncate">{t('title')}</h2>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-3 min-w-0">
        <h2 className="text-[13px] font-semibold truncate">
          {t('title')}{' '}
          <span className="text-[12px] font-normal text-muted-foreground">· {projects.length}</span>
        </h2>
        <Link
          href="/proyectos"
          className="shrink-0 text-[12px] text-muted-foreground hover:text-[#5e6ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {t('seeAll')}
        </Link>
      </div>

      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="hidden md:grid grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5 items-center px-4 py-2.5 bg-[#fbfbfc] border-b border-border text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium">
          <span />
          <span>{t('colProject')}</span>
          <span>{t('colStatus')}</span>
          <span>{t('colProgress')}</span>
          <span className="text-right">%</span>
          <span>{t('colTeam')}</span>
          <span />
        </div>

        {projects.map((p, i) => {
          const styles = (p.status && STATUS_STYLES[p.status]) ?? STATUS_STYLES['In Progress']!;
          const pct = typeof p.completion === 'number' ? Math.round(p.completion * 100) : null;
          const meta = buildMeta(p);
          const assignees = p.teamIds
            .map((id) => membersById.get(id))
            .filter((m): m is TeamMember => !!m);
          const isLast = i >= projects.length - 1;

          return (
            <div key={p.id} className={cn(!isLast && 'border-b border-border')}>
              {/* Mobile: stacked card */}
              <Link
                href={`/proyectos/${p.id}`}
                className="md:hidden flex flex-col gap-2 px-3 py-3 min-h-[64px] hover:bg-[#f7f7f8] active:bg-[#f0f0f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-[22px] h-[22px] rounded-md grid place-items-center text-[13px] bg-[#eeeffc] text-[#5e6ad2] shrink-0">
                    {p.icon ?? <FolderKanban className="w-3.5 h-3.5" />}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      p.recentlyActive
                        ? 'bg-[#3f9f5c] animate-home-pulse'
                        : 'bg-[#a0a0a8]',
                    )}
                  />
                  <span className="truncate text-[13px] font-medium flex-1 min-w-0">{p.name}</span>
                  <span
                    className={cn(
                      'shrink-0 text-[11px] font-medium rounded-full px-2 py-[2px]',
                      styles.pill,
                    )}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-[5px] flex-1 bg-[#f7f7f8] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', styles.bar)}
                      style={{ width: pct !== null ? `${pct}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[11px] font-medium tabular-nums w-9 text-right shrink-0">
                    {pct !== null ? `${pct}%` : ''}
                  </span>
                  <div className="shrink-0 min-w-[20px]">
                    <AssigneeStack assignees={assignees} size={20} />
                  </div>
                </div>
                {meta && (
                  <div className="text-[11px] text-muted-foreground truncate">{meta}</div>
                )}
              </Link>

              {/* md+: original 7-col grid */}
              <Link
                href={`/proyectos/${p.id}`}
                className="group hidden md:grid grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5 items-center px-4 py-3 hover:bg-[#f7f7f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset transition-colors"
              >
                <span className="w-[22px] h-[22px] rounded-md grid place-items-center text-[13px] bg-[#eeeffc] text-[#5e6ad2]">
                  {p.icon ?? <FolderKanban className="w-3.5 h-3.5" />}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13px] font-medium">
                    <span
                      aria-hidden
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        p.recentlyActive
                          ? 'bg-[#3f9f5c] animate-home-pulse'
                          : 'bg-[#a0a0a8] shadow-[0_0_0_3px_#f7f7f8]',
                      )}
                    />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {meta && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{meta}</div>
                  )}
                </div>

                <span
                  className={cn(
                    'inline-block text-[11px] font-medium rounded-full px-2 py-[2px] w-fit',
                    styles.pill,
                  )}
                >
                  {p.status}
                </span>

                <div className="h-[5px] bg-[#f7f7f8] rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', styles.bar)}
                    style={{ width: pct !== null ? `${pct}%` : '0%' }}
                  />
                </div>

                <span className="text-right text-[12px] font-medium tabular-nums">
                  {pct !== null ? `${pct}%` : ''}
                </span>

                <span className="shrink-0 min-w-[20px]">
                  <AssigneeStack assignees={assignees} size={20} />
                </span>

                <span className="text-[14px] text-muted-foreground/60 motion-safe:group-hover:text-muted-foreground motion-safe:group-hover:translate-x-0.5 transition-all text-right">
                  →
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

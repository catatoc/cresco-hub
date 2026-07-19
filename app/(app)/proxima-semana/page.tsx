import { cookies } from 'next/headers';
import { format, parseISO } from 'date-fns';
import { getLocale, getTranslations } from 'next-intl/server';
import { dateLocale } from '@/lib/i18n/date-locale';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { getUpcomingSprint } from '@/lib/notion/sprints';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import { WeekTimeline } from '@/components/upcoming/week-timeline';
import { UpcomingTaskList } from '@/components/upcoming/upcoming-task-list';
import { ScopePill } from '@/components/common/scope-pill';
import { PageEnter } from '@/components/motion/page-enter';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ scope?: string }>;

function fmtRange(
  start: string | null,
  end: string | null,
  locale: string,
  pattern: string,
): string | null {
  if (!start && !end) return null;
  const dfLocale = dateLocale(locale);
  const s = start ? format(parseISO(start), pattern, { locale: dfLocale }) : '—';
  const e = end ? format(parseISO(end), pattern, { locale: dfLocale }) : '—';
  return `${s} → ${e}`;
}

export default async function ProximaSemanaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const t = await getTranslations('upcoming');
  const locale = await getLocale();
  const sp = await searchParams;
  const cookieStore = await cookies();
  const scope = resolveScope(
    'proxima-semana',
    sp.scope,
    cookieStore.get(SCOPE_COOKIE['proxima-semana'])?.value,
  );

  const sprint = await getUpcomingSprint();

  if (!sprint) {
    return (
      <PageEnter className="flex flex-col h-full overflow-hidden">
        <Topbar crumbs={[{ label: t('page.crumb') }]} />
        <div className="flex-1 grid place-items-center px-6">
          <p className="text-sm text-muted-foreground text-center">
            {t('page.empty')}
          </p>
        </div>
      </PageEnter>
    );
  }

  const [allTasks, projects] = await Promise.all([
    queryTasksByCustomerAndSprint(ctx.customerId, sprint.id),
    queryProjectsByCustomer(ctx.customerId),
  ]);

  const active = allTasks.filter((t) => t.status !== 'Archived');
  const myTasks = active.filter((t) => t.assigneeIds.includes(ctx.memberId));
  const visibleTasks = scope === 'mine' ? myTasks : active;

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const memberIds = Array.from(new Set(visibleTasks.flatMap((t) => t.assigneeIds)));
  const members = await getTeamMembers(memberIds);
  const membersById = new Map(members.map((m) => [m.id, m]));

  const dates = fmtRange(sprint.startDate, sprint.endDate, locale, t('page.dateFormat'));

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: t('page.crumb') }, { label: sprint.name, muted: true }]}>
        <ScopePill
          scopeKey="proxima-semana"
          scope={scope}
          myCount={myTasks.length}
          teamCount={active.length}
          redirectPath="/proxima-semana"
          labels={{ mine: t('scope.mine'), team: t('scope.team') }}
        />
      </Topbar>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 max-w-[1100px] mx-auto w-full">
          <div className="mb-5">
            <h1 className="text-[18px] font-semibold">{sprint.name}</h1>
            {dates && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {dates} · {t('page.tasksCount', { count: visibleTasks.length })}
              </p>
            )}
          </div>

          {sprint.startDate && (
            <div className="mb-7">
              <WeekTimeline weekStart={sprint.startDate} tasks={visibleTasks} />
            </div>
          )}

          <h2 className="text-[13px] font-semibold mb-3">{t('page.detail')}</h2>
          <UpcomingTaskList
            tasks={visibleTasks}
            membersById={membersById}
            projectsById={projectsById}
          />
        </div>
      </div>
    </PageEnter>
  );
}

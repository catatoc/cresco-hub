import { cookies } from 'next/headers';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { getHomeData } from '@/lib/home/queries';
import { getCurrentSprint } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { Greeting } from '@/components/home/greeting';
import { StatsStrip } from '@/components/home/stats-strip';
import { MyTasks } from '@/components/home/my-tasks';
import { UpcomingWeek } from '@/components/home/upcoming-week';
import { LastMeeting } from '@/components/home/last-meeting';
import { WikiRecents } from '@/components/home/wiki-recents';
import { ActiveProjects } from '@/components/home/active-projects';
import { ScopePill } from '@/components/common/scope-pill';
import { PageEnter } from '@/components/motion/page-enter';
import type { Task } from '@/schemas/task';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ scope?: string }>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const cookieStore = await cookies();
  const scope = resolveScope('home', sp.scope, cookieStore.get(SCOPE_COOKIE.home)?.value);
  const sprint = await getCurrentSprint();
  const data = await getHomeData(
    ctx.customerId,
    sprint?.id ?? null,
    scope === 'mine' ? ctx.memberId : null,
  );

  // counts feed the pill — UX hint, not exact across modes.
  const myCount =
    scope === 'mine'
      ? data.stats.total
      : data.tasks.filter((t) => t.assigneeIds.includes(ctx.memberId)).length;
  const teamCount = scope === 'team' ? data.stats.total : data.tasks.length;

  const memberIds = Array.from(
    new Set([
      ...data.myTasksToday.flatMap((t: Task) => t.assigneeIds),
      ...data.upcomingTasks.flatMap((t: Task) => t.assigneeIds),
      ...data.activeProjects.flatMap((p) => p.teamIds),
    ]),
  );
  const members = await getTeamMembers(memberIds);
  const membersById = new Map(members.map((m) => [m.id, m]));
  const projectsById = new Map(data.projects.map((p) => [p.id, p]));

  const overdue = data.tasks.filter(
    (t: Task) =>
      t.status !== 'Done' &&
      t.status !== 'Archived' &&
      t.dueDate &&
      new Date(t.dueDate).getTime() < Date.now() &&
      new Date(t.dueDate).toDateString() !== new Date().toDateString(),
  ).length;

  const sprintLabel = sprint?.name ?? 'Sin sprint activo';

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: 'Home' }]}>
        <ScopePill
          scopeKey="home"
          scope={scope}
          myCount={myCount}
          teamCount={teamCount}
          redirectPath="/"
        />
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white max-w-[55vw] truncate">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="truncate">{sprintLabel}</span>
        </span>
      </Topbar>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 max-w-[980px] mx-auto w-full">
          <Greeting name={ctx.memberName} stats={data.stats} lastMeeting={data.lastMeeting} />
          <StatsStrip stats={data.stats} lastMeeting={data.lastMeeting} overdueCount={overdue} />
          <MyTasks tasks={data.myTasksToday} membersById={membersById} projectsById={projectsById} />
          <UpcomingWeek sprint={data.upcomingSprint} tasks={data.upcomingTasks} membersById={membersById} />
          <ActiveProjects projects={data.activeProjects} membersById={membersById} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <LastMeeting meeting={data.lastMeeting} />
            <WikiRecents pages={data.recentWiki} />
          </div>
        </div>
      </div>
    </PageEnter>
  );
}

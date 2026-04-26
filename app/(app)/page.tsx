import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { getHomeData } from '@/lib/home/queries';
import { getCurrentSprint } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { Greeting } from '@/components/home/greeting';
import { StatsStrip } from '@/components/home/stats-strip';
import { MyTasks } from '@/components/home/my-tasks';
import { LastMeeting } from '@/components/home/last-meeting';
import { WikiRecents } from '@/components/home/wiki-recents';
import { ActiveProjects } from '@/components/home/active-projects';
import type { Task } from '@/schemas/task';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await requireContext();
  const sprint = await getCurrentSprint();
  const data = await getHomeData(ctx.customerId, sprint?.id ?? null);

  const memberIds = Array.from(
    new Set([
      ...data.myTasksToday.flatMap((t: Task) => t.assigneeIds),
      ...data.activeProjects.flatMap((p) => p.teamIds),
    ]),
  );
  const members = await getTeamMembers(memberIds);
  const membersById = new Map(members.map((m) => [m.id, m]));

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
    <>
      <Topbar crumbs={[{ label: 'Home' }]}>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white">
          <Clock className="w-3 h-3" />
          {sprintLabel}
        </span>
      </Topbar>

      <div className="flex-1 overflow-auto px-10 py-10 max-w-[980px] mx-auto w-full">
        <Greeting name={ctx.memberName} stats={data.stats} lastMeeting={data.lastMeeting} />
        <StatsStrip stats={data.stats} lastMeeting={data.lastMeeting} overdueCount={overdue} />
        <MyTasks tasks={data.myTasksToday} membersById={membersById} />
        <ActiveProjects projects={data.activeProjects} membersById={membersById} />
        <div className="grid grid-cols-2 gap-5">
          <LastMeeting meeting={data.lastMeeting} />
          <WikiRecents pages={data.recentWiki} />
        </div>
      </div>
    </>
  );
}

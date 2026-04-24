import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getUsers } from '@/lib/notion/users';
import { getTeamMembers } from '@/lib/notion/team';
import type { Meeting } from '@/schemas/meeting';
import type { NotionUser } from '@/schemas/notion-user';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';

export const dynamic = 'force-dynamic';

export default async function ReunionesPage() {
  const ctx = await requireContext();
  const meetings = await queryMeetingsByCustomer(ctx.customerId);

  const now = Date.now();
  const currentOrNext =
    meetings
      .filter((m: Meeting) => m.date)
      .sort((a: Meeting, b: Meeting) => {
        const ta = new Date(a.date!).getTime();
        const tb = new Date(b.date!).getTime();
        const futureA = ta >= now - 86400_000;
        const futureB = tb >= now - 86400_000;
        if (futureA && !futureB) return -1;
        if (futureB && !futureA) return 1;
        return Math.abs(ta - now) - Math.abs(tb - now);
      })[0] ?? null;

  let blocks: any[] = [];
  let actionItems: Task[] = [];
  let attendees: NotionUser[] = [];
  let teamMembers: TeamMember[] = [];
  let usersById = new Map<string, NotionUser>();

  if (currentOrNext) {
    [blocks, actionItems, attendees, teamMembers] = await Promise.all([
      getBlocks(currentOrNext.id),
      Promise.all(currentOrNext.taskIds.map(getTask)).then((ts) =>
        ts.filter((t: Task | null): t is Task => t !== null),
      ),
      getUsers(currentOrNext.attendeeIds),
      getTeamMembers(currentOrNext.teamIds),
    ]);

    const actionItemUserIds = Array.from(
      new Set(actionItems.flatMap((t) => t.assigneeIds)),
    );
    const extraUsers = await getUsers(
      actionItemUserIds.filter((id) => !attendees.some((a) => a.id === id)),
    );
    usersById = new Map<string, NotionUser>(
      [...attendees, ...extraUsers].map((u) => [u.id, u]),
    );
  }

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Reuniones' },
          { label: currentOrNext?.title ?? 'Sin reuniones', muted: true },
        ]}
      />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          {currentOrNext ? (
            <HeroMeeting
              meeting={currentOrNext}
              blocks={blocks}
              actionItems={actionItems}
              attendees={attendees}
              teamMembers={teamMembers}
              usersById={usersById}
            />
          ) : (
            <p className="text-muted-foreground">Este cliente no tiene reuniones registradas todavía.</p>
          )}
        </div>
        <HistoryPanel meetings={meetings} currentId={currentOrNext?.id} />
      </div>
    </>
  );
}

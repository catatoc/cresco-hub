import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { pickDefault } from '@/lib/meetings/select';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';
import { MeetingsEmpty } from '@/components/meetings/meetings-empty';

export const dynamic = 'force-dynamic';

export default async function ReunionesPage() {
  const ctx = await requireContext();
  const meetings = await queryMeetingsByCustomer(ctx.customerId);

  const current = pickDefault(meetings);

  let blocks: any[] = [];
  let actionItems: Task[] = [];
  let membersById = new Map<string, TeamMember>();

  if (current) {
    [blocks, actionItems] = await Promise.all([
      getBlocks(current.id),
      Promise.all(current.taskIds.map(getTask)).then((ts) =>
        ts.filter((t: Task | null): t is Task => t !== null),
      ),
    ]);

    const memberIds = Array.from(
      new Set([...current.teamIds, ...actionItems.flatMap((t) => t.assigneeIds)]),
    );
    const members = await getTeamMembers(memberIds);
    membersById = new Map(members.map((m) => [m.id, m]));
  }

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Reuniones' },
          { label: current?.title ?? 'Sin reuniones', muted: true },
        ]}
      />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          {current ? (
            <HeroMeeting
              meeting={current}
              blocks={blocks}
              actionItems={actionItems}
              membersById={membersById}
            />
          ) : (
            <MeetingsEmpty />
          )}
        </div>
        <HistoryPanel meetings={meetings} currentId={current?.id} />
      </div>
    </>
  );
}

import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { pickDefault, pickPreviousMeeting } from '@/lib/meetings/select';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';
import { MobileHistoryTrigger } from '@/components/meetings/mobile-history-trigger';
import { LastMeetingBanner } from '@/components/meetings/last-meeting-banner';
import { MeetingsEmpty } from '@/components/meetings/meetings-empty';
import { PageEnter } from '@/components/motion/page-enter';

export const dynamic = 'force-dynamic';

export default async function ReunionesPage() {
  const ctx = await requireContext();
  const meetings = await queryMeetingsByCustomer(ctx.customerId);

  const current = pickDefault(meetings);
  const lastMeeting = pickPreviousMeeting(meetings, current?.id);

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
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar
        crumbs={[
          { label: 'Reuniones' },
          { label: current?.title ?? 'Sin reuniones', muted: true },
        ]}
      >
        <MobileHistoryTrigger meetings={meetings} currentId={current?.id} />
      </Topbar>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12">
          {current ? (
            <>
              <LastMeetingBanner lastMeeting={lastMeeting} />
              <HeroMeeting
                meeting={current}
                blocks={blocks}
                actionItems={actionItems}
                membersById={membersById}
              />
            </>
          ) : (
            <MeetingsEmpty />
          )}
        </div>
        <div className="hidden lg:block min-h-0">
          <HistoryPanel meetings={meetings} currentId={current?.id} />
        </div>
      </div>
    </PageEnter>
  );
}

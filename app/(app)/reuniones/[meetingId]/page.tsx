import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer, getMeeting } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { pickPreviousMeeting } from '@/lib/meetings/select';
import type { Task } from '@/schemas/task';
import { notFound } from 'next/navigation';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';
import { MobileHistoryTrigger } from '@/components/meetings/mobile-history-trigger';
import { LastMeetingBanner } from '@/components/meetings/last-meeting-banner';
import { PageEnter } from '@/components/motion/page-enter';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const ctx = await requireContext();
  const { meetingId } = await params;

  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.customerId !== ctx.customerId) notFound();

  const [meetings, blocks, actionItems] = await Promise.all([
    queryMeetingsByCustomer(ctx.customerId),
    getBlocks(meetingId),
    Promise.all(meeting.taskIds.map(getTask)).then((ts) =>
      ts.filter((t: Task | null): t is Task => t !== null),
    ),
  ]);

  const memberIds = Array.from(
    new Set([...meeting.teamIds, ...actionItems.flatMap((t) => t.assigneeIds)]),
  );
  const members = await getTeamMembers(memberIds);
  const membersById = new Map(members.map((m) => [m.id, m]));

  const lastMeeting = pickPreviousMeeting(meetings, meeting.id);

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: meeting.title, muted: true }]}>
        <MobileHistoryTrigger meetings={meetings} currentId={meeting.id} />
      </Topbar>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12">
          <LastMeetingBanner lastMeeting={lastMeeting} />
          <HeroMeeting
            meeting={meeting}
            blocks={blocks}
            actionItems={actionItems}
            membersById={membersById}
          />
        </div>
        <div className="hidden lg:block min-h-0">
          <HistoryPanel meetings={meetings} currentId={meeting.id} />
        </div>
      </div>
    </PageEnter>
  );
}

import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer, getMeeting } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { pickNextMeeting } from '@/lib/meetings/select';
import type { Task } from '@/schemas/task';
import { notFound } from 'next/navigation';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';
import { NextMeetingBanner } from '@/components/meetings/next-meeting-banner';

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

  const now = Date.now();
  const nextMeeting = pickNextMeeting(meetings, now);
  const isPast = meeting.date ? new Date(meeting.date).getTime() <= now : false;
  const bannerMeeting = isPast && nextMeeting && nextMeeting.id !== meeting.id ? nextMeeting : null;

  return (
    <>
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: meeting.title, muted: true }]} />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          {bannerMeeting && <NextMeetingBanner nextMeeting={bannerMeeting} />}
          <HeroMeeting
            meeting={meeting}
            blocks={blocks}
            actionItems={actionItems}
            membersById={membersById}
          />
        </div>
        <HistoryPanel meetings={meetings} currentId={meeting.id} />
      </div>
    </>
  );
}

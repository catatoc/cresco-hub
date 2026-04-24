import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByClient, getMeeting } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { notFound } from 'next/navigation';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const ctx = await requireContext();
  const { meetingId } = await params;

  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.clientId !== ctx.clientId) notFound();

  const [meetings, blocks, actionItems] = await Promise.all([
    queryMeetingsByClient(ctx.clientId),
    getBlocks(meetingId),
    Promise.all(meeting.actionItemIds.map(getTask)).then((ts) => ts.filter((t): t is NonNullable<typeof t> => t !== null)),
  ]);

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Reuniones' },
          { label: meeting.title, muted: true },
        ]}
      />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          <HeroMeeting meeting={meeting} blocks={blocks} actionItems={actionItems} />
        </div>
        <HistoryPanel meetings={meetings} currentId={meeting.id} />
      </div>
    </>
  );
}

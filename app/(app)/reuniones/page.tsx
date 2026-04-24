import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByClient } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';

export const dynamic = 'force-dynamic';

export default async function ReunionesPage() {
  const ctx = await requireContext();
  const meetings = await queryMeetingsByClient(ctx.clientId);

  const now = Date.now();
  const currentOrNext =
    meetings
      .filter((m) => m.date)
      .sort((a, b) => {
        const ta = new Date(a.date!).getTime();
        const tb = new Date(b.date!).getTime();
        const futureA = ta >= now - 86400_000;
        const futureB = tb >= now - 86400_000;
        if (futureA && !futureB) return -1;
        if (futureB && !futureA) return 1;
        return Math.abs(ta - now) - Math.abs(tb - now);
      })[0] ?? null;

  const [blocks, actionItems] = currentOrNext
    ? await Promise.all([
        getBlocks(currentOrNext.id),
        Promise.all(currentOrNext.actionItemIds.map(getTask)).then((ts) => ts.filter((t): t is NonNullable<typeof t> => t !== null)),
      ])
    : [[], []];

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
            <HeroMeeting meeting={currentOrNext} blocks={blocks} actionItems={actionItems} />
          ) : (
            <p className="text-muted-foreground">Este cliente no tiene reuniones registradas todavía.</p>
          )}
        </div>
        <HistoryPanel meetings={meetings} currentId={currentOrNext?.id} />
      </div>
    </>
  );
}

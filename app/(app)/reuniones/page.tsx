import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import type { Meeting } from '@/schemas/meeting';
import type { Task } from '@/schemas/task';
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

  const [blocks, actionItems] = currentOrNext
    ? await Promise.all([
        getBlocks(currentOrNext.id),
        Promise.all(currentOrNext.taskIds.map(getTask)).then((ts) =>
          ts.filter((t: Task | null): t is Task => t !== null),
        ),
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

import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryTasksByClientAndCycle } from '@/lib/notion/tasks';
import { currentCycle } from '@/lib/cycles';
import { KanbanView } from '@/components/kanban/kanban-view';

export const dynamic = 'force-dynamic';

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const cycle = sp.cycle ?? currentCycle();
  const tasks = await queryTasksByClientAndCycle(ctx.clientId, cycle);

  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: 'Sprint activo', muted: true }]} />
      <KanbanView initialTasks={tasks} cycle={cycle} />
    </>
  );
}

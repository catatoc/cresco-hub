import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { getCurrentSprint } from '@/lib/notion/sprints';
import { KanbanView } from '@/components/kanban/kanban-view';

export const dynamic = 'force-dynamic';

export default async function TareasPage() {
  const ctx = await requireContext();
  // TODO(refactor-C): wire Sprint selector via searchParams; for now use current sprint.
  const sprint = await getCurrentSprint();
  const tasks = await queryTasksByCustomerAndSprint(ctx.customerId, sprint?.id ?? null);

  const sprintLabel = sprint?.name ?? 'Sin sprint activo';

  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: sprintLabel, muted: true }]} />
      <KanbanView initialTasks={tasks} sprintLabel={sprintLabel} />
    </>
  );
}

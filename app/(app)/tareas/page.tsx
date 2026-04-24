import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { getCurrentSprint, getSprint, listSprints } from '@/lib/notion/sprints';
import { getUsers } from '@/lib/notion/users';
import { KanbanView } from '@/components/kanban/kanban-view';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ sprint?: string }>;

function formatSprintDates(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const s = start ? format(parseISO(start), 'd MMM', { locale: es }) : '—';
  const e = end ? format(parseISO(end), 'd MMM', { locale: es }) : '—';
  return `${s} → ${e}`;
}

export default async function TareasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;

  const [sprint, sprints] = await Promise.all([
    sp.sprint ? getSprint(sp.sprint) : getCurrentSprint(),
    listSprints(),
  ]);

  const tasks = await queryTasksByCustomerAndSprint(ctx.customerId, sprint?.id ?? null);

  const userIds = Array.from(new Set(tasks.flatMap((t) => t.assigneeIds)));
  const users = await getUsers(userIds);

  const sprintLabel = sprint?.name ?? 'Sin sprint activo';
  const sprintDates = sprint ? formatSprintDates(sprint.startDate, sprint.endDate) : null;
  const crumbLabel = sprintDates ? `${sprintLabel} · ${sprintDates}` : sprintLabel;

  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: crumbLabel, muted: true }]} />
      <KanbanView
        initialTasks={tasks}
        sprintLabel={sprintLabel}
        currentSprintId={sprint?.id ?? null}
        allSprintIds={sprints.map((s) => s.id)}
        users={users}
      />
    </>
  );
}

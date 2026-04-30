import { cookies } from 'next/headers';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { queryTasksByCustomerAndSprintPaginated } from '@/lib/notion/tasks';
import { getCurrentSprint, getSprint, listSprints } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import { KanbanView } from '@/components/kanban/kanban-view';
import { ScopePill } from '@/components/common/scope-pill';
import { PageEnter } from '@/components/motion/page-enter';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ sprint?: string; scope?: string }>;

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
  const cookieStore = await cookies();
  const scope = resolveScope('tareas', sp.scope, cookieStore.get(SCOPE_COOKIE.tareas)?.value);

  const [sprint, sprints, projects] = await Promise.all([
    sp.sprint ? getSprint(sp.sprint) : getCurrentSprint(),
    listSprints(),
    queryProjectsByCustomer(ctx.customerId),
  ]);

  const projectsById = new Map(projects.map((p) => [p.id, p]));

  const { tasks: allTasks, truncated } = await queryTasksByCustomerAndSprintPaginated(
    ctx.customerId,
    sprint?.id ?? null,
  );

  const myTasks = allTasks.filter((t) => t.assigneeIds.includes(ctx.memberId));
  const visibleTasks = scope === 'mine' ? myTasks : allTasks;

  const memberIds = Array.from(new Set(allTasks.flatMap((t) => t.assigneeIds)));
  const members = await getTeamMembers(memberIds);

  const sprintLabel = sprint?.name ?? 'Sin sprint activo';
  const sprintDates = sprint ? formatSprintDates(sprint.startDate, sprint.endDate) : null;
  const crumbLabel = sprintDates ? `${sprintLabel} · ${sprintDates}` : sprintLabel;

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: 'Tareas' }, { label: crumbLabel, muted: true }]}>
        <ScopePill
          scopeKey="tareas"
          scope={scope}
          myCount={myTasks.length}
          teamCount={allTasks.length}
          redirectPath="/tareas"
          extraParams={sprint?.id ? { sprint: sprint.id } : {}}
          labels={{ mine: 'Mías', team: 'Equipo completo' }}
        />
      </Topbar>
      <KanbanView
        initialTasks={visibleTasks}
        truncated={truncated && scope === 'team'}
        sprintLabel={sprintLabel}
        currentSprintId={sprint?.id ?? null}
        allSprintIds={sprints.map((s) => s.id)}
        members={members}
        scope={scope}
        projectsById={projectsById}
      />
    </PageEnter>
  );
}

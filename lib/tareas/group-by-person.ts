import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

export type PersonGroup = {
  /** null = "Sin asignar" bucket */
  member: TeamMember | null;
  tasks: Task[];
};

/**
 * Group tasks by primary assignee, drop archived tasks, and order groups by
 * how loaded each person looks (more In Progress first, then by total).
 *
 * Tasks whose first assignee id isn't in `members` (or who have none) fall into
 * a trailing "Sin asignar" group only rendered when at least one such task exists.
 */
export function groupTasksByPerson(
  tasks: Task[],
  members: TeamMember[],
): PersonGroup[] {
  const liveTasks = tasks.filter((t) => t.status !== 'Archived');
  if (liveTasks.length === 0) return [];

  const memberById = new Map(members.map((m) => [m.id, m]));
  const buckets = new Map<string, Task[]>();
  const orphans: Task[] = [];

  for (const t of liveTasks) {
    const primaryId = t.assigneeIds[0];
    if (primaryId && memberById.has(primaryId)) {
      const list = buckets.get(primaryId) ?? [];
      list.push(t);
      buckets.set(primaryId, list);
    } else {
      orphans.push(t);
    }
  }

  const personGroups: PersonGroup[] = [...buckets.entries()].map(([id, ts]) => ({
    member: memberById.get(id)!,
    tasks: ts,
  }));

  personGroups.sort((a, b) => {
    const aInProg = a.tasks.filter((t) => t.status === 'In Progress').length;
    const bInProg = b.tasks.filter((t) => t.status === 'In Progress').length;
    if (aInProg !== bInProg) return bInProg - aInProg;
    return b.tasks.length - a.tasks.length;
  });

  if (orphans.length > 0) {
    personGroups.push({ member: null, tasks: orphans });
  }

  return personGroups;
}

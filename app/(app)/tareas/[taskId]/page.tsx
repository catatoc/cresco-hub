import { requireContext } from '@/lib/auth/require-context';
import { getTask } from '@/lib/notion/tasks';
import { getBlocks } from '@/lib/notion/blocks';
import { getProject } from '@/lib/notion/projects';
import { getSprint } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { notFound } from 'next/navigation';
import { TaskDetail } from '@/components/kanban/task-detail';

export const dynamic = 'force-dynamic';

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const ctx = await requireContext();
  const { taskId } = await params;

  const task = await getTask(taskId);
  if (!task || task.customerId !== ctx.customerId) notFound();

  const [blocks, project, sprint, assignees] = await Promise.all([
    getBlocks(taskId),
    task.projectId ? getProject(task.projectId) : Promise.resolve(null),
    task.sprintId ? getSprint(task.sprintId) : Promise.resolve(null),
    getTeamMembers(task.assigneeIds),
  ]);

  return (
    <TaskDetail
      task={task}
      blocks={blocks}
      project={project}
      sprint={sprint}
      assignees={assignees}
    />
  );
}

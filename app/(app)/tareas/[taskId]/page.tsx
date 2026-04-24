import { requireContext } from '@/lib/auth/require-context';
import { getTask } from '@/lib/notion/tasks';
import { getBlocks } from '@/lib/notion/blocks';
import { notFound } from 'next/navigation';
import { TaskDrawer } from '@/components/kanban/task-drawer';

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

  const blocks = await getBlocks(taskId);

  return <TaskDrawer task={task} blocks={blocks} />;
}

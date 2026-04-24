import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { taskSchema, type Task, type TaskStatus } from '@/schemas/task';

export async function queryTasksByClientAndCycle(clientId: string, cycle: string): Promise<Task[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TASKS,
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientId } },
        { property: 'Cycle', rich_text: { equals: cycle } },
      ],
    },
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      return taskSchema.parse({
        id: row.id,
        number: p.Number?.formula?.string ?? null,
        title: p.Title?.title?.[0]?.plain_text ?? '',
        status: p.Status?.status?.name ?? 'Backlog',
        priority: p.Priority?.select?.name ?? null,
        assigneeIds: (p.Assignee?.relation ?? []).map((r: { id: string }) => r.id),
        projectId: p.Project?.relation?.[0]?.id ?? null,
        clientId: p.Client?.relation?.[0]?.id ?? null,
        cycle: p.Cycle?.rich_text?.[0]?.plain_text ?? null,
        dueDate: p['Due date']?.date?.start ?? null,
        labels: (p.Labels?.multi_select ?? []).map((l: { name: string }) => l.name),
        url: row.url,
      });
    });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const notion = getNotion();
  await notion.pages.update({
    page_id: taskId,
    properties: { Status: { status: { name: status } } },
  });
}

export async function getTask(taskId: string): Promise<Task | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: taskId });
    if (!('properties' in page)) return null;
    const p = page.properties as Record<string, any>;
    return taskSchema.parse({
      id: page.id,
      number: p.Number?.formula?.string ?? null,
      title: p.Title?.title?.[0]?.plain_text ?? '',
      status: p.Status?.status?.name ?? 'Backlog',
      priority: p.Priority?.select?.name ?? null,
      assigneeIds: (p.Assignee?.relation ?? []).map((r: { id: string }) => r.id),
      projectId: p.Project?.relation?.[0]?.id ?? null,
      clientId: p.Client?.relation?.[0]?.id ?? null,
      cycle: p.Cycle?.rich_text?.[0]?.plain_text ?? null,
      dueDate: p['Due date']?.date?.start ?? null,
      labels: (p.Labels?.multi_select ?? []).map((l: { name: string }) => l.name),
      url: (page as any).url,
    });
  } catch {
    return null;
  }
}

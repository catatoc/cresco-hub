import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { taskSchema, type Task, type TaskStatus } from '@/schemas/task';

function parseTask(row: any): Task {
  const p = row.properties as Record<string, any>;
  return taskSchema.parse({
    id: row.id,
    title: p['Task name']?.title?.[0]?.plain_text ?? '',
    status: p.Status?.status?.name ?? 'Not Started',
    priority: p.Priority?.select?.name ?? null,
    type: p.Type?.select?.name ?? null,
    // Assignees come from the Team relation (canonical directory),
    // not the Notion person `Assignee` property.
    assigneeIds: (p.Team?.relation ?? []).map((r: { id: string }) => r.id),
    projectId: p.Project?.relation?.[0]?.id ?? null,
    customerId: p.Customer?.relation?.[0]?.id ?? null,
    sprintId: p.Sprint?.relation?.[0]?.id ?? null,
    dueDate: p.Due?.date?.start ?? null,
    plannedDate: p.Planned?.date?.start ?? null,
    completedAt: p['Completed on']?.date?.start ?? null,
    tags: (p.Tags?.multi_select ?? []).map((t: { name: string }) => t.name),
    progress: typeof p.Progress?.number === 'number' ? p.Progress.number : null,
    url: row.url,
  });
}

export async function queryTasksByCustomerAndSprint(
  customerId: string,
  sprintId: string | null,
): Promise<Task[]> {
  const notion = getNotion();
  const baseFilter = { property: 'Customer', relation: { contains: customerId } };
  const filter = sprintId
    ? { and: [baseFilter, { property: 'Sprint', relation: { contains: sprintId } }] }
    : baseFilter;

  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TASKS,
    filter,
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseTask);
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
    return parseTask(page);
  } catch {
    return null;
  }
}

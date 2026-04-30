import { getNotion } from './client';
import { queryAllPages } from './pagination';
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

/**
 * @deprecated Use `queryTasksByCustomerAndSprintPaginated`. This call hits the
 * Notion default page_size and silently drops results when there are >100 tasks.
 * Kept for callers that still depend on the unpaginated shape (search suggestions,
 * home queries). Will be removed once all call sites migrate.
 */
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

export async function queryTasksByCustomerAndTitle(
  customerId: string,
  term: string,
): Promise<Task[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TASKS,
    page_size: 8,
    filter: {
      and: [
        { property: 'Customer', relation: { contains: customerId } },
        { property: 'Task name', title: { contains: term } },
      ],
    },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseTask);
}

export async function queryTasksByProject(projectId: string): Promise<Task[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TASKS,
    filter: { property: 'Project', relation: { contains: projectId } },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseTask);
}

export async function createTask(args: {
  customerId: string;
  title: string;
  description?: string;
  sprintId?: string | null;
  projectId?: string | null;
  assigneeIds?: string[];
  priority?: 'Low' | 'Medium' | 'High' | null;
  dueDate?: string | null;
}): Promise<{ id: string; url: string }> {
  const notion = getNotion();
  const properties: Record<string, any> = {
    'Task name': { title: [{ text: { content: args.title } }] },
    Status: { status: { name: 'Not Started' } },
    Customer: { relation: [{ id: args.customerId }] },
  };
  if (args.sprintId) properties.Sprint = { relation: [{ id: args.sprintId }] };
  if (args.projectId) properties.Project = { relation: [{ id: args.projectId }] };
  if (args.assigneeIds && args.assigneeIds.length > 0) {
    properties.Team = { relation: args.assigneeIds.map((id) => ({ id })) };
  }
  if (args.priority) properties.Priority = { select: { name: args.priority } };
  if (args.dueDate) properties.Due = { date: { start: args.dueDate } };

  const res = await notion.pages.create({
    parent: { data_source_id: serverEnv.NOTION_DB_TASKS },
    properties,
  });
  const id = (res as any).id as string;

  const desc = args.description?.trim();
  if (desc && desc.length > 0) {
    await notion.blocks.children.append({
      block_id: id,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: desc } }],
          },
        },
      ],
    });
  }

  return { id, url: (res as any).url as string };
}

export async function queryTasksByCustomerAndSprintPaginated(
  customerId: string,
  sprintId: string | null,
  cap: number = 500,
): Promise<{ tasks: Task[]; truncated: boolean }> {
  const notion = getNotion();
  const baseFilter = { property: 'Customer', relation: { contains: customerId } };
  const filter = sprintId
    ? { and: [baseFilter, { property: 'Sprint', relation: { contains: sprintId } }] }
    : baseFilter;

  const { items, truncated } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_TASKS,
        filter,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap },
  );

  const tasks = items
    .filter((r: any): r is any => 'properties' in r)
    .map(parseTask);
  return { tasks, truncated };
}

export async function queryTasksByCustomerSprintAndMember(
  customerId: string,
  sprintId: string | null,
  memberId: string,
): Promise<Task[]> {
  const notion = getNotion();
  const filterParts: any[] = [
    { property: 'Customer', relation: { contains: customerId } },
  ];
  if (sprintId) filterParts.push({ property: 'Sprint', relation: { contains: sprintId } });
  filterParts.push({ property: 'Team', relation: { contains: memberId } });

  const { items } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_TASKS,
        filter: { and: filterParts },
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap: Infinity },
  );

  return items.filter((r: any): r is any => 'properties' in r).map(parseTask);
}

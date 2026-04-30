import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { projectSchema, type Project } from '@/schemas/project';
import { queryAllPages } from './pagination';

function parseProject(row: any): Project {
  const p = row.properties as Record<string, any>;
  const icon = (row as any).icon;
  return projectSchema.parse({
    id: row.id,
    name: p['Project name']?.title?.[0]?.plain_text ?? '',
    icon: icon?.type === 'emoji' ? icon.emoji : null,
    summary: p.Summary?.rich_text?.[0]?.plain_text ?? null,
    repoUrl: p['Repo URL']?.url ?? null,
    status: p.Status?.status?.name ?? null,
    priority: p.Priority?.select?.name ?? null,
    completion: typeof p.Completion?.rollup?.number === 'number' ? p.Completion.rollup.number : null,
    ownerIds: (p.Owner?.people ?? []).map((u: { id: string }) => u.id),
    customerId: p.Customer?.relation?.[0]?.id ?? null,
    teamIds: (p.Team?.relation ?? []).map((r: { id: string }) => r.id),
    startDate: p.Dates?.date?.start ?? null,
    endDate: p.Dates?.date?.end ?? null,
    url: row.url,
  });
}

export async function queryProjectsByCustomer(customerId: string): Promise<Project[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_PROJECTS,
    filter: { property: 'Customer', relation: { contains: customerId } },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseProject);
}

export async function queryProjectsByCustomerAndTitle(
  customerId: string,
  term: string,
): Promise<Project[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_PROJECTS,
    page_size: 8,
    filter: {
      and: [
        { property: 'Customer', relation: { contains: customerId } },
        { property: 'Project name', title: { contains: term } },
      ],
    },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    return parseProject(page);
  } catch {
    return null;
  }
}

export async function queryProjectsByCustomerAndMember(
  customerId: string,
  memberId: string,
): Promise<Project[]> {
  const notion = getNotion();
  const { items } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_PROJECTS,
        filter: {
          and: [
            { property: 'Customer', relation: { contains: customerId } },
            { property: 'Team', relation: { contains: memberId } },
          ],
        },
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
  return items.filter((r: any): r is any => 'properties' in r).map(parseProject);
}

import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { projectSchema, type Project } from '@/schemas/project';

function parseProject(row: any): Project {
  const p = row.properties as Record<string, any>;
  const icon = (row as any).icon;
  return projectSchema.parse({
    id: row.id,
    name: p['Project name']?.title?.[0]?.plain_text ?? '',
    icon: icon?.type === 'emoji' ? icon.emoji : null,
    summary: p.Summary?.rich_text?.[0]?.plain_text ?? null,
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

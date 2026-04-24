import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { sprintSchema, type Sprint } from '@/schemas/sprint';

function parseSprint(row: any): Sprint {
  const p = row.properties as Record<string, any>;
  return sprintSchema.parse({
    id: row.id,
    sprintId: typeof p['Sprint ID']?.unique_id?.number === 'number'
      ? p['Sprint ID'].unique_id.number
      : (typeof p['Sprint ID']?.number === 'number' ? p['Sprint ID'].number : null),
    name: p['Sprint name']?.title?.[0]?.plain_text ?? '',
    status: p['Sprint status']?.status?.name ?? null,
    startDate: p.Dates?.date?.start ?? null,
    endDate: p.Dates?.date?.end ?? null,
  });
}

export async function listSprints(): Promise<Sprint[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_SPRINTS,
    sorts: [{ property: 'Sprint ID', direction: 'descending' }],
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseSprint);
}

export async function getCurrentSprint(): Promise<Sprint | null> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_SPRINTS,
    filter: { property: 'Sprint status', status: { equals: 'Current' } },
    page_size: 1,
  });
  const row = res.results[0];
  if (!row || !('properties' in row)) return null;
  return parseSprint(row);
}

export async function getSprint(id: string): Promise<Sprint | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    return parseSprint(page);
  } catch {
    return null;
  }
}

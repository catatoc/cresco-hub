import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { projectSchema, type Project } from '@/schemas/project';

export async function queryProjectsByClient(clientId: string): Promise<Project[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_PROJECTS,
    filter: { property: 'Client', relation: { contains: clientId } },
    sorts: [{ property: 'Deadline', direction: 'ascending' }],
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      const icon = row.icon;
      return projectSchema.parse({
        id: row.id,
        name: p.Name?.title?.[0]?.plain_text ?? '',
        icon: icon?.type === 'emoji' ? icon.emoji : null,
        description: p.Description?.rich_text?.[0]?.plain_text ?? null,
        status: p.Status?.select?.name ?? null,
        progress: typeof p.Progress?.number === 'number' ? p.Progress.number : null,
        clientId: p.Client?.relation?.[0]?.id ?? null,
        teamIds: (p.Team?.relation ?? []).map((r: { id: string }) => r.id),
        deadline: p.Deadline?.date?.start ?? null,
        url: row.url,
      });
    });
}

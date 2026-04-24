import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { teamMemberSchema, type TeamMember } from '@/schemas/team-member';

export async function findMemberByEmail(email: string): Promise<TeamMember | null> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TEAM,
    filter: { property: 'Email', email: { equals: email } },
  });

  const row = res.results[0];
  if (!row || !('properties' in row)) return null;
  const p = row.properties as Record<string, any>;

  return teamMemberSchema.parse({
    id: row.id,
    name: p.Name?.title?.[0]?.plain_text ?? '',
    email: p.Email?.email ?? email,
    role: typeof p.Role?.rich_text?.[0]?.plain_text === 'string' ? p.Role.rich_text[0].plain_text : null,
    area: p.Area?.select?.name ?? null,
    customerIds: (p.Customers?.relation ?? []).map((r: { id: string }) => r.id),
    projectIds: (p.Projects?.relation ?? []).map((r: { id: string }) => r.id),
  });
}

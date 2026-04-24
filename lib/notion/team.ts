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

  const props = row.properties as Record<string, any>;

  return teamMemberSchema.parse({
    id: row.id,
    name: props.Name?.title?.[0]?.plain_text ?? '',
    email: props.Email?.email ?? email,
    clientId: props.Client?.relation?.[0]?.id ?? null,
    projectIds: (props.Project?.relation ?? []).map((r: { id: string }) => r.id),
    role: props.Role?.select?.name ?? null,
  });
}

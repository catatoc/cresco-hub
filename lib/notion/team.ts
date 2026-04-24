import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { teamMemberSchema, type TeamMember } from '@/schemas/team-member';

function parseTeamMember(row: any, fallbackEmail?: string): TeamMember {
  const p = row.properties as Record<string, any>;
  return teamMemberSchema.parse({
    id: row.id,
    name: p.Name?.title?.[0]?.plain_text ?? '',
    email: p.Email?.email ?? fallbackEmail ?? '',
    role:
      typeof p.Role?.rich_text?.[0]?.plain_text === 'string'
        ? p.Role.rich_text[0].plain_text
        : null,
    area: p.Area?.select?.name ?? null,
    customerIds: (p.Customers?.relation ?? []).map((r: { id: string }) => r.id),
    projectIds: (p.Projects?.relation ?? []).map((r: { id: string }) => r.id),
  });
}

export async function findMemberByEmail(email: string): Promise<TeamMember | null> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TEAM,
    filter: { property: 'Email', email: { equals: email } },
  });

  const row = res.results[0];
  if (!row || !('properties' in row)) return null;
  return parseTeamMember(row, email);
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    return parseTeamMember(page);
  } catch {
    return null;
  }
}

export async function getTeamMembers(ids: string[]): Promise<TeamMember[]> {
  const unique = Array.from(new Set(ids));
  const members = await Promise.all(unique.map(getTeamMember));
  return members.filter((m): m is TeamMember => m !== null);
}

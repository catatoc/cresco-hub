import { cache } from 'react';
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { testUserSchema, type TestUser } from '@/schemas/test-user';

function parseTestUser(row: any): TestUser {
  const p = row.properties as Record<string, any>;
  return testUserSchema.parse({
    id: row.id,
    nombre: p['Nombre']?.title?.[0]?.plain_text ?? 'Sin nombre',
    usuario: (p['Usuario']?.rich_text ?? []).map((r: any) => r.plain_text).join(''),
    clave: (p['Clave']?.rich_text ?? []).map((r: any) => r.plain_text).join(''),
    url: p['URL']?.url ?? null,
    customerIds: (p['Customers']?.relation ?? []).map((r: { id: string }) => r.id),
    teamIds: (p['Team']?.relation ?? []).map((r: { id: string }) => r.id),
    lastEditedAt: row.last_edited_time,
  });
}

export const queryTestUsersByCustomer = cache(
  async (customerId: string): Promise<TestUser[]> => {
    const notion = getNotion();
    const res = await notion.dataSources.query({
      data_source_id: serverEnv.NOTION_DB_TEST_USERS,
      filter: { property: 'Customers', relation: { contains: customerId } },
      sorts: [{ property: 'Nombre', direction: 'ascending' }],
    });
    return res.results
      .filter((r): r is any => 'properties' in r)
      .map(parseTestUser);
  },
);

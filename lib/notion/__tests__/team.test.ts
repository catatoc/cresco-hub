import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TEAM: 'team-db-id' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { findMemberByEmail } from '../team';

describe('findMemberByEmail', () => {
  beforeEach(() => {
    mockNotion.dataSources.query.mockReset();
  });

  it('returns the member when email matches', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'member-1',
          properties: {
            Name: { title: [{ plain_text: 'Daniela' }] },
            Email: { email: 'dani@focuskids.co' },
            Role: { rich_text: [{ plain_text: 'Designer' }] },
            Area: { select: { name: 'Design' } },
            Customers: { relation: [{ id: 'customer-123' }, { id: 'customer-456' }] },
            Projects: { relation: [{ id: 'proj-A' }, { id: 'proj-B' }] },
          },
        },
      ],
    });

    const member = await findMemberByEmail('dani@focuskids.co');

    expect(member).toEqual({
      id: 'member-1',
      name: 'Daniela',
      email: 'dani@focuskids.co',
      role: 'Designer',
      area: 'Design',
      customerIds: ['customer-123', 'customer-456'],
      projectIds: ['proj-A', 'proj-B'],
      portalSignIn: false,
    });
    expect(mockNotion.dataSources.query).toHaveBeenCalledWith({
      data_source_id: 'team-db-id',
      filter: { property: 'Email', email: { equals: 'dani@focuskids.co' } },
    });
  });

  it('returns null when no match', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    const member = await findMemberByEmail('unknown@x.com');
    expect(member).toBeNull();
  });
});

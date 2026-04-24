import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_PROJECTS: 'projects-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryProjectsByCustomer } from '../projects';

describe('queryProjectsByCustomer', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses real Notion project shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'project-1',
          url: 'https://notion.so/project-1',
          icon: { type: 'emoji', emoji: '🚀' },
          properties: {
            'Project name': { title: [{ plain_text: 'Landing redesign' }] },
            Summary: { rich_text: [{ plain_text: 'Revamp of marketing site' }] },
            Status: { status: { name: 'In Progress' } },
            Priority: { select: { name: 'High' } },
            Completion: { rollup: { number: 0.42 } },
            Owner: { people: [{ id: 'user-owner' }] },
            Customer: { relation: [{ id: 'cust-focus' }] },
            Team: { relation: [{ id: 'team-1' }, { id: 'team-2' }] },
            Dates: { date: { start: '2026-04-01', end: '2026-06-01' } },
          },
        },
      ],
    });

    const projects = await queryProjectsByCustomer('cust-focus');
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      id: 'project-1',
      name: 'Landing redesign',
      icon: '🚀',
      summary: 'Revamp of marketing site',
      status: 'In Progress',
      priority: 'High',
      completion: 0.42,
      ownerIds: ['user-owner'],
      customerId: 'cust-focus',
      teamIds: ['team-1', 'team-2'],
      startDate: '2026-04-01',
      endDate: '2026-06-01',
    });
  });

  it('filters by Customer relation', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryProjectsByCustomer('cust-x');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({ property: 'Customer', relation: { contains: 'cust-x' } });
  });
});

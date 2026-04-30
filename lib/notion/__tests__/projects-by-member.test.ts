import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_PROJECTS: 'proj-ds' } }));
const mockNotion = { dataSources: { query: vi.fn() } };
import { queryProjectsByCustomerAndMember } from '../projects';

const row = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  icon: null,
  properties: {
    'Project name': { title: [{ plain_text: id }] },
    Customer: { relation: [{ id: 'cust-1' }] },
    Team: { relation: [{ id: 'mem-7' }] },
  },
});

describe('queryProjectsByCustomerAndMember', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('uses and-filter Customer + Team', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [row('p1')],
      has_more: false,
      next_cursor: null,
    });
    await queryProjectsByCustomerAndMember('cust-1', 'mem-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
  });

  it('paginates fully', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({ results: [row('p1')], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [row('p2')], has_more: false, next_cursor: null });
    const out = await queryProjectsByCustomerAndMember('cust-1', 'mem-7');
    expect(out.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});

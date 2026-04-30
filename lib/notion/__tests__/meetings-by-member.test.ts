import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meet-ds' } }));
const mockNotion = { dataSources: { query: vi.fn() } };
import { queryMeetingsByCustomerAndMember } from '../meetings';

const row = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  created_time: '2026-04-30T00:00:00Z',
  properties: {
    Name: { title: [{ plain_text: id }] },
    Customer: { relation: [{ id: 'cust-1' }] },
    Team: { relation: [{ id: 'mem-7' }] },
  },
});

describe('queryMeetingsByCustomerAndMember', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('uses and-filter Customer + Team and sorts by created_time desc', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [row('m1')],
      has_more: false,
      next_cursor: null,
    });
    await queryMeetingsByCustomerAndMember('cust-1', 'mem-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
    expect(call.sorts).toEqual([{ timestamp: 'created_time', direction: 'descending' }]);
  });

  it('paginates fully', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({ results: [row('a')], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [row('b')], has_more: false, next_cursor: null });
    const out = await queryMeetingsByCustomerAndMember('cust-1', 'mem-7');
    expect(out.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

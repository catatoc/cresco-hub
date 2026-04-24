import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_WIKI: 'wiki-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  blocks: { children: { list: vi.fn() } },
};

import { queryWikiByCustomer } from '../wiki';

describe('queryWikiByCustomer', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses real Notion wiki shape with categories, icon and cover', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'wiki-1',
          url: 'https://notion.so/wiki-1',
          icon: { type: 'emoji', emoji: '📘' },
          cover: { type: 'external', external: { url: 'https://images.example.com/cover.jpg' } },
          last_edited_time: '2026-04-20T12:00:00.000Z',
          properties: {
            'Doc name': { title: [{ plain_text: 'Onboarding guide' }] },
            Category: { multi_select: [{ name: 'Documentation' }, { name: 'Planning' }] },
            Customer: { relation: [{ id: 'cust-focus' }] },
            Projects: { relation: [{ id: 'proj-1' }] },
            Meetings: { relation: [{ id: 'meeting-1' }] },
          },
        },
      ],
    });

    const pages = await queryWikiByCustomer('cust-focus');
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      id: 'wiki-1',
      title: 'Onboarding guide',
      icon: '📘',
      cover: 'https://images.example.com/cover.jpg',
      categories: ['Documentation', 'Planning'],
      customerId: 'cust-focus',
      projectIds: ['proj-1'],
      meetingIds: ['meeting-1'],
      lastEditedAt: '2026-04-20T12:00:00.000Z',
    });
  });

  it('sorts by last_edited_time descending', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryWikiByCustomer('cust-x');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.sorts).toEqual([{ timestamp: 'last_edited_time', direction: 'descending' }]);
  });
});

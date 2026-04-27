import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_WIKI: 'wiki-ds' } }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { queryWikiByProject } from '../wiki';

describe('queryWikiByProject', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters by Projects relation contains projectId, sorted by last_edited_time desc', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryWikiByProject('proj-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({
      property: 'Projects',
      relation: { contains: 'proj-7' },
    });
    expect(call.sorts).toEqual([
      { timestamp: 'last_edited_time', direction: 'descending' },
    ]);
  });

  it('parses returned wiki pages', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'w-1',
          url: 'https://notion.so/w-1',
          icon: { type: 'emoji', emoji: '📄' },
          last_edited_time: '2026-04-20T10:00:00.000Z',
          properties: {
            'Doc name': { title: [{ plain_text: 'Brief inicial' }] },
            Category: { multi_select: [{ name: 'Documentation' }] },
            Customer: { relation: [{ id: 'c1' }] },
            Projects: { relation: [{ id: 'proj-7' }] },
            Meetings: { relation: [] },
          },
        },
      ],
    });

    const pages = await queryWikiByProject('proj-7');
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      id: 'w-1',
      title: 'Brief inicial',
      icon: '📄',
      categories: ['Documentation'],
      projectIds: ['proj-7'],
    });
  });
});

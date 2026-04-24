import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_WIKI: 'wiki-db' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryWikiByClient } from '../wiki';

// TODO(refactor-B): rewrite with real schemas
describe.skip('queryWikiByClient', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses a wiki row', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'wiki-1',
          url: 'https://notion.so/wiki-1',
          icon: { type: 'emoji', emoji: '📘' },
          cover: { type: 'external', external: { url: 'https://images.example.com/cover.jpg' } },
          last_edited_time: '2026-04-20T12:00:00.000Z',
          properties: {
            Name: { title: [{ plain_text: 'Onboarding guide' }] },
            'Parent item': { relation: [{ id: 'wiki-parent' }] },
            Client: { relation: [{ id: 'client-123' }] },
            Owner: { relation: [{ id: 'm-1' }] },
            Tags: { multi_select: [{ name: 'Docs' }, { name: 'Intro' }] },
          },
        },
      ],
    });

    const pages = await queryWikiByClient('client-123');
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      id: 'wiki-1',
      title: 'Onboarding guide',
      icon: '📘',
      cover: 'https://images.example.com/cover.jpg',
      parentId: 'wiki-parent',
      clientId: 'client-123',
      ownerId: 'm-1',
      tags: ['Docs', 'Intro'],
      lastEditedAt: '2026-04-20T12:00:00.000Z',
    });
  });
});

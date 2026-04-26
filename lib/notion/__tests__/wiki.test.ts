import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_WIKI: 'wiki-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  blocks: { children: { list: vi.fn() } },
  pages: { create: vi.fn() },
};

import { queryWikiByCustomer, createWikiPage } from '../wiki';

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

describe('createWikiPage', () => {
  beforeEach(() => mockNotion.pages.create.mockReset());

  it('maps Doc name, Customer, icon emoji', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({
      id: 'wiki-x',
      url: 'https://notion.so/wiki-x',
    });
    const out = await createWikiPage({
      customerId: 'cust-1',
      title: 'Onboarding',
      emoji: '📘',
    });
    const call = mockNotion.pages.create.mock.calls[0]![0];
    expect(call.properties['Doc name']).toEqual({
      title: [{ text: { content: 'Onboarding' } }],
    });
    expect(call.properties.Customer).toEqual({
      relation: [{ id: 'cust-1' }],
    });
    expect(call.icon).toEqual({ type: 'emoji', emoji: '📘' });
    expect(out).toEqual({ id: 'wiki-x', url: 'https://notion.so/wiki-x' });
  });

  it('maps categories as multi_select', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'w', url: 'u' });
    await createWikiPage({
      customerId: 'c',
      title: 't',
      emoji: '📄',
      categories: ['Documentation', 'Planning'],
    });
    const props = mockNotion.pages.create.mock.calls[0]![0].properties;
    expect(props.Category).toEqual({
      multi_select: [{ name: 'Documentation' }, { name: 'Planning' }],
    });
  });

  it('maps projectId and meetingId as relations when present', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'w', url: 'u' });
    await createWikiPage({
      customerId: 'c',
      title: 't',
      emoji: '📄',
      projectId: 'proj-1',
      meetingId: 'meet-1',
    });
    const props = mockNotion.pages.create.mock.calls[0]![0].properties;
    expect(props.Projects).toEqual({ relation: [{ id: 'proj-1' }] });
    expect(props.Meetings).toEqual({ relation: [{ id: 'meet-1' }] });
  });

  it('omits Projects/Meetings when not provided', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'w', url: 'u' });
    await createWikiPage({ customerId: 'c', title: 't', emoji: '📄' });
    const props = mockNotion.pages.create.mock.calls[0]![0].properties;
    expect(props.Projects).toBeUndefined();
    expect(props.Meetings).toBeUndefined();
  });
});

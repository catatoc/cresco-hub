import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_PROJECTS: 'projects-db' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryProjectsByClient } from '../projects';

describe('queryProjectsByClient', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses a project row', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'project-1',
          url: 'https://notion.so/project-1',
          icon: { type: 'emoji', emoji: '🚀' },
          properties: {
            Name: { title: [{ plain_text: 'Landing redesign' }] },
            Description: { rich_text: [{ plain_text: 'Revamp of marketing site' }] },
            Status: { select: { name: 'On track' } },
            Progress: { number: 42 },
            Client: { relation: [{ id: 'client-123' }] },
            Team: { relation: [{ id: 'm-1' }, { id: 'm-2' }] },
            Deadline: { date: { start: '2026-06-01', end: null } },
          },
        },
      ],
    });

    const projects = await queryProjectsByClient('client-123');
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      id: 'project-1',
      name: 'Landing redesign',
      icon: '🚀',
      description: 'Revamp of marketing site',
      status: 'On track',
      progress: 42,
      clientId: 'client-123',
      teamIds: ['m-1', 'm-2'],
      deadline: '2026-06-01',
    });
  });
});

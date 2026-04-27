import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meetings-ds' } }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { queryMeetingsByProject } from '../meetings';

describe('queryMeetingsByProject', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters by Projects relation contains projectId, sorted by created_time desc', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryMeetingsByProject('proj-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.data_source_id).toBe('meetings-ds');
    expect(call.filter).toEqual({
      property: 'Projects',
      relation: { contains: 'proj-7' },
    });
    expect(call.sorts).toEqual([{ timestamp: 'created_time', direction: 'descending' }]);
  });

  it('parses returned meetings', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'm-1',
          url: 'https://notion.so/m-1',
          created_time: '2026-04-22T10:00:00.000Z',
          properties: {
            Name: { title: [{ plain_text: 'Sync semanal' }] },
            Date: { date: { start: '2026-04-22', end: null } },
            'Meeting type': { select: { name: 'Weekly' } },
            Summary: { rich_text: [{ plain_text: 'OK' }] },
            Attendees: { people: [] },
            Customer: { relation: [{ id: 'c1' }] },
            Projects: { relation: [{ id: 'proj-7' }] },
            Team: { relation: [] },
            Tasks: { relation: [{ id: 't1' }, { id: 't2' }] },
            Wiki: { relation: [] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByProject('proj-7');
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      id: 'm-1',
      title: 'Sync semanal',
      projectIds: ['proj-7'],
      taskIds: ['t1', 't2'],
    });
  });
});

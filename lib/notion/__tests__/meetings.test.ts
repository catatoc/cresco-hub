import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meetings-db' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryMeetingsByClient } from '../meetings';

describe('queryMeetingsByClient', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses a meeting row', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'meeting-1',
          url: 'https://notion.so/meeting-1',
          properties: {
            Title: { title: [{ plain_text: 'Weekly sync' }] },
            Date: { date: { start: '2026-04-24T10:00:00.000Z', end: '2026-04-24T11:00:00.000Z' } },
            'Meet URL': { url: 'https://meet.google.com/abc' },
            Recurrence: { rich_text: [{ plain_text: 'Weekly' }] },
            Facilitator: { relation: [{ id: 'm-1' }] },
            Attendees: { relation: [{ id: 'm-1' }, { id: 'm-2' }] },
            Client: { relation: [{ id: 'client-123' }] },
            'Action items': { relation: [{ id: 'task-1' }] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByClient('client-123');
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      id: 'meeting-1',
      title: 'Weekly sync',
      date: '2026-04-24T10:00:00.000Z',
      endDate: '2026-04-24T11:00:00.000Z',
      meetUrl: 'https://meet.google.com/abc',
      recurrence: 'Weekly',
      facilitatorId: 'm-1',
      attendeeIds: ['m-1', 'm-2'],
      clientId: 'client-123',
      actionItemIds: ['task-1'],
    });
  });
});

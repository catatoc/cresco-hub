import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meetings-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  pages: { retrieve: vi.fn() },
};

import { queryMeetingsByCustomer, getMeeting } from '../meetings';

describe('queryMeetingsByCustomer', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses real Notion meeting shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'meeting-1',
          url: 'https://notion.so/meeting-1',
          properties: {
            Name: { title: [{ plain_text: 'Weekly sync' }] },
            Date: {
              date: {
                start: '2026-04-24T10:00:00.000Z',
                end: '2026-04-24T11:00:00.000Z',
              },
            },
            'Meeting type': { select: { name: 'Weekly' } },
            Summary: {
              rich_text: [
                { plain_text: 'Definimos prioridades. ' },
                { plain_text: 'Carlos lleva la migración.' },
              ],
            },
            Attendees: { people: [{ id: 'user-1' }, { id: 'user-2' }] },
            Customer: { relation: [{ id: 'cust-focus' }] },
            Projects: { relation: [{ id: 'proj-1' }] },
            Team: { relation: [{ id: 'team-1' }] },
            Tasks: { relation: [{ id: 'task-1' }, { id: 'task-2' }] },
            Wiki: { relation: [{ id: 'wiki-1' }] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByCustomer('cust-focus');
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      id: 'meeting-1',
      title: 'Weekly sync',
      date: '2026-04-24T10:00:00.000Z',
      endDate: '2026-04-24T11:00:00.000Z',
      meetingType: 'Weekly',
      summary: 'Definimos prioridades. Carlos lleva la migración.',
      attendeeIds: ['user-1', 'user-2'],
      customerId: 'cust-focus',
      projectIds: ['proj-1'],
      teamIds: ['team-1'],
      taskIds: ['task-1', 'task-2'],
      wikiIds: ['wiki-1'],
    });
  });

  it('returns null summary when Summary property is missing', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'meeting-2',
          url: 'https://notion.so/meeting-2',
          properties: {
            Name: { title: [{ plain_text: 'Sin summary' }] },
            Date: { date: { start: '2026-04-01', end: null } },
            'Meeting type': { select: null },
            Attendees: { people: [] },
            Customer: { relation: [{ id: 'cust-focus' }] },
            Projects: { relation: [] },
            Team: { relation: [] },
            Tasks: { relation: [] },
            Wiki: { relation: [] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByCustomer('cust-focus');
    expect(meetings[0].summary).toBeNull();
  });

  it('returns null summary when Summary rich_text is an empty array', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'meeting-3',
          url: 'https://notion.so/meeting-3',
          properties: {
            Name: { title: [{ plain_text: 'Empty summary' }] },
            Date: { date: { start: '2026-04-01', end: null } },
            'Meeting type': { select: null },
            Summary: { rich_text: [] },
            Attendees: { people: [] },
            Customer: { relation: [{ id: 'cust-focus' }] },
            Projects: { relation: [] },
            Team: { relation: [] },
            Tasks: { relation: [] },
            Wiki: { relation: [] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByCustomer('cust-focus');
    expect(meetings[0].summary).toBeNull();
  });
});

describe('getMeeting', () => {
  beforeEach(() => mockNotion.pages.retrieve.mockReset());

  it('returns null when retrieve throws', async () => {
    mockNotion.pages.retrieve.mockRejectedValueOnce(new Error('not found'));
    const meeting = await getMeeting('missing');
    expect(meeting).toBeNull();
  });
});

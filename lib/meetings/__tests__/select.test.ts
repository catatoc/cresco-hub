import { describe, it, expect } from 'vitest';
import { pickDefault, pickNextMeeting } from '../select';
import type { Meeting } from '@/schemas/meeting';

function makeMeeting(id: string, createdTime: string): Meeting {
  return {
    id,
    title: id,
    createdTime,
    date: null,
    endDate: null,
    meetingType: null,
    summary: null,
    attendeeIds: [],
    customerId: 'cust-1',
    projectIds: [],
    teamIds: [],
    taskIds: [],
    wikiIds: [],
    url: `https://notion.so/${id}`,
  };
}

describe('pickDefault', () => {
  it('returns null for empty list', () => {
    expect(pickDefault([])).toBeNull();
  });

  it('returns first meeting (assumes input is DESC by createdTime)', () => {
    const meetings = [
      makeMeeting('newest', '2026-04-24T10:00:00Z'),
      makeMeeting('older', '2026-04-10T10:00:00Z'),
    ];
    expect(pickDefault(meetings)?.id).toBe('newest');
  });
});

describe('pickNextMeeting', () => {
  it('always returns null (created_time is always past)', () => {
    expect(pickNextMeeting()).toBeNull();
  });
});

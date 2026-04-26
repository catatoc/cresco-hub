import { describe, it, expect } from 'vitest';
import { pickDefault, pickPreviousMeeting } from '../select';
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

describe('pickPreviousMeeting', () => {
  const m = [
    makeMeeting('a', '2026-04-24T10:00:00Z'),
    makeMeeting('b', '2026-04-17T10:00:00Z'),
    makeMeeting('c', '2026-04-10T10:00:00Z'),
  ];

  it('returns the meeting immediately after current in the DESC-sorted list', () => {
    expect(pickPreviousMeeting(m, 'a')?.id).toBe('b');
    expect(pickPreviousMeeting(m, 'b')?.id).toBe('c');
  });

  it('returns null when current is the oldest meeting', () => {
    expect(pickPreviousMeeting(m, 'c')).toBeNull();
  });

  it('returns null when currentId is undefined', () => {
    expect(pickPreviousMeeting(m, undefined)).toBeNull();
  });

  it('returns null when currentId is not in the list', () => {
    expect(pickPreviousMeeting(m, 'unknown')).toBeNull();
  });

  it('returns null for empty list', () => {
    expect(pickPreviousMeeting([], 'a')).toBeNull();
  });
});

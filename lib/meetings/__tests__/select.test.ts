import { describe, it, expect } from 'vitest';
import { pickDefault, pickNextMeeting } from '../select';
import type { Meeting } from '@/schemas/meeting';

function makeMeeting(id: string, date: string | null): Meeting {
  return {
    id,
    title: id,
    date,
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

const NOW = new Date('2026-04-26T12:00:00Z').getTime();

describe('pickDefault', () => {
  it('returns null for empty list', () => {
    expect(pickDefault([], NOW)).toBeNull();
  });

  it('ignores meetings without date', () => {
    const m = makeMeeting('a', null);
    expect(pickDefault([m], NOW)).toBeNull();
  });

  it('returns most recent past meeting when past meetings exist', () => {
    const meetings = [
      makeMeeting('future', '2026-05-01T10:00:00Z'),
      makeMeeting('old', '2026-04-10T10:00:00Z'),
      makeMeeting('recent-past', '2026-04-24T10:00:00Z'),
    ];
    expect(pickDefault(meetings, NOW)?.id).toBe('recent-past');
  });

  it('returns earliest future meeting when no past meetings exist', () => {
    const meetings = [
      makeMeeting('far-future', '2026-06-01T10:00:00Z'),
      makeMeeting('soon', '2026-04-30T10:00:00Z'),
    ];
    expect(pickDefault(meetings, NOW)?.id).toBe('soon');
  });

  it('treats meetings starting at exactly now as past', () => {
    const meetings = [makeMeeting('exact', '2026-04-26T12:00:00Z')];
    expect(pickDefault(meetings, NOW)?.id).toBe('exact');
  });

  it('ignores meetings with empty-string date', () => {
    const m = makeMeeting('empty', '');
    expect(pickDefault([m], NOW)).toBeNull();
  });
});

describe('pickNextMeeting', () => {
  it('returns null when no future meetings', () => {
    const meetings = [makeMeeting('past', '2026-04-10T10:00:00Z')];
    expect(pickNextMeeting(meetings, NOW)).toBeNull();
  });

  it('returns earliest future meeting', () => {
    const meetings = [
      makeMeeting('far', '2026-06-01T10:00:00Z'),
      makeMeeting('soon', '2026-04-30T10:00:00Z'),
      makeMeeting('past', '2026-04-10T10:00:00Z'),
    ];
    expect(pickNextMeeting(meetings, NOW)?.id).toBe('soon');
  });

  it('ignores meetings without date', () => {
    const meetings = [
      makeMeeting('null-date', null),
      makeMeeting('soon', '2026-04-30T10:00:00Z'),
    ];
    expect(pickNextMeeting(meetings, NOW)?.id).toBe('soon');
  });

  it('returns null for empty list', () => {
    expect(pickNextMeeting([], NOW)).toBeNull();
  });
});

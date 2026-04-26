import type { Meeting } from '@/schemas/meeting';

/** Returns the most recently created meeting (input is expected to be sorted DESC by createdTime). */
export function pickDefault(meetings: Meeting[]): Meeting | null {
  return meetings[0] ?? null;
}

/**
 * Returns the meeting that came immediately BEFORE `currentId` chronologically.
 * Assumes `meetings` is sorted DESC by createdTime, so the previous (older)
 * meeting is at the index after the current one.
 */
export function pickPreviousMeeting(
  meetings: Meeting[],
  currentId: string | undefined,
): Meeting | null {
  if (!currentId) return null;
  const idx = meetings.findIndex((m) => m.id === currentId);
  if (idx === -1) return null;
  return meetings[idx + 1] ?? null;
}

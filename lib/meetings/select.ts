import type { Meeting } from '@/schemas/meeting';

/** Returns the most recently created meeting (input is expected to be sorted DESC by createdTime). */
export function pickDefault(meetings: Meeting[]): Meeting | null {
  return meetings[0] ?? null;
}

/** Always returns null because created_time can't be in the future. Kept for API stability. */
export function pickNextMeeting(): Meeting | null {
  return null;
}

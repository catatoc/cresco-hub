import type { Meeting } from '@/schemas/meeting';

function withDate(m: Meeting): m is Meeting & { date: string } {
  return m.date !== null;
}

export function pickDefault(meetings: Meeting[], now: number): Meeting | null {
  const dated = meetings.filter(withDate);
  if (dated.length === 0) return null;

  const past = dated
    .filter((m) => new Date(m.date).getTime() <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (past.length > 0) return past[0];

  const future = dated
    .filter((m) => new Date(m.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return future[0] ?? null;
}

export function pickNextMeeting(meetings: Meeting[], now: number): Meeting | null {
  const future = meetings
    .filter(withDate)
    .filter((m) => new Date(m.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return future[0] ?? null;
}

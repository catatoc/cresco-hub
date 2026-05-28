/**
 * Pure helpers for the "Próxima semana" timeline view. No Notion / IO here so
 * the layout math stays trivially testable.
 */

export type WeekDay = {
  iso: string; // yyyy-mm-dd
  dowLabel: string; // lun, mar, …
  dom: number; // day of month
  weekend: boolean;
};

export type BarSpan = {
  offset: number; // 0..6 — first column the bar occupies
  span: number; // 1..7 — number of columns it spans
};

// Indexed by JS getUTCDay() (0 = Sunday).
const DOW_BY_JS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const DAY_MS = 86_400_000;

function parseUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function dayIndex(weekStartISO: string, iso: string): number {
  return Math.round((parseUtc(iso).getTime() - parseUtc(weekStartISO).getTime()) / DAY_MS);
}

/** Seven day cells beginning at `weekStartISO` (the sprint's start date). */
export function buildWeekDays(weekStartISO: string): WeekDay[] {
  const start = parseUtc(weekStartISO).getTime();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + i * DAY_MS);
    const jsDow = d.getUTCDay();
    return {
      iso: d.toISOString().slice(0, 10),
      dowLabel: DOW_BY_JS[jsDow] ?? '',
      dom: d.getUTCDate(),
      weekend: jsDow === 0 || jsDow === 6,
    };
  });
}

/**
 * Where a task's [start..end] range sits within the 7-day week. A missing start
 * falls back to end (and vice-versa), so single-date tasks render as one day.
 * Ranges are clamped to the week; tasks fully outside it return null.
 */
export function taskBarSpan(
  weekStartISO: string,
  startISO: string | null,
  endISO: string | null,
): BarSpan | null {
  const s = startISO ?? endISO;
  const e = endISO ?? startISO;
  if (!s || !e) return null;

  const startIdx = dayIndex(weekStartISO, s);
  const endIdx = dayIndex(weekStartISO, e);
  if (endIdx < 0 || startIdx > 6) return null; // entirely outside the week

  const offset = Math.max(startIdx, 0);
  const lastIdx = Math.min(endIdx, 6);
  return { offset, span: Math.max(lastIdx - offset + 1, 1) };
}

import { startOfWeek, endOfWeek, format, getISOWeek, getISOWeekYear, addWeeks } from 'date-fns';

export function currentCycle(now = new Date()): string {
  return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
}

export function cycleRange(cycle: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = cycle.split('-W');
  const simple = new Date(Number(yearStr), 0, 1 + (Number(weekStr) - 1) * 7);
  const start = startOfWeek(simple, { weekStartsOn: 1 });
  const end = endOfWeek(simple, { weekStartsOn: 1 });
  return { start, end };
}

export function shiftCycle(cycle: string, delta: number): string {
  const { start } = cycleRange(cycle);
  return currentCycle(addWeeks(start, delta));
}

export function formatCycleLabel(cycle: string): string {
  const { start, end } = cycleRange(cycle);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

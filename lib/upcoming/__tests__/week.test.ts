import { describe, it, expect } from 'vitest';
import { buildWeekDays, taskBarSpan } from '../week';

describe('buildWeekDays', () => {
  it('builds 7 days from a Monday start with localized day labels', () => {
    const days = buildWeekDays('2026-06-01');
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ iso: '2026-06-01', dowLabel: 'lun', dom: 1, weekend: false });
    expect(days[6]).toEqual({ iso: '2026-06-07', dowLabel: 'dom', dom: 7, weekend: true });
  });

  it('flags Saturday and Sunday as weekend', () => {
    const days = buildWeekDays('2026-06-01');
    expect(days.filter((d) => d.weekend).map((d) => d.dowLabel)).toEqual(['sáb', 'dom']);
  });

  it('derives labels from the real weekday even when the week does not start on Monday', () => {
    const days = buildWeekDays('2026-06-03'); // a Wednesday
    expect(days[0]?.dowLabel).toBe('mié');
  });
});

describe('taskBarSpan', () => {
  const monday = '2026-06-01';

  it('positions a multi-day range', () => {
    expect(taskBarSpan(monday, '2026-06-03', '2026-06-07')).toEqual({ offset: 2, span: 5 });
  });

  it('positions a two-day range from the start of the week', () => {
    expect(taskBarSpan(monday, '2026-06-01', '2026-06-02')).toEqual({ offset: 0, span: 2 });
  });

  it('renders a single day when only one date is present', () => {
    expect(taskBarSpan(monday, '2026-06-04', null)).toEqual({ offset: 3, span: 1 });
    expect(taskBarSpan(monday, null, '2026-06-04')).toEqual({ offset: 3, span: 1 });
  });

  it('clamps ranges that start before or end after the week', () => {
    expect(taskBarSpan(monday, '2026-05-28', '2026-06-03')).toEqual({ offset: 0, span: 3 });
    expect(taskBarSpan(monday, '2026-06-06', '2026-06-12')).toEqual({ offset: 5, span: 2 });
  });

  it('returns null when the task has no dates', () => {
    expect(taskBarSpan(monday, null, null)).toBeNull();
  });

  it('returns null when the task lies entirely outside the week', () => {
    expect(taskBarSpan(monday, '2026-06-10', '2026-06-12')).toBeNull();
    expect(taskBarSpan(monday, '2026-05-20', '2026-05-25')).toBeNull();
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@/schemas/task';

vi.mock('@/lib/notion/tasks', () => ({ queryTasksByClientAndCycle: vi.fn() }));
vi.mock('@/lib/notion/meetings', () => ({ queryMeetingsByClient: vi.fn() }));
vi.mock('@/lib/notion/wiki', () => ({ queryWikiByClient: vi.fn() }));

import { getHomeData } from '../queries';
import { queryTasksByClientAndCycle } from '@/lib/notion/tasks';
import { queryMeetingsByClient } from '@/lib/notion/meetings';
import { queryWikiByClient } from '@/lib/notion/wiki';

const mkTask = (over: Partial<Task>): Task => ({
  id: 't', number: null, title: '', status: 'Por hacer', priority: null,
  assigneeIds: [], projectId: null, clientId: 'c', cycle: '2026-W17',
  dueDate: null, labels: [], url: 'https://notion.so/t',
  ...over,
});

describe('getHomeData', () => {
  it('returns stats derived from tasks', async () => {
    vi.mocked(queryTasksByClientAndCycle).mockResolvedValueOnce([
      mkTask({ id: 't1', status: 'En progreso' }),
      mkTask({ id: 't2', status: 'Por hacer' }),
      mkTask({ id: 't3', status: 'Hecho' }),
    ]);
    vi.mocked(queryMeetingsByClient).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByClient).mockResolvedValueOnce([]);

    const data = await getHomeData('c', '2026-W17');
    expect(data.stats).toEqual({ inProgress: 1, todo: 1, done: 1, total: 3 });
  });

  it('picks the next upcoming meeting', async () => {
    vi.mocked(queryTasksByClientAndCycle).mockResolvedValueOnce([]);
    const future = new Date(Date.now() + 3600_000).toISOString();
    const past = new Date(Date.now() - 3 * 86400_000).toISOString();
    vi.mocked(queryMeetingsByClient).mockResolvedValueOnce([
      { id: 'past', title: 'P', date: past, endDate: null, meetUrl: null, recurrence: null, facilitatorId: null, attendeeIds: [], clientId: 'c', actionItemIds: [], url: 'https://notion.so/past' },
      { id: 'next', title: 'N', date: future, endDate: null, meetUrl: null, recurrence: null, facilitatorId: null, attendeeIds: [], clientId: 'c', actionItemIds: [], url: 'https://notion.so/next' },
    ]);
    vi.mocked(queryWikiByClient).mockResolvedValueOnce([]);

    const data = await getHomeData('c', '2026-W17');
    expect(data.upcomingMeeting?.id).toBe('next');
  });

  it('limits myTasksToday to 5 and excludes done', async () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.mocked(queryTasksByClientAndCycle).mockResolvedValueOnce([
      ...Array.from({ length: 6 }, (_, i) => mkTask({ id: `t${i}`, dueDate: today, status: 'Por hacer' })),
      mkTask({ id: 'done', dueDate: today, status: 'Hecho' }),
    ]);
    vi.mocked(queryMeetingsByClient).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByClient).mockResolvedValueOnce([]);

    const data = await getHomeData('c', '2026-W17');
    expect(data.myTasksToday).toHaveLength(5);
    expect(data.myTasksToday.every((t) => t.status !== 'Hecho')).toBe(true);
  });
});

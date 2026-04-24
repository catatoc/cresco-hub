import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@/schemas/task';
import type { Meeting } from '@/schemas/meeting';

vi.mock('@/lib/notion/tasks', () => ({ queryTasksByCustomerAndSprint: vi.fn() }));
vi.mock('@/lib/notion/meetings', () => ({ queryMeetingsByCustomer: vi.fn() }));
vi.mock('@/lib/notion/wiki', () => ({ queryWikiByCustomer: vi.fn() }));

import { getHomeData } from '../queries';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { queryWikiByCustomer } from '@/lib/notion/wiki';

const mkTask = (over: Partial<Task>): Task => ({
  id: 't',
  title: '',
  status: 'Not Started',
  priority: null,
  type: null,
  assigneeIds: [],
  projectId: null,
  customerId: 'c',
  sprintId: 'sprint-17',
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://notion.so/t',
  ...over,
});

const mkMeeting = (over: Partial<Meeting>): Meeting => ({
  id: 'm',
  title: '',
  date: null,
  endDate: null,
  meetingType: null,
  attendeeIds: [],
  customerId: 'c',
  projectIds: [],
  teamIds: [],
  taskIds: [],
  wikiIds: [],
  url: 'https://notion.so/m',
  ...over,
});

describe('getHomeData', () => {
  it('returns stats derived from tasks', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([
      mkTask({ id: 't1', status: 'In Progress' }),
      mkTask({ id: 't2', status: 'Not Started' }),
      mkTask({ id: 't3', status: 'Done' }),
    ]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.stats).toEqual({ inProgress: 1, todo: 1, done: 1, total: 3 });
  });

  it('picks the next upcoming meeting', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    const future = new Date(Date.now() + 3600_000).toISOString();
    const past = new Date(Date.now() - 3 * 86400_000).toISOString();
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([
      mkMeeting({ id: 'past', title: 'P', date: past }),
      mkMeeting({ id: 'next', title: 'N', date: future }),
    ]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.upcomingMeeting?.id).toBe('next');
  });

  it('limits myTasksToday to 5 and excludes done', async () => {
    const today = new Date().toISOString().slice(0, 10);
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([
      ...Array.from({ length: 6 }, (_, i) =>
        mkTask({ id: `t${i}`, dueDate: today, status: 'Not Started' }),
      ),
      mkTask({ id: 'done', dueDate: today, status: 'Done' }),
    ]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.myTasksToday).toHaveLength(5);
    expect(data.myTasksToday.every((t: Task) => t.status !== 'Done')).toBe(true);
  });
});

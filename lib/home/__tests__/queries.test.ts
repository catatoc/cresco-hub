import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@/schemas/task';
import type { Meeting } from '@/schemas/meeting';
import type { Project } from '@/schemas/project';

vi.mock('@/lib/notion/tasks', () => ({ queryTasksByCustomerAndSprint: vi.fn() }));
vi.mock('@/lib/notion/meetings', () => ({ queryMeetingsByCustomer: vi.fn() }));
vi.mock('@/lib/notion/wiki', () => ({ queryWikiByCustomer: vi.fn() }));
vi.mock('@/lib/notion/projects', () => ({ queryProjectsByCustomer: vi.fn() }));

import { getHomeData } from '../queries';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import { queryProjectsByCustomer } from '@/lib/notion/projects';

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
  createdTime: '2026-01-01T00:00:00.000Z',
  date: null,
  endDate: null,
  meetingType: null,
  summary: null,
  attendeeIds: [],
  customerId: 'c',
  projectIds: [],
  teamIds: [],
  taskIds: [],
  wikiIds: [],
  url: 'https://notion.so/m',
  ...over,
});

const mkProject = (over: Partial<Project>): Project => ({
  id: 'p',
  name: '',
  icon: null,
  summary: null,
  repoUrl: null,
  status: 'In Progress',
  priority: null,
  completion: null,
  ownerIds: [],
  customerId: 'c',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p',
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
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.stats).toEqual({ inProgress: 1, todo: 1, done: 1, total: 3 });
  });

  it('picks the most recent meeting (first in DESC list)', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([
      mkMeeting({ id: 'newest', title: 'N', createdTime: '2026-04-24T10:00:00Z' }),
      mkMeeting({ id: 'older', title: 'O', createdTime: '2026-04-10T10:00:00Z' }),
    ]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.lastMeeting?.id).toBe('newest');
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
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.myTasksToday).toHaveLength(5);
    expect(data.myTasksToday.every((t: Task) => t.status !== 'Done')).toBe(true);
  });

  it('returns active projects sorted by status then completion desc, capped at 6', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([
      mkProject({ id: 'a', name: 'A', status: 'Planning', completion: 0.9 }),
      mkProject({ id: 'b', name: 'B', status: 'In Progress', completion: 0.2 }),
      mkProject({ id: 'c', name: 'C', status: 'In Progress', completion: 0.8 }),
      mkProject({ id: 'd', name: 'D', status: 'Paused', completion: 0.5 }),
      mkProject({ id: 'e', name: 'E', status: 'In Progress', completion: 0.5 }),
      mkProject({ id: 'f', name: 'F', status: 'In Progress', completion: 0.1 }),
      mkProject({ id: 'g', name: 'G', status: 'In Progress', completion: 0.95 }),
    ]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.activeProjects.map((p) => p.id)).toEqual(['g', 'c', 'e', 'b', 'f', 'a']);
  });

  it('excludes Done, Canceled, Backlog from activeProjects', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([
      mkProject({ id: 'live', status: 'In Progress' }),
      mkProject({ id: 'done', status: 'Done' }),
      mkProject({ id: 'cancel', status: 'Canceled' }),
      mkProject({ id: 'backlog', status: 'Backlog' }),
    ]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.activeProjects.map((p) => p.id)).toEqual(['live']);
  });

  it('attaches openTaskCount and recentlyActive from tasks', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([
      mkTask({ id: 't1', projectId: 'p1', status: 'In Progress' }),
      mkTask({ id: 't2', projectId: 'p1', status: 'Not Started' }),
      mkTask({ id: 't3', projectId: 'p1', status: 'Done' }),
      mkTask({ id: 't4', projectId: 'p1', status: 'Archived' }),
      mkTask({ id: 't5', projectId: 'p2', status: 'Done' }),
    ]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([
      mkProject({ id: 'p1', status: 'In Progress' }),
      mkProject({ id: 'p2', status: 'In Progress' }),
    ]);

    const data = await getHomeData('c', 'sprint-17');
    const p1 = data.activeProjects.find((p) => p.id === 'p1')!;
    const p2 = data.activeProjects.find((p) => p.id === 'p2')!;
    expect(p1.openTaskCount).toBe(2);
    expect(p1.recentlyActive).toBe(true);
    expect(p2.openTaskCount).toBe(0);
    expect(p2.recentlyActive).toBe(false);
  });

  it('caps activeProjects at 6', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) =>
        mkProject({ id: `p${i}`, status: 'In Progress', completion: i / 10 }),
      ),
    );

    const data = await getHomeData('c', 'sprint-17');
    expect(data.activeProjects).toHaveLength(6);
  });
});

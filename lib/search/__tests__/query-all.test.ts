import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/tasks', () => ({ queryTasksByCustomerAndTitle: vi.fn() }));
vi.mock('@/lib/notion/meetings', () => ({ queryMeetingsByCustomerAndTitle: vi.fn() }));
vi.mock('@/lib/notion/wiki', () => ({ queryWikiByCustomerAndTitle: vi.fn() }));
vi.mock('@/lib/notion/projects', () => ({ queryProjectsByCustomerAndTitle: vi.fn() }));
vi.mock('@/lib/notion/team', () => ({ queryMembersByCustomerAndName: vi.fn() }));

import { queryTasksByCustomerAndTitle } from '@/lib/notion/tasks';
import { queryMeetingsByCustomerAndTitle } from '@/lib/notion/meetings';
import { queryWikiByCustomerAndTitle } from '@/lib/notion/wiki';
import { queryProjectsByCustomerAndTitle } from '@/lib/notion/projects';
import { queryMembersByCustomerAndName } from '@/lib/notion/team';
import { queryAll } from '../query-all';

beforeEach(() => {
  vi.mocked(queryTasksByCustomerAndTitle).mockReset();
  vi.mocked(queryMeetingsByCustomerAndTitle).mockReset();
  vi.mocked(queryWikiByCustomerAndTitle).mockReset();
  vi.mocked(queryProjectsByCustomerAndTitle).mockReset();
  vi.mocked(queryMembersByCustomerAndName).mockReset();
});

describe('queryAll', () => {
  it('skips Notion calls and returns empty groups when term length < 2', async () => {
    const res = await queryAll({ customerId: 'c1', term: 'a', filter: 'all' });
    expect(res.groups).toEqual([]);
    expect(queryTasksByCustomerAndTitle).not.toHaveBeenCalled();
  });

  it('calls all five entity queries when filter is "all"', async () => {
    vi.mocked(queryTasksByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryMeetingsByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryWikiByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryProjectsByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryMembersByCustomerAndName).mockResolvedValue([]);

    await queryAll({ customerId: 'c1', term: 'kick', filter: 'all' });
    expect(queryTasksByCustomerAndTitle).toHaveBeenCalledWith('c1', 'kick');
    expect(queryMeetingsByCustomerAndTitle).toHaveBeenCalledWith('c1', 'kick');
    expect(queryWikiByCustomerAndTitle).toHaveBeenCalledWith('c1', 'kick');
    expect(queryProjectsByCustomerAndTitle).toHaveBeenCalledWith('c1', 'kick');
    expect(queryMembersByCustomerAndName).toHaveBeenCalledWith('c1', 'kick');
  });

  it('only calls tasks when filter is "tasks"', async () => {
    vi.mocked(queryTasksByCustomerAndTitle).mockResolvedValue([]);
    await queryAll({ customerId: 'c1', term: 'kick', filter: 'tasks' });
    expect(queryTasksByCustomerAndTitle).toHaveBeenCalled();
    expect(queryMeetingsByCustomerAndTitle).not.toHaveBeenCalled();
  });

  it('maps a task result to SearchItem with score > 0', async () => {
    vi.mocked(queryTasksByCustomerAndTitle).mockResolvedValue([
      {
        id: 't1', title: 'Kickoff prep', status: 'In Progress', priority: 'High',
        type: '✅ Task', assigneeIds: [], projectId: null, customerId: 'c1', sprintId: null,
        dueDate: null, plannedDate: null, completedAt: null, tags: [], progress: null,
        url: 'https://notion.so/t1',
      } as any,
    ]);
    vi.mocked(queryMeetingsByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryWikiByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryProjectsByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryMembersByCustomerAndName).mockResolvedValue([]);

    const res = await queryAll({ customerId: 'c1', term: 'kick', filter: 'all' });
    const tasks = res.groups.find((g) => g.type === 'tasks')!;
    expect(tasks.items[0]).toMatchObject({
      id: 't1',
      type: 'task',
      title: 'Kickoff prep',
      url: '/tareas/t1',
    });
    expect(tasks.items[0]!.score).toBeGreaterThan(0);
  });

  it('reports partial failures without throwing', async () => {
    vi.mocked(queryTasksByCustomerAndTitle).mockRejectedValue(new Error('boom'));
    vi.mocked(queryMeetingsByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryWikiByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryProjectsByCustomerAndTitle).mockResolvedValue([]);
    vi.mocked(queryMembersByCustomerAndName).mockResolvedValue([]);

    const res = await queryAll({ customerId: 'c1', term: 'kick', filter: 'all' });
    expect(res.partialFailures).toEqual([{ type: 'tasks', reason: 'boom' }]);
  });
});

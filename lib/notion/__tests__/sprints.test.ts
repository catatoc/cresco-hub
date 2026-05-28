import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_SPRINTS: 'sprints-db' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  pages: { retrieve: vi.fn() },
};

import type { Sprint } from '@/schemas/sprint';
import { getCurrentSprint, listSprints, selectUpcomingSprint } from '../sprints';

describe('getCurrentSprint', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters sprints by status = Current', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'sprint-1',
          properties: {
            'Sprint name': { title: [{ plain_text: 'Sprint 7' }] },
            'Sprint ID': { unique_id: { number: 7 } },
            'Sprint status': { status: { name: 'Current' } },
            Dates: { date: { start: '2026-04-21', end: '2026-05-04' } },
          },
        },
      ],
    });

    const sprint = await getCurrentSprint();

    expect(sprint).toEqual({
      id: 'sprint-1',
      sprintId: 7,
      name: 'Sprint 7',
      status: 'Current',
      startDate: '2026-04-21',
      endDate: '2026-05-04',
    });
    expect(mockNotion.dataSources.query).toHaveBeenCalledWith({
      data_source_id: 'sprints-db',
      filter: { property: 'Sprint status', status: { equals: 'Current' } },
      page_size: 1,
    });
  });
});

describe('listSprints', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('parses Sprint name, Sprint ID and Dates', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'sprint-2',
          properties: {
            'Sprint name': { title: [{ plain_text: 'Sprint 8' }] },
            'Sprint ID': { unique_id: { number: 8 } },
            'Sprint status': { status: { name: 'Next' } },
            Dates: { date: { start: '2026-05-05', end: '2026-05-18' } },
          },
        },
        {
          id: 'sprint-1',
          properties: {
            'Sprint name': { title: [{ plain_text: 'Sprint 7' }] },
            'Sprint ID': { unique_id: { number: 7 } },
            'Sprint status': { status: { name: 'Current' } },
            Dates: { date: { start: '2026-04-21', end: '2026-05-04' } },
          },
        },
      ],
    });

    const sprints = await listSprints();

    expect(sprints).toHaveLength(2);
    expect(sprints[0]).toMatchObject({
      id: 'sprint-2',
      sprintId: 8,
      name: 'Sprint 8',
      status: 'Next',
      startDate: '2026-05-05',
      endDate: '2026-05-18',
    });
    expect(sprints[1]).toMatchObject({
      id: 'sprint-1',
      sprintId: 7,
      name: 'Sprint 7',
      status: 'Current',
    });
  });
});

describe('selectUpcomingSprint', () => {
  const s = (over: Partial<Sprint>): Sprint => ({
    id: 'x',
    sprintId: null,
    name: 'S',
    status: 'Future',
    startDate: null,
    endDate: null,
    ...over,
  });

  it('returns the earliest sprint starting after the current sprint ends', () => {
    const sprints = [
      s({ id: 'cur', status: 'Current', startDate: '2026-05-18', endDate: '2026-05-31' }),
      s({ id: 'w2', startDate: '2026-06-08', endDate: '2026-06-14' }),
      s({ id: 'w1', startDate: '2026-06-01', endDate: '2026-06-07' }),
    ];
    expect(selectUpcomingSprint(sprints, '2026-05-28')?.id).toBe('w1');
  });

  it('falls back to today when there is no current sprint', () => {
    const sprints = [
      s({ id: 'past', status: 'Past', startDate: '2026-05-01', endDate: '2026-05-07' }),
      s({ id: 'next', startDate: '2026-06-01', endDate: '2026-06-07' }),
    ];
    expect(selectUpcomingSprint(sprints, '2026-05-28')?.id).toBe('next');
  });

  it('returns null when no sprint starts after the anchor', () => {
    const sprints = [
      s({ id: 'cur', status: 'Current', startDate: '2026-05-18', endDate: '2026-05-31' }),
      s({ id: 'old', status: 'Past', startDate: '2026-05-01', endDate: '2026-05-07' }),
    ];
    expect(selectUpcomingSprint(sprints, '2026-05-28')).toBeNull();
  });

  it('ignores sprints without a start date', () => {
    const sprints = [
      s({ id: 'cur', status: 'Current', startDate: '2026-05-18', endDate: '2026-05-31' }),
      s({ id: 'nodate', startDate: null }),
      s({ id: 'w1', startDate: '2026-06-01', endDate: '2026-06-07' }),
    ];
    expect(selectUpcomingSprint(sprints, '2026-05-28')?.id).toBe('w1');
  });
});

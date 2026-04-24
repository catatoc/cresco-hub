import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({
  serverEnv: {
    NOTION_DB_TASKS: 'tasks-ds',
    NOTION_DB_MEETINGS: 'meetings-ds',
    NOTION_DB_WIKI: 'wiki-ds',
    NOTION_DB_PROJECTS: 'projects-ds',
    NOTION_DB_TEAM: 'team-ds',
  },
}));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryTasksByCustomerAndTitle } from '../tasks';
import { queryMeetingsByCustomerAndTitle } from '../meetings';
import { queryWikiByCustomerAndTitle } from '../wiki';
import { queryProjectsByCustomerAndTitle } from '../projects';
import { queryMembersByCustomerAndName } from '../team';

beforeEach(() => mockNotion.dataSources.query.mockReset());

describe('queryTasksByCustomerAndTitle', () => {
  it('sends customer + title contains filter with page_size 8', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryTasksByCustomerAndTitle('cust-1', 'kick');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call).toMatchObject({
      data_source_id: 'tasks-ds',
      page_size: 8,
      filter: {
        and: [
          { property: 'Customer', relation: { contains: 'cust-1' } },
          { property: 'Task name', title: { contains: 'kick' } },
        ],
      },
    });
  });
});

describe('queryMeetingsByCustomerAndTitle', () => {
  it('uses Name title property', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryMeetingsByCustomerAndTitle('cust-1', 'weekly');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter.and[1]).toEqual({ property: 'Name', title: { contains: 'weekly' } });
  });
});

describe('queryWikiByCustomerAndTitle', () => {
  it('uses Doc name title property', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryWikiByCustomerAndTitle('cust-1', 'onboard');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter.and[1]).toEqual({ property: 'Doc name', title: { contains: 'onboard' } });
  });
});

describe('queryProjectsByCustomerAndTitle', () => {
  it('uses Project name title property', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryProjectsByCustomerAndTitle('cust-1', 'mogos');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter.and[1]).toEqual({ property: 'Project name', title: { contains: 'mogos' } });
  });
});

describe('queryMembersByCustomerAndName', () => {
  it('filters by Customers relation + Name title contains', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryMembersByCustomerAndName('cust-1', 'dani');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call).toMatchObject({
      data_source_id: 'team-ds',
      page_size: 8,
      filter: {
        and: [
          { property: 'Customers', relation: { contains: 'cust-1' } },
          { property: 'Name', title: { contains: 'dani' } },
        ],
      },
    });
  });
});

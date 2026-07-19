import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
  pages: { create: vi.fn(), update: vi.fn() },
  blocks: { children: { append: vi.fn() } },
};

import {
  listBugTasks,
  findBugByExternalKey,
  createBugTask,
  updateBugMirror,
} from '../notion-bugs';
import type { NormalizedIssue } from '@/schemas/integrations/error-issue';

const ISSUE: NormalizedIssue = {
  externalId: '019e714d',
  provider: 'posthog',
  externalProjectId: '94699',
  name: 'DOMException',
  description: 'AbortError: Lock was stolen',
  status: 'active',
  occurrences: 69,
  users: 1,
  sessions: 2,
  library: 'web',
  sourceFile: null,
  firstSeen: '2026-05-28T21:16:19-04:00',
  lastSeen: '2026-06-04T10:33:43-04:00',
  url: 'https://us.posthog.com/project/94699/error_tracking/019e714d',
};

beforeEach(() => {
  mockNotion.dataSources.query.mockReset();
  mockNotion.pages.create.mockReset();
  mockNotion.pages.update.mockReset();
  mockNotion.blocks.children.append.mockReset();
});

describe('listBugTasks', () => {
  it('filters by External Key prefix and parses rows', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-1',
          properties: {
            'External Key': { rich_text: [{ plain_text: 'posthog:94699:019e714d' }] },
            Status: { status: { name: 'Done' } },
            'Last Synced Status': { rich_text: [{ plain_text: 'open' }] },
          },
        },
      ],
      has_more: false,
      next_cursor: null,
    });
    const rows = await listBugTasks('posthog:94699:');
    expect(mockNotion.dataSources.query.mock.calls[0]![0].filter).toEqual({
      property: 'External Key',
      rich_text: { starts_with: 'posthog:94699:' },
    });
    expect(rows).toEqual([
      {
        id: 'task-1',
        externalKey: 'posthog:94699:019e714d',
        status: 'Done',
        lastSyncedStatus: 'open',
        externalStatus: null,
        externalCount: null,
        externalLastSeen: null,
        environments: [],
      },
    ]);
  });
});

describe('findBugByExternalKey', () => {
  it('returns the row on exact match', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-9',
          properties: {
            'External Key': { rich_text: [{ plain_text: 'posthog:94699:019e714d' }] },
            Status: { status: { name: 'Not Started' } },
            'Last Synced Status': { rich_text: [] },
          },
        },
      ],
    });
    const row = await findBugByExternalKey('posthog:94699:019e714d');
    expect(mockNotion.dataSources.query.mock.calls[0]![0].filter).toEqual({
      property: 'External Key',
      rich_text: { equals: 'posthog:94699:019e714d' },
    });
    expect(row).toMatchObject({ id: 'task-9', lastSyncedStatus: null });
  });

  it('returns null when nothing matches', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    expect(await findBugByExternalKey('posthog:94699:nope')).toBeNull();
  });
});

describe('createBugTask', () => {
  it('writes Bug type, status, External* fields, relations, and a summary block', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'new-1', url: 'https://notion.so/new-1' });
    const out = await createBugTask({
      externalKey: 'posthog:94699:019e714d',
      issue: ISSUE,
      target: { notionProviderId: 'prov-ph', notionCustomerId: 'cust-amedi', notionProjectId: null },
      internalStatus: 'Not Started',
      lastSyncedStatus: 'open',
    });
    expect(out).toEqual({ id: 'new-1', url: 'https://notion.so/new-1' });

    const call = mockNotion.pages.create.mock.calls[0]![0];
    const props = call.properties;
    expect(props['Task name'].title[0].text.content).toBe(
      'bug(posthog): DOMException — AbortError: Lock was stolen',
    );
    expect(call.icon).toEqual({ type: 'emoji', emoji: '🐛' });
    expect(props.Type).toEqual({ select: { name: '🐛 Bug' } });
    expect(props.Status).toEqual({ status: { name: 'Not Started' } });
    expect(props['External Key'].rich_text[0].text.content).toBe('posthog:94699:019e714d');
    expect(props['External URL']).toEqual({ url: ISSUE.url });
    expect(props['External Status']).toEqual({ select: { name: 'active' } });
    expect(props['External Count']).toEqual({ number: 69 });
    expect(props['External Last Seen']).toEqual({ date: { start: ISSUE.lastSeen } });
    expect(props['Last Synced Status'].rich_text[0].text.content).toBe('open');
    expect(props.Source).toEqual({ relation: [{ id: 'prov-ph' }] });
    expect(props.Customer).toEqual({ relation: [{ id: 'cust-amedi' }] });
    expect(props.Project).toBeUndefined();

    const appended = mockNotion.blocks.children.append.mock.calls[0]![0];
    expect(appended.block_id).toBe('new-1');
    expect(appended.children[0].type).toBe('callout');
    expect(appended.children[1].paragraph.rich_text[0].text.link.url).toBe(ISSUE.url);
  });

  it('adds a 📍 contexto callout and a replay link when context is present', async () => {
    mockNotion.pages.create.mockResolvedValueOnce({ id: 'new-2', url: 'u' });
    await createBugTask({
      externalKey: 'k',
      issue: ISSUE,
      target: { notionProviderId: null, notionCustomerId: null, notionProjectId: null },
      internalStatus: 'Not Started',
      lastSyncedStatus: 'open',
      context: {
        currentUrl: 'https://app/login',
        browser: 'Chrome 147',
        os: 'Mac OS X',
        handled: false,
        topFrame: 'fn @ a.ts:1',
        environments: ['dev'],
        replayUrl: 'https://ph/replay/s1',
      },
    });
    const call = mockNotion.pages.create.mock.calls[0]![0];
    expect(call.properties['Task name'].title[0].text.content).toBe(
      '[dev] bug(posthog): DOMException — AbortError: Lock was stolen',
    );
    expect(call.properties.Environment).toEqual({ multi_select: [{ name: 'dev' }] });
    const children = mockNotion.blocks.children.append.mock.calls[0]![0].children;
    expect(children[1].callout.icon.emoji).toBe('📍');
    const ctxText = children[1].callout.rich_text[0].text.content;
    expect(ctxText).toContain('ambiente: dev');
    expect(ctxText).toContain('url: https://app/login');
    expect(ctxText).toContain('captura: sin manejar');
    expect(ctxText).toContain('frame: fn @ a.ts:1');
    const link = children[2].paragraph.rich_text;
    expect(link[0].text.link.url).toBe(ISSUE.url);
    expect(link[1].text.link.url).toBe('https://ph/replay/s1');
  });
});

describe('updateBugMirror', () => {
  it('updates only the mirror fields, never the internal Status', async () => {
    mockNotion.pages.update.mockResolvedValueOnce({ id: 'task-1' });
    await updateBugMirror('task-1', { ...ISSUE, occurrences: 70, status: 'resolved' });
    const call = mockNotion.pages.update.mock.calls[0]![0];
    expect(call.page_id).toBe('task-1');
    expect(call.properties).toEqual({
      'External Status': { select: { name: 'resolved' } },
      'External Count': { number: 70 },
      'External Last Seen': { date: { start: ISSUE.lastSeen } },
    });
    expect(call.properties.Status).toBeUndefined();
  });
});

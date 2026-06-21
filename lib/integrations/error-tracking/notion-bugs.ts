import { getNotion } from '@/lib/notion/client';
import { serverEnv } from '@/lib/env';
import { queryAllPages } from '@/lib/notion/pagination';
import type { NormalizedIssue } from '@/schemas/integrations/error-issue';
import type { IssueContext } from '@/lib/integrations/error-tracking/types';

const BUG_TYPE = '🐛 Bug';

/** The slice of a Notion Bug task the reconcile engine reasons about. */
export interface BugTaskRow {
  id: string;
  externalKey: string;
  /** Internal Status name (Done / Archived / In Progress / …). */
  status: string;
  /** Snapshot of the open/closed bit from the last sync (for the 3-way merge). */
  lastSyncedStatus: string | null;
  /** Current mirror values — used to skip redundant writes when nothing changed. */
  externalStatus: string | null;
  externalCount: number | null;
  externalLastSeen: string | null;
}

/** Where a new Bug task gets attached in Notion (from the registry row). */
export interface BugTaskTarget {
  notionProviderId: string | null;
  notionCustomerId: string | null;
  notionProjectId: string | null;
}

function parseBugRow(page: { id: string; properties: Record<string, any> }): BugTaskRow {
  const p = page.properties;
  return {
    id: page.id,
    externalKey: p['External Key']?.rich_text?.[0]?.plain_text ?? '',
    status: p.Status?.status?.name ?? '',
    lastSyncedStatus: p['Last Synced Status']?.rich_text?.[0]?.plain_text ?? null,
    externalStatus: p['External Status']?.select?.name ?? null,
    externalCount: typeof p['External Count']?.number === 'number' ? p['External Count'].number : null,
    externalLastSeen: p['External Last Seen']?.date?.start ?? null,
  };
}

/** All Bug tasks whose External Key starts with `prefix` (e.g. `posthog:94699:`). */
export async function listBugTasks(prefix: string): Promise<BugTaskRow[]> {
  const notion = getNotion();
  const { items } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_TASKS,
        filter: { property: 'External Key', rich_text: { starts_with: prefix } },
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap: 2000 },
  );
  return items.filter((r: any) => 'properties' in r).map((r: any) => parseBugRow(r));
}

/** Find a single Bug task by its exact External Key, or null. */
export async function findBugByExternalKey(externalKey: string): Promise<BugTaskRow | null> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TASKS,
    filter: { property: 'External Key', rich_text: { equals: externalKey } },
    page_size: 1,
  });
  const first = res.results.find((r: any) => 'properties' in r) as
    | { id: string; properties: Record<string, any> }
    | undefined;
  return first ? parseBugRow(first) : null;
}

/** ISO `2026-05-28T21:16:19.251000-04:00` → `2026-05-28 21:16` (keeps the local time). */
const fmtTs = (ts: string) => `${ts.slice(0, 10)} ${ts.slice(11, 16)}`;

function calloutBlock(emoji: string, content: string) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      icon: { type: 'emoji', emoji },
      // Notion caps a single rich_text object at 2000 chars — guard against a long URL/frame.
      rich_text: [{ type: 'text', text: { content: content.slice(0, 2000) } }],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summaryBlocks(issue: NormalizedIssue, context: IssueContext | null): any[] {
  const metrics = [
    `estado: ${issue.status}`,
    `librería: ${issue.library ?? '—'}`,
    `archivo: ${issue.sourceFile ?? '—'}`,
    `ocurrencias: ${issue.occurrences} · usuarios: ${issue.users} · sesiones: ${issue.sessions}`,
    `primera vez: ${fmtTs(issue.firstSeen)}`,
    `última vez: ${fmtTs(issue.lastSeen)}`,
  ].join('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [calloutBlock('🐛', metrics)];

  if (context) {
    const ctx: string[] = [];
    if (context.environment) ctx.push(`ambiente: ${context.environment}`);
    if (context.currentUrl) ctx.push(`url: ${context.currentUrl}`);
    const env = [context.browser, context.os].filter(Boolean).join(' · ');
    if (env) ctx.push(`entorno: ${env}`);
    if (context.handled !== null) ctx.push(`captura: ${context.handled ? 'manejado' : 'sin manejar'}`);
    if (context.topFrame) ctx.push(`frame: ${context.topFrame}`);
    if (ctx.length) blocks.push(calloutBlock('📍', ctx.join('\n')));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkRt: any[] = [
    { type: 'text', text: { content: '🔗 Abrir en PostHog', link: { url: issue.url } } },
  ];
  if (context?.replayUrl) {
    linkRt.push({ type: 'text', text: { content: '   ·   ▶️ Session replay', link: { url: context.replayUrl } } });
  }
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: linkRt } });

  return blocks;
}

/**
 * Create a Bug task for an error issue. The caller (reconcile) decides the
 * internal `Status` and the `lastSyncedStatus` snapshot; this just writes them.
 * Body holds a lightweight summary — never stack traces (those live in PostHog).
 */
export async function createBugTask(args: {
  externalKey: string;
  issue: NormalizedIssue;
  target: BugTaskTarget;
  internalStatus: string;
  lastSyncedStatus: string;
  context?: IssueContext | null;
}): Promise<{ id: string; url: string }> {
  const { externalKey, issue, target, internalStatus, lastSyncedStatus, context } = args;
  const notion = getNotion();

  const envTag =
    context?.environment && context.environment !== 'production' ? `[${context.environment}] ` : '';
  const title = `${envTag}bug(${issue.provider}): ${issue.name} — ${issue.description}`
    .trim()
    .slice(0, 200);
  const properties: Record<string, any> = {
    'Task name': { title: [{ text: { content: title } }] },
    Type: { select: { name: BUG_TYPE } },
    Status: { status: { name: internalStatus } },
    'External Key': { rich_text: [{ type: 'text', text: { content: externalKey } }] },
    'External URL': { url: issue.url },
    'External Status': { select: { name: issue.status } },
    'External Count': { number: issue.occurrences },
    'External Last Seen': { date: { start: issue.lastSeen } },
    'Last Synced Status': { rich_text: [{ type: 'text', text: { content: lastSyncedStatus } }] },
    'Error Message': { rich_text: [{ type: 'text', text: { content: issue.description.slice(0, 2000) } }] },
  };
  if (target.notionProviderId) properties.Source = { relation: [{ id: target.notionProviderId }] };
  if (target.notionCustomerId) properties.Customer = { relation: [{ id: target.notionCustomerId }] };
  if (target.notionProjectId) properties.Project = { relation: [{ id: target.notionProjectId }] };

  const res = await notion.pages.create({
    parent: { data_source_id: serverEnv.NOTION_DB_TASKS },
    icon: { type: 'emoji', emoji: '🐛' },
    properties,
  });
  const id = (res as any).id as string;
  const url = (res as any).url as string;

  await notion.blocks.children.append({
    block_id: id,
    children: summaryBlocks(issue, context ?? null),
  });

  return { id, url };
}

/**
 * Refresh the read-only mirror fields (counts, provider status, last seen).
 * Does NOT touch the internal `Status` — that is the reconcile's job.
 */
export async function updateBugMirror(taskId: string, issue: NormalizedIssue): Promise<void> {
  const notion = getNotion();
  await notion.pages.update({
    page_id: taskId,
    properties: {
      'External Status': { select: { name: issue.status } },
      'External Count': { number: issue.occurrences },
      'External Last Seen': { date: { start: issue.lastSeen } },
    },
  });
}

/** Set the internal Status and the open/closed snapshot in one update. */
export async function setBugInternalStatus(
  taskId: string,
  status: string,
  snapshot: 'open' | 'closed',
): Promise<void> {
  await getNotion().pages.update({
    page_id: taskId,
    properties: {
      Status: { status: { name: status } },
      'Last Synced Status': { rich_text: [{ type: 'text', text: { content: snapshot } }] },
    },
  });
}

/** Persist only the open/closed snapshot (when the two sides already agree). */
export async function setBugSnapshot(taskId: string, snapshot: 'open' | 'closed'): Promise<void> {
  await getNotion().pages.update({
    page_id: taskId,
    properties: {
      'Last Synced Status': { rich_text: [{ type: 'text', text: { content: snapshot } }] },
    },
  });
}

/** Append a "bug reappeared" note to the task body (audit trail on recurrence). */
export async function appendReopenNote(taskId: string, issue: NormalizedIssue): Promise<void> {
  await getNotion().blocks.children.append({
    block_id: taskId,
    children: [
      {
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🔁' },
          rich_text: [
            {
              type: 'text',
              text: {
                content: `Reapareció — última vez ${fmtTs(issue.lastSeen)} · ${issue.occurrences} ocurrencias`,
              },
            },
          ],
        },
      },
    ],
  });
}

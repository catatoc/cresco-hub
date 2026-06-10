// lib/notion/tasks-blocks.ts
import { getNotion } from './client';

export type ReplaceTaskBlocksError = Error & {
  stage: 'delete' | 'append' | 'update';
  remaining?: number;
};

const DELETE_CONCURRENCY = 5;
const APPEND_CONCURRENCY = 3;
const UPDATE_CONCURRENCY = 5;

function makeError(
  stage: 'delete' | 'append' | 'update',
  message: string,
  remaining?: number,
): ReplaceTaskBlocksError {
  const err = new Error(message) as ReplaceTaskBlocksError;
  err.stage = stage;
  if (typeof remaining === 'number') err.remaining = remaining;
  return err;
}

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const workers: Promise<void>[] = [];
  const workerCount = Math.min(limit, items.length);
  for (let w = 0; w < workerCount; w++) {
    workers.push(
      (async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= items.length) break;
          await fn(items[idx]!);
        }
      })(),
    );
  }
  await Promise.all(workers);
}

// --- Fingerprinting -----------------------------------------------------------
//
// Old blocks come from Notion's list response (with `plain_text`, `href`,
// `color: 'default'`, etc.). New blocks come from `proseMirrorToNotionBlocks`
// (with `text.content`, `text.link.url`, no `color`). To compare them we
// normalize both sides to the same canonical shape per type.

type AnyBlock = { id?: string; type?: string; [k: string]: unknown };

type RT = {
  plain_text?: string;
  text?: { content?: string; link?: { url?: string } | null };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
  href?: string | null;
};

function normalizeRichText(rt: RT[] | undefined): unknown[] {
  if (!rt || rt.length === 0) return [];
  return rt.map((r) => ({
    text: r.plain_text ?? r.text?.content ?? '',
    bold: r.annotations?.bold ?? false,
    italic: r.annotations?.italic ?? false,
    strike: r.annotations?.strikethrough ?? false,
    code: r.annotations?.code ?? false,
    href: r.href ?? r.text?.link?.url ?? null,
  }));
}

export function fingerprintBlock(block: AnyBlock): string {
  const t = block.type ?? '__no_type__';
  let payload: unknown;
  switch (t) {
    case 'paragraph':
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'quote':
    case 'bulleted_list_item':
    case 'numbered_list_item': {
      const inner = block[t] as { rich_text?: RT[] } | undefined;
      payload = { rt: normalizeRichText(inner?.rich_text) };
      break;
    }
    case 'callout': {
      const inner = block.callout as
        | { icon?: { type?: string; emoji?: string }; rich_text?: RT[] }
        | undefined;
      payload = {
        emoji: inner?.icon?.emoji ?? '',
        rt: normalizeRichText(inner?.rich_text),
      };
      break;
    }
    case 'code': {
      const inner = block.code as
        | { language?: string; rich_text?: RT[] }
        | undefined;
      payload = {
        lang: inner?.language ?? 'plain text',
        rt: normalizeRichText(inner?.rich_text),
      };
      break;
    }
    case 'to_do': {
      const inner = block.to_do as
        | { checked?: boolean; rich_text?: RT[] }
        | undefined;
      payload = {
        checked: inner?.checked === true,
        rt: normalizeRichText(inner?.rich_text),
      };
      break;
    }
    case 'divider':
      payload = {};
      break;
    default:
      // Unknown / unsupported type — make the fingerprint unique to this
      // exact reference so it never matches another block. Forces fallback.
      payload = { raw: JSON.stringify(block) };
  }
  return `${t}:${JSON.stringify(payload)}`;
}

// --- Diff plan ----------------------------------------------------------------

type SyncOp =
  | { kind: 'delete'; id: string }
  | { kind: 'update'; id: string; type: string; payload: unknown }
  | { kind: 'insert'; after: string; block: unknown };

export type SyncPlan = { ops: SyncOp[] };

function lcs(oldFps: string[], newFps: string[]): Array<[number, number]> {
  const m = oldFps.length;
  const n = newFps.length;
  if (m === 0 || n === 0) return [];
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        oldFps[i - 1] === newFps[j - 1]
          ? dp[i - 1]![j - 1]! + 1
          : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const pairs: Array<[number, number]> = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldFps[i - 1] === newFps[j - 1]) {
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }
  pairs.reverse();
  return pairs;
}

/**
 * Plan a minimal-operation sync. Returns null if the change can't be done
 * incrementally and the caller should fall back to delete-all + append-all.
 *
 * Strategy:
 *  1. LCS of fingerprints aligns blocks that didn't change → no API call.
 *  2. Within each gap between aligned anchors, greedily pair same-type
 *     blocks from the front: those become UPDATEs (1 call each instead of
 *     delete + append).
 *  3. Remaining old blocks → DELETE. Remaining new blocks → INSERT after
 *     the most recent anchor block.
 *  4. INSERT requires a preceding kept old block as the `after` anchor; if
 *     a new block would land before any kept block (e.g., a paste at the
 *     very top of an existing doc), bail out and let the caller do a full
 *     replace.
 */
export function planSync(
  oldBlocks: AnyBlock[],
  newBlocks: AnyBlock[],
): SyncPlan | null {
  const oldFps = oldBlocks.map(fingerprintBlock);
  const newFps = newBlocks.map(fingerprintBlock);
  const keptPairs = lcs(oldFps, newFps);

  const ops: SyncOp[] = [];
  let oldCursor = 0;
  let newCursor = 0;
  let lastAnchorId: string | null = null;

  function processGap(oldEnd: number, newEnd: number): boolean {
    const oldGap = oldBlocks.slice(oldCursor, oldEnd);
    const newGap = newBlocks.slice(newCursor, newEnd);
    const minLen = Math.min(oldGap.length, newGap.length);
    let i = 0;
    while (i < minLen && oldGap[i]!.type === newGap[i]!.type) {
      const oid = oldGap[i]!.id;
      if (!oid) return false;
      const t = newGap[i]!.type as string;
      const payload = (newGap[i] as Record<string, unknown>)[t];
      ops.push({ kind: 'update', id: oid, type: t, payload });
      lastAnchorId = oid;
      i++;
    }
    for (let k = i; k < oldGap.length; k++) {
      const oid = oldGap[k]!.id;
      if (!oid) return false;
      ops.push({ kind: 'delete', id: oid });
    }
    for (let k = i; k < newGap.length; k++) {
      if (!lastAnchorId) return false;
      ops.push({ kind: 'insert', after: lastAnchorId, block: newGap[k] });
    }
    oldCursor = oldEnd;
    newCursor = newEnd;
    return true;
  }

  for (const [oi, ni] of keptPairs) {
    if (!processGap(oi, ni)) return null;
    const oid = oldBlocks[oi]!.id;
    if (!oid) return null;
    lastAnchorId = oid;
    oldCursor = oi + 1;
    newCursor = ni + 1;
  }
  if (!processGap(oldBlocks.length, newBlocks.length)) return null;

  return { ops };
}

// --- Apply ops ----------------------------------------------------------------

type Notion = ReturnType<typeof getNotion>;

async function applyDeletes(
  notion: Notion,
  deletes: Extract<SyncOp, { kind: 'delete' }>[],
): Promise<void> {
  if (deletes.length === 0) return;
  let firstError: unknown = null;
  let done = 0;
  await runWithConcurrency(
    deletes,
    async (op) => {
      if (firstError) return;
      try {
        await notion.blocks.delete({ block_id: op.id });
        done++;
      } catch (e) {
        if (!firstError) firstError = e;
      }
    },
    DELETE_CONCURRENCY,
  );
  if (firstError) {
    throw makeError('delete', 'failed to delete blocks', deletes.length - done);
  }
}

async function applyUpdates(
  notion: Notion,
  updates: Extract<SyncOp, { kind: 'update' }>[],
): Promise<void> {
  if (updates.length === 0) return;
  let firstError: unknown = null;
  await runWithConcurrency(
    updates,
    async (op) => {
      if (firstError) return;
      try {
        // Notion's update endpoint takes the type-specific key (paragraph,
        // heading_1, …) directly. The block type itself can't be changed —
        // planSync only emits update for matching types so this is safe.
        await notion.blocks.update({
          block_id: op.id,
          [op.type]: op.payload,
        } as never);
      } catch (e) {
        if (!firstError) firstError = e;
      }
    },
    UPDATE_CONCURRENCY,
  );
  if (firstError) {
    throw makeError('update', 'failed to update blocks');
  }
}

async function applyInserts(
  notion: Notion,
  taskId: string,
  inserts: Extract<SyncOp, { kind: 'insert' }>[],
): Promise<void> {
  if (inserts.length === 0) return;
  // Group consecutive inserts by anchor so each anchor becomes one append
  // (chunked at 100 per Notion's limit). Different anchors run in parallel.
  const groups = new Map<string, unknown[]>();
  for (const op of inserts) {
    const arr = groups.get(op.after) ?? [];
    arr.push(op.block);
    groups.set(op.after, arr);
  }
  let firstError: unknown = null;
  await runWithConcurrency(
    Array.from(groups.entries()),
    async ([after, children]) => {
      if (firstError) return;
      try {
        for (let off = 0; off < children.length; off += 100) {
          await notion.blocks.children.append({
            block_id: taskId,
            children: children.slice(off, off + 100) as never,
            after,
          } as never);
        }
      } catch (e) {
        if (!firstError) firstError = e;
      }
    },
    APPEND_CONCURRENCY,
  );
  if (firstError) {
    throw makeError('append', 'failed to append blocks');
  }
}

// --- Full-replace fallback ----------------------------------------------------

async function fullReplace(
  notion: Notion,
  taskId: string,
  existingIds: string[],
  newBlocks: unknown[],
): Promise<void> {
  let firstDeleteError: unknown = null;
  let deletedCount = 0;
  await runWithConcurrency(
    existingIds,
    async (id) => {
      if (firstDeleteError) return;
      try {
        await notion.blocks.delete({ block_id: id });
        deletedCount++;
      } catch (e) {
        if (!firstDeleteError) firstDeleteError = e;
      }
    },
    DELETE_CONCURRENCY,
  );
  if (firstDeleteError) {
    throw makeError(
      'delete',
      'failed to delete existing blocks',
      existingIds.length - deletedCount,
    );
  }

  const chunks: unknown[][] = [];
  for (let off = 0; off < newBlocks.length; off += 100) {
    chunks.push(newBlocks.slice(off, off + 100));
  }
  let firstAppendError: unknown = null;
  await runWithConcurrency(
    chunks,
    async (chunk) => {
      if (firstAppendError) return;
      try {
        await notion.blocks.children.append({
          block_id: taskId,
          children: chunk as never,
        });
      } catch (e) {
        if (!firstAppendError) firstAppendError = e;
      }
    },
    APPEND_CONCURRENCY,
  );
  if (firstAppendError) {
    throw makeError('append', 'failed to append new blocks');
  }
}

// --- Public entry -------------------------------------------------------------

export async function replaceTaskBlocks(
  taskId: string,
  newBlocks: unknown[],
): Promise<{ ok: true }> {
  const notion = getNotion();

  // 1) List existing children with full content (paginated).
  const existing: AnyBlock[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = (await notion.blocks.children.list({
      block_id: taskId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })) as {
      results: AnyBlock[];
      has_more?: boolean;
      next_cursor?: string | null;
    };
    for (const r of res.results) existing.push(r);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  // 2) Try a minimal-operation diff. If the change isn't safely incremental,
  //    fall back to the brute "delete all + append all" path.
  const plan = planSync(existing, newBlocks as AnyBlock[]);
  if (plan) {
    const deletes = plan.ops.filter(
      (o): o is Extract<SyncOp, { kind: 'delete' }> => o.kind === 'delete',
    );
    const updates = plan.ops.filter(
      (o): o is Extract<SyncOp, { kind: 'update' }> => o.kind === 'update',
    );
    const inserts = plan.ops.filter(
      (o): o is Extract<SyncOp, { kind: 'insert' }> => o.kind === 'insert',
    );
    await applyDeletes(notion, deletes);
    await applyUpdates(notion, updates);
    await applyInserts(notion, taskId, inserts);
    return { ok: true };
  }

  await fullReplace(
    notion,
    taskId,
    existing.map((b) => b.id!).filter(Boolean),
    newBlocks,
  );
  return { ok: true };
}

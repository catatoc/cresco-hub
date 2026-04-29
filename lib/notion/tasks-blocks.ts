// lib/notion/tasks-blocks.ts
import { getNotion } from './client';

export type ReplaceTaskBlocksError = Error & {
  stage: 'delete' | 'append';
  remaining?: number;
};

function makeError(stage: 'delete' | 'append', message: string, remaining?: number): ReplaceTaskBlocksError {
  const err = new Error(message) as ReplaceTaskBlocksError;
  err.stage = stage;
  if (typeof remaining === 'number') err.remaining = remaining;
  return err;
}

export async function replaceTaskBlocks(
  taskId: string,
  newBlocks: unknown[],
): Promise<{ ok: true; lastEditedTime: string }> {
  const notion = getNotion();

  // 1) List existing children, paginating through Notion's 100-per-page limit.
  const existingIds: string[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = (await notion.blocks.children.list({
      block_id: taskId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })) as { results: { id: string }[]; has_more?: boolean; next_cursor?: string | null };
    for (const r of res.results) existingIds.push(r.id);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  // 2) Delete in reverse so a partial failure leaves a stable suffix-removed state.
  for (let i = existingIds.length - 1; i >= 0; i--) {
    const id = existingIds[i]!;
    try {
      await notion.blocks.delete({ block_id: id });
    } catch {
      throw makeError('delete', `failed to delete block ${id}`, i + 1);
    }
  }

  // 3) Append new children, chunked at 100 per call.
  for (let off = 0; off < newBlocks.length; off += 100) {
    try {
      await notion.blocks.children.append({
        block_id: taskId,
        children: newBlocks.slice(off, off + 100) as never,
      });
    } catch {
      throw makeError('append', `failed to append chunk starting at ${off}`);
    }
  }

  const page = (await notion.pages.retrieve({ page_id: taskId })) as {
    last_edited_time: string;
  };
  return { ok: true, lastEditedTime: page.last_edited_time };
}

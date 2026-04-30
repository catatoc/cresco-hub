type Page<T> = {
  results: T[];
  has_more: boolean;
  next_cursor: string | null;
};

/**
 * Loop a Notion paginated query using start_cursor / has_more / next_cursor
 * until exhausted or `cap` items are collected. Pass `cap: Infinity` for
 * uncapped (small-volume) collections.
 *
 * `truncated` is true iff the cap was hit before exhaustion.
 */
export async function queryAllPages<T>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  opts: { cap: number },
): Promise<{ items: T[]; truncated: boolean }> {
  const { cap } = opts;
  const items: T[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const page = await fetchPage(cursor);
    items.push(...page.results);

    if (items.length >= cap) {
      return { items: items.slice(0, cap), truncated: true };
    }

    if (!page.has_more) {
      return { items, truncated: false };
    }

    cursor = page.next_cursor ?? undefined;
  }
}

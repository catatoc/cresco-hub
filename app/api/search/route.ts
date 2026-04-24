import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { parsePrefix } from '@/lib/search/parse-prefix';
import { queryAll } from '@/lib/search/query-all';
import type { SearchFilter } from '@/lib/search/types';

export const dynamic = 'force-dynamic';

const VALID_FILTERS = new Set<SearchFilter>(['all', 'tasks', 'meetings', 'wiki', 'projects', 'people']);

function normalizeFilter(raw: string | null): SearchFilter {
  if (raw && VALID_FILTERS.has(raw as SearchFilter)) return raw as SearchFilter;
  return 'all';
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  const url = new URL(req.url);
  const rawQ = url.searchParams.get('q') ?? '';
  const rawT = url.searchParams.get('t');

  const parsed = parsePrefix(rawQ);
  const filterFromPrefix: SearchFilter = parsed.type ?? normalizeFilter(rawT);

  const res = await queryAll({
    customerId: ctx.customerId,
    term: parsed.term,
    filter: filterFromPrefix,
  });

  console.log('[search]', {
    customerId: ctx.customerId,
    qLen: parsed.term.length,
    filter: filterFromPrefix,
    tookMs: res.tookMs,
    counts: Object.fromEntries(res.groups.map((g) => [g.type, g.count])),
    partialFailures: res.partialFailures ?? null,
  });

  return NextResponse.json(res);
}

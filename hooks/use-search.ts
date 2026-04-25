'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SearchFilter, SearchResponse } from '@/lib/search/types';
import { useDebouncedValue } from './use-debounced-value';

async function fetchSearch(
  q: string,
  t: SearchFilter,
  signal: AbortSignal,
): Promise<SearchResponse> {
  const url = new URL('/api/search', window.location.origin);
  if (q) url.searchParams.set('q', q);
  url.searchParams.set('t', t);
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return (await res.json()) as SearchResponse;
}

export function useSearch(rawQuery: string, filter: SearchFilter, customerId: string) {
  const q = useDebouncedValue(rawQuery.trim(), 180);
  const enabled = q.length >= 2;

  return useQuery({
    queryKey: ['search', customerId, q, filter],
    queryFn: ({ signal }) => fetchSearch(q, filter, signal),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import type { SuggestionsResponse } from '@/lib/search/types';

async function fetchSuggestions(signal: AbortSignal): Promise<SuggestionsResponse> {
  const res = await fetch('/api/search/suggestions', { signal });
  if (!res.ok) throw new Error(`suggestions failed: ${res.status}`);
  return (await res.json()) as SuggestionsResponse;
}

export function useSearchSuggestions(customerId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search-suggestions', customerId],
    queryFn: ({ signal }) => fetchSuggestions(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

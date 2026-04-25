'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SearchItem } from '@/lib/search/types';

const MAX = 8;

export type RecentItem = Pick<SearchItem, 'id' | 'type' | 'title' | 'url'> & { openedAt: number };

function keyFor(customerId: string) {
  return `search:recents:${customerId}`;
}

function read(customerId: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(keyFor(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentItem[];
  } catch {
    return [];
  }
}

export function useSearchRecents(customerId: string) {
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    setRecents(read(customerId));
  }, [customerId]);

  const push = useCallback(
    (item: Omit<RecentItem, 'openedAt'>) => {
      setRecents((curr) => {
        const next = [{ ...item, openedAt: Date.now() }, ...curr.filter((r) => r.id !== item.id)].slice(0, MAX);
        try {
          window.localStorage.setItem(keyFor(customerId), JSON.stringify(next));
        } catch {
          /* quota / disabled */
        }
        return next;
      });
    },
    [customerId],
  );

  return { recents, push };
}

'use client';
import { useEffect, useState } from 'react';

export type ChipOption = { id: string; label: string; sublabel?: string };

export function useChipOptions(
  type: 'sprint' | 'project' | 'team' | 'meeting',
  q?: string,
  enabled?: boolean,
) {
  const [data, setData] = useState<ChipOption[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const params = new URLSearchParams({ type });
    if (q && q.length > 0) params.set('q', q);
    setLoading(true);
    fetch(`/api/create/options?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve({ options: [] })))
      .then((j: { options: ChipOption[] }) => {
        if (!cancelled) setData(j.options);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, q, enabled]);

  return { data, loading };
}

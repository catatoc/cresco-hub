'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type Props = {
  currentSprintId: string | null;
  /** All sprint IDs ordered newest → oldest. */
  allSprintIds: string[];
};

/**
 * Sprint prev/next navigation. Pushes `?sprint={id}` to URL.
 * `allSprintIds` is ordered newest-first, so:
 *   - "prev" (chevron left) = older sprint (next index)
 *   - "next" (chevron right) = newer sprint (previous index)
 */
export function SprintNav({ currentSprintId, allSprintIds }: Props) {
  const searchParams = useSearchParams();
  const idx = currentSprintId ? allSprintIds.indexOf(currentSprintId) : -1;
  const hasPrev = idx !== -1 && idx < allSprintIds.length - 1;
  const hasNext = idx !== -1 && idx > 0;
  const prevId = hasPrev ? allSprintIds[idx + 1] : null;
  const nextId = hasNext ? allSprintIds[idx - 1] : null;

  function buildHref(sprintId: string): string {
    const params = new URLSearchParams();
    params.set('sprint', sprintId);
    const scope = searchParams.get('scope');
    if (scope) params.set('scope', scope);
    return `/tareas?${params.toString()}`;
  }

  const btnBase =
    'w-6 h-6 border border-border rounded-[5px] bg-white grid place-items-center text-muted-foreground transition-colors';
  const btnEnabled = 'hover:text-foreground hover:bg-[#f7f7f8] cursor-pointer';
  const btnDisabled = 'opacity-50 cursor-not-allowed';

  return (
    <div className="flex gap-1 ml-auto">
      {prevId ? (
        <Link
          href={buildHref(prevId)}
          aria-label="Sprint anterior"
          className={cn(btnBase, btnEnabled)}
        >
          <ChevronLeft className="w-3 h-3" />
        </Link>
      ) : (
        <button
          disabled
          aria-label="Sprint anterior"
          className={cn(btnBase, btnDisabled)}
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      )}
      {nextId ? (
        <Link
          href={buildHref(nextId)}
          aria-label="Sprint siguiente"
          className={cn(btnBase, btnEnabled)}
        >
          <ChevronRight className="w-3 h-3" />
        </Link>
      ) : (
        <button
          disabled
          aria-label="Sprint siguiente"
          className={cn(btnBase, btnDisabled)}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}


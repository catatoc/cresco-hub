'use client';

import { cn } from '@/lib/utils';
import type { SearchFilter, SearchGroup } from '@/lib/search/types';

const PILLS: Array<{ value: SearchFilter; label: string }> = [
  { value: 'all', label: 'Todo' },
  { value: 'tasks', label: 'Tareas' },
  { value: 'meetings', label: 'Reuniones' },
  { value: 'wiki', label: 'Wiki' },
  { value: 'projects', label: 'Proyectos' },
  { value: 'people', label: 'Personas' },
];

export function SearchFilterPills({
  value,
  onChange,
  groups,
}: {
  value: SearchFilter;
  onChange: (next: SearchFilter) => void;
  groups: SearchGroup[];
}) {
  const countFor = (v: SearchFilter) => {
    if (v === 'all') return groups.reduce((acc, g) => acc + g.count, 0);
    return groups.find((g) => g.type === v)?.count ?? 0;
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === 'Tab') return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = (idx + delta + PILLS.length) % PILLS.length;
    onChange(PILLS[next]!.value);
  }

  return (
    <div
      role="tablist"
      aria-label="Filtrar por tipo"
      className="flex gap-1.5 px-3 py-2 border-b border-border/50 bg-muted/30 overflow-x-auto"
    >
      {PILLS.map((p, idx) => {
        const active = p.value === value;
        const count = countFor(p.value);
        return (
          <button
            key={p.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap cursor-pointer transition-[transform,background-color,border-color,color] duration-(--duration-fast) ease-(--ease-linear) active:scale-[0.97]',
              active
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-white text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {p.label}
            {count > 0 && <span className="ml-1 opacity-60 text-[10px]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';

type Tab = 'active' | 'planning' | 'completed' | 'all';

type Props = {
  current: Tab;
  counts: Record<Tab, number>;
  onChange: (t: Tab) => void;
};

const LABELS: Record<Tab, string> = {
  active: 'Activos',
  planning: 'En planeación',
  completed: 'Completados',
  all: 'Todos',
};

export function Tabs({ current, counts, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-[#f7f7f8] rounded-lg w-fit mb-5 border border-border">
      {(Object.keys(LABELS) as Tab[]).map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            'px-3 py-[5px] text-[12px] rounded-md font-medium flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer',
            current === k && 'bg-white text-foreground shadow-sm',
          )}
        >
          {LABELS[k]}
          <span className={cn('bg-black/[0.05] px-1.5 rounded-full text-[10px] font-semibold', current === k && 'bg-black/[0.06]')}>
            {counts[k]}
          </span>
        </button>
      ))}
    </div>
  );
}

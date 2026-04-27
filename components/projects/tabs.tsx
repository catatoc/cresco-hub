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
    <div className="-mx-4 sm:-mx-0 px-4 sm:px-0 mb-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-1 p-1 bg-[#f7f7f8] rounded-lg w-fit border border-border">
        {(Object.keys(LABELS) as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={cn(
              'px-3 py-2 sm:py-[5px] min-h-[40px] sm:min-h-0 text-[12px] rounded-md font-medium flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring whitespace-nowrap',
              current === k && 'bg-white text-foreground shadow-sm',
            )}
          >
            {LABELS[k]}
            <span
              className={cn(
                'bg-black/[0.05] px-1.5 rounded-full text-[10px] font-semibold',
                current === k && 'bg-black/[0.06]',
              )}
            >
              {counts[k]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

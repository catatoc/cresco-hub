'use client';

import { cn } from '@/lib/utils';

type Props = { view: 'classic' | 'week'; onChange: (v: 'classic' | 'week') => void };

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex bg-[#f7f7f8] border border-border rounded-md p-0.5">
      {(['classic', 'week'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'px-2.5 py-1 text-[12px] font-medium rounded-[4px] text-muted-foreground hover:text-foreground transition-colors',
            view === v && 'bg-white text-foreground shadow-sm',
          )}
        >
          {v === 'classic' ? 'Clásico' : 'Semana'}
        </button>
      ))}
    </div>
  );
}

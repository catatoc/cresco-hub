'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Props = { view: 'classic' | 'week'; onChange: (v: 'classic' | 'week') => void };

export function ViewToggle({ view, onChange }: Props) {
  const t = useTranslations('kanban.view');
  return (
    <div className="flex bg-[#f7f7f8] border border-border rounded-md p-0.5">
      {(['classic', 'week'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'px-3 py-1.5 sm:px-2.5 sm:py-1 text-[12px] font-medium rounded-[4px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            view === v && 'bg-white text-foreground shadow-sm',
          )}
        >
          {v === 'classic' ? t('classic') : t('week')}
        </button>
      ))}
    </div>
  );
}

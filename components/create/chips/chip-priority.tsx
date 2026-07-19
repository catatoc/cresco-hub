'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TaskPriority } from '@/schemas/task';

const OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High'];

export function ChipPriority({
  value,
  onChange,
}: {
  value: TaskPriority | null;
  onChange: (v: TaskPriority | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('create.chipPriority');
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        {value}
        <button
          type="button"
          aria-label={t('remove')}
          onClick={() => onChange(null)}
          className="hover:bg-black/[0.06] rounded-sm w-3 h-3 inline-flex items-center justify-center"
        >
          ✕
        </button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground"
      >
        {t('add')}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[120px]"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          {OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

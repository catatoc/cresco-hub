'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipMeeting({
  value,
  onChange,
}: {
  value: ChipValue | null;
  onChange: (v: ChipValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('create.chipMeeting');
  const { data, loading } = useChipOptions('meeting', undefined, open);

  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        📅 {value.label}
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
          className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[220px] max-h-[240px] overflow-y-auto"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          {loading && !data ? (
            <div className="space-y-1 p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-5 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            data.map((o: ChipOption) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange({ id: o.id, label: o.label });
                  setOpen(false);
                }}
                className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
              >
                {o.label}
              </button>
            ))
          ) : (
            <div className="px-2 py-1 text-[12px] text-muted-foreground">
              {t('noResults')}
            </div>
          )}
        </div>
      )}
    </span>
  );
}

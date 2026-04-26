'use client';
import { useState } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipProject({
  value,
  onChange,
}: {
  value: ChipValue | null;
  onChange: (v: ChipValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useChipOptions('project', undefined, open);

  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        📂 {value.label}
        <button
          type="button"
          aria-label="Quitar proyecto"
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
        + Proyecto
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[200px] max-h-[240px] overflow-y-auto">
          {loading && !data ? (
            <Skeleton />
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
              Sin resultados
            </div>
          )}
        </div>
      )}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-1 p-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-5 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}

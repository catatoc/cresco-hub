'use client';
import { useState } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipSprint({
  value,
  onChange,
}: {
  value: ChipValue | null;
  onChange: (v: ChipValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useChipOptions('sprint', undefined, open);

  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        🏃 {value.label}
        <button
          type="button"
          aria-label="Quitar sprint"
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
        + Sprint
      </button>
      {open && (
        <Popover
          loading={loading}
          options={data}
          onPick={(opt) => {
            onChange({ id: opt.id, label: opt.label });
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}

function Popover({
  loading,
  options,
  onPick,
  onClose,
}: {
  loading: boolean;
  options: ChipOption[] | null;
  onPick: (o: ChipOption) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[200px] max-h-[240px] overflow-y-auto"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {loading && !options ? (
        <div className="space-y-1 p-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : options && options.length > 0 ? (
        options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o)}
            className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
          >
            {o.label}
            {o.sublabel && (
              <span className="ml-1 text-muted-foreground">{o.sublabel}</span>
            )}
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-[12px] text-muted-foreground">
          Sin resultados
        </div>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';

export function ChipDate({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        {value}
        <button
          type="button"
          aria-label="Quitar fecha"
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
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground"
      >
        + Fecha
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-2">
          <label className="text-[11px] block text-muted-foreground mb-1" htmlFor="chip-date-input">
            Fecha
          </label>
          <input
            id="chip-date-input"
            aria-label="Fecha"
            type="date"
            className="text-[12px] border rounded px-1.5 py-1"
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                onChange(v);
                setOpen(false);
              }
            }}
          />
        </div>
      )}
    </span>
  );
}

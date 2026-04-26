'use client';
import { useState, useEffect } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipTeam({
  value,
  onChange,
}: {
  value: ChipValue[];
  onChange: (v: ChipValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = useChipOptions(
    'team',
    debouncedQ,
    open && debouncedQ.length > 0,
  );

  function toggle(o: ChipOption) {
    const idx = value.findIndex((v) => v.id === o.id);
    if (idx >= 0) onChange(value.filter((v) => v.id !== o.id));
    else onChange([...value, { id: o.id, label: o.label }]);
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          value.length > 0
            ? 'px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700'
            : 'px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground'
        }
      >
        {value.length > 0 ? `Asignar · ${value.length}` : '+ Asignar'}
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[220px]"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <input
            autoFocus
            placeholder="Buscar miembro…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full text-[12px] px-2 py-1 outline-none border-b mb-1"
          />
          {loading ? (
            <div className="space-y-1 p-1">
              {[0, 1].map((i) => (
                <div key={i} className="h-5 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : data && data.length > 0 ? (
            data.map((o) => {
              const checked = value.some((v) => v.id === o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
                >
                  <span className="w-3 inline-block">{checked ? '✓' : ''}</span>
                  {o.label}
                </button>
              );
            })
          ) : debouncedQ ? (
            <div className="px-2 py-1 text-[12px] text-muted-foreground">
              Sin resultados
            </div>
          ) : null}
        </div>
      )}
    </span>
  );
}

'use client';
import { useState } from 'react';
import type { WikiCategory } from '@/schemas/wiki';

const OPTIONS: WikiCategory[] = [
  'Proposal',
  'Customer research',
  'Strategy doc',
  'Planning',
  'Documentation',
];

export function ChipCategory({
  value,
  onChange,
}: {
  value: WikiCategory[];
  onChange: (v: WikiCategory[]) => void;
}) {
  const [open, setOpen] = useState(false);
  function toggle(cat: WikiCategory) {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          value.length > 0
            ? 'px-2 py-0.5 rounded-md text-[11px] bg-amber-50 text-amber-700'
            : 'px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground'
        }
      >
        {value.length > 0 ? `Categoría · ${value.length}` : '+ Categoría'}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[180px]">
          {OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className="flex items-center gap-2 w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
            >
              <span className="w-3 inline-block">{value.includes(c) ? '✓' : ''}</span>
              {c}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

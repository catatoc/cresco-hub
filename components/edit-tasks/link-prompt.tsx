'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeUrl } from '@/lib/edit-tasks/normalize-url';

type Props = {
  initialUrl: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
};

export function LinkPrompt({ initialUrl, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initialUrl);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const normalized = normalizeUrl(value);
      if (normalized.length === 0) onCancel();
      else onSubmit(normalized);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border border-border shadow-md">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="https://…"
        className="text-[12.5px] px-1 py-0.5 outline-none min-w-[260px] bg-transparent"
      />
    </div>
  );
}

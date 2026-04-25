'use client';

import { Search } from 'lucide-react';
import { useSearchContext } from './search-provider';

export function SearchTrigger() {
  const { open } = useSearchContext();
  return (
    <button
      onClick={open}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-[13px] font-normal text-muted-foreground hover:bg-black/[0.04] hover:text-foreground transition-colors"
      aria-label="Buscar (⌘K)"
    >
      <Search className="w-3.5 h-3.5" />
      <span className="flex-1 text-left">Buscar</span>
      <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/[0.06] text-muted-foreground font-[inherit]">
        ⌘K
      </kbd>
    </button>
  );
}

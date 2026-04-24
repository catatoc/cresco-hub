'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

// TODO(refactor-C): wire Sprint navigation (prev/next via Sprint ID).
export function CycleNav() {
  return (
    <div className="flex gap-1 ml-auto">
      <button
        disabled
        aria-label="Sprint anterior"
        className="w-6 h-6 border border-border rounded-[5px] bg-white grid place-items-center text-muted-foreground opacity-50 cursor-not-allowed"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button
        disabled
        aria-label="Sprint siguiente"
        className="w-6 h-6 border border-border rounded-[5px] bg-white grid place-items-center text-muted-foreground opacity-50 cursor-not-allowed"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

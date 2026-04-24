'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftCycle } from '@/lib/cycles';

export function CycleNav({ cycle }: { cycle: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const go = (delta: number) => {
    const params = new URLSearchParams(sp);
    params.set('cycle', shiftCycle(cycle, delta));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 ml-auto">
      <button
        onClick={() => go(-1)}
        className="w-6 h-6 border border-border rounded-[5px] bg-white hover:bg-[#f7f7f8] grid place-items-center text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button
        onClick={() => go(1)}
        className="w-6 h-6 border border-border rounded-[5px] bg-white hover:bg-[#f7f7f8] grid place-items-center text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

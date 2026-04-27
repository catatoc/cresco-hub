'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { History } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HistoryPanel } from './history-panel';
import type { Meeting } from '@/schemas/meeting';

type Props = { meetings: Meeting[]; currentId?: string };

export function MobileHistoryTrigger({ meetings, currentId }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Abrir historial"
            className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] sm:min-h-0 rounded-md text-[12px] text-muted-foreground border border-border bg-white hover:bg-[#f7f7f8] active:bg-[#eeeffc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Historial</span>
          </button>
        }
      />
      <SheetContent side="right" className="w-[300px] max-w-[85vw] p-0 lg:hidden">
        <HistoryPanel meetings={meetings} currentId={currentId} />
      </SheetContent>
    </Sheet>
  );
}

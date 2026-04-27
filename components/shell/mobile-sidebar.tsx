'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

type Props = { children: React.ReactNode };

export function MobileSidebar({ children }: Props) {
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
            aria-label="Abrir menú"
            className="lg:hidden fixed top-1.5 left-2 z-40 inline-flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-black/[0.05] hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="w-4 h-4" />
          </button>
        }
      />
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[232px] max-w-[85vw] p-0 bg-[#f7f7f8] lg:hidden"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

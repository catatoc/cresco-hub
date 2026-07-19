'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { WikiTree } from './tree';
import type { WikiPage } from '@/schemas/wiki';

type Props = { pages: WikiPage[] };

export function MobileWikiTreeTrigger({ pages }: Props) {
  const t = useTranslations('wiki.mobileTree');
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
            aria-label={t('ariaLabel')}
            className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[36px] sm:min-h-0 rounded-md text-[12px] text-muted-foreground border border-border bg-white hover:bg-[#f7f7f8] active:bg-[#eeeffc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('label')}</span>
          </button>
        }
      />
      <SheetContent side="left" className="w-[300px] max-w-[85vw] p-0 lg:hidden">
        <WikiTree pages={pages} />
      </SheetContent>
    </Sheet>
  );
}

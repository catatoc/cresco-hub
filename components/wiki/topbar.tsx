'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Topbar } from '@/components/shell/topbar';
import { MobileWikiTreeTrigger } from './mobile-tree-trigger';
import type { WikiPage } from '@/schemas/wiki';

export function WikiTopbar({ pages }: { pages: WikiPage[] }) {
  const t = useTranslations('wiki');
  const segments = useSelectedLayoutSegments();
  const pageId = segments[0];
  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    return (
      <Topbar crumbs={[{ label: t('nav.wiki') }]}>
        <MobileWikiTreeTrigger pages={pages} />
      </Topbar>
    );
  }

  const category = page.categories[0] ?? null;

  return (
    <Topbar
      crumbs={[
        { label: t('nav.wiki') },
        ...(category ? [{ label: category, muted: true }] : []),
        { label: page.title },
      ]}
    >
      <MobileWikiTreeTrigger pages={pages} />
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white shrink-0 whitespace-nowrap">
        <Info className="w-3 h-3" /> {t('topbar.readOnly')}
      </span>
    </Topbar>
  );
}

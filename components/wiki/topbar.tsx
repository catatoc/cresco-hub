'use client';

import { useSelectedLayoutSegments } from 'next/navigation';
import { Info } from 'lucide-react';
import { Topbar } from '@/components/shell/topbar';
import type { WikiPage } from '@/schemas/wiki';

export function WikiTopbar({ pages }: { pages: WikiPage[] }) {
  const segments = useSelectedLayoutSegments();
  const pageId = segments[0];
  const page = pages.find((p) => p.id === pageId);

  if (!page) {
    return <Topbar crumbs={[{ label: 'Wiki' }]} />;
  }

  const category = page.categories[0] ?? null;

  return (
    <Topbar
      crumbs={[
        { label: 'Wiki' },
        ...(category ? [{ label: category, muted: true }] : []),
        { label: page.title },
      ]}
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white">
        <Info className="w-3 h-3" /> Solo lectura
      </span>
    </Topbar>
  );
}

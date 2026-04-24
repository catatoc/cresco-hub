'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/schemas/wiki';

// TODO(refactor-C): wiki has no `parentId` anymore — for now we group by first
// Category. Design a proper tree or category-grouped navigation in Refactor C.
function groupByCategory(pages: WikiPage[]): Array<{ category: string; pages: WikiPage[] }> {
  const map = new Map<string, WikiPage[]>();
  for (const p of pages) {
    const key = p.categories[0] ?? 'Sin categoría';
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([category, pages]) => ({ category, pages }));
}

function PageRow({ page }: { page: WikiPage }) {
  const pathname = usePathname();
  const active = pathname === `/wiki/${page.id}`;

  return (
    <Link
      href={`/wiki/${page.id}`}
      className={cn(
        'flex items-center gap-2 px-1.5 py-1 rounded-md text-[13px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
        active && 'bg-white text-foreground font-medium border border-border shadow-sm',
      )}
    >
      <span className="text-[13px] w-4 shrink-0 grid place-items-center">
        {page.icon ?? <FileText className="w-3 h-3" />}
      </span>
      <span className="truncate">{page.title}</span>
    </Link>
  );
}

export function WikiTree({ pages }: { pages: WikiPage[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () =>
      q.length > 0
        ? pages.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()))
        : pages,
    [pages, q],
  );
  const groups = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <aside className="border-r border-border bg-[#f7f7f8] overflow-auto p-2">
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-border rounded-md mb-2.5">
        <Search className="w-3 h-3 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en wiki..."
          className="flex-1 bg-transparent border-none outline-none text-[12px] placeholder:text-muted-foreground"
        />
        <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/[0.06] text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      {groups.map(({ category, pages }) => (
        <div key={category} className="mb-3">
          <div className="text-[10px] uppercase font-semibold tracking-[0.04em] text-muted-foreground p-2">
            {category}
          </div>
          {pages.map((p) => (
            <PageRow key={p.id} page={p} />
          ))}
        </div>
      ))}
      {groups.length === 0 && (
        <div className="text-[12px] text-muted-foreground text-center p-4">
          Sin resultados.
        </div>
      )}
    </aside>
  );
}

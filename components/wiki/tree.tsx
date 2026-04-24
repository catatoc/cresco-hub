'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/schemas/wiki';

const CATEGORY_ORDER = [
  'Documentation',
  'Strategy doc',
  'Planning',
  'Customer research',
  'Proposal',
] as const;

const UNCATEGORIZED = 'Sin categoría';

function groupByCategory(pages: WikiPage[]): Array<{ category: string; pages: WikiPage[] }> {
  const map = new Map<string, WikiPage[]>();
  for (const p of pages) {
    const key = p.categories[0] ?? UNCATEGORIZED;
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }

  // Alphabetize within each group.
  for (const arr of map.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  // Emit groups in fixed order, then any remaining (unknown categories),
  // then the uncategorized bucket last.
  const ordered: Array<{ category: string; pages: WikiPage[] }> = [];
  for (const cat of CATEGORY_ORDER) {
    const arr = map.get(cat);
    if (arr && arr.length) ordered.push({ category: cat, pages: arr });
    map.delete(cat);
  }
  for (const [cat, arr] of map.entries()) {
    if (cat === UNCATEGORIZED) continue;
    if (arr.length) ordered.push({ category: cat, pages: arr });
  }
  const rest = map.get(UNCATEGORIZED);
  if (rest && rest.length) ordered.push({ category: UNCATEGORIZED, pages: rest });
  return ordered;
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

function CategoryGroup({
  category,
  pages,
  defaultOpen = true,
}: {
  category: string;
  pages: WikiPage[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-semibold tracking-[0.04em] text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="flex-1 text-left">{category}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{pages.length}</span>
      </button>
      {open && (
        <div className="pl-1">
          {pages.map((p) => (
            <PageRow key={p.id} page={p} />
          ))}
        </div>
      )}
    </div>
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
        <CategoryGroup key={category} category={category} pages={pages} />
      ))}
      {groups.length === 0 && (
        <div className="text-[12px] text-muted-foreground text-center p-4">
          Sin resultados.
        </div>
      )}
    </aside>
  );
}

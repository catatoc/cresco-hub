'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/schemas/wiki';

type Node = WikiPage & { children: Node[] };

function buildTree(pages: WikiPage[]): Node[] {
  const byId = new Map<string, Node>();
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] }));

  const roots: Node[] = [];
  pages.forEach((p) => {
    const n = byId.get(p.id)!;
    if (p.parentId && byId.has(p.parentId)) byId.get(p.parentId)!.children.push(n);
    else roots.push(n);
  });
  return roots;
}

function TreeNode({ node, level = 0 }: { node: Node; level?: number }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const active = pathname === `/wiki/${node.id}`;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-1.5 py-1 rounded-md text-[13px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
          active && 'bg-white text-foreground font-medium border border-border shadow-sm',
        )}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              setOpen((o) => !o);
            }}
            className="w-3.5 h-3.5 text-muted-foreground shrink-0 grid place-items-center hover:bg-black/[0.06] rounded"
            aria-label={open ? 'Colapsar' : 'Expandir'}
          >
            <ChevronRight
              className={cn('w-2.5 h-2.5 transition-transform', open && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <Link
          href={`/wiki/${node.id}`}
          className="flex-1 flex items-center gap-2 min-w-0 py-0"
        >
          <span className="text-[13px] w-4 shrink-0 grid place-items-center">
            {node.icon ?? <FileText className="w-3 h-3" />}
          </span>
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {hasChildren && open && (
        <div className="ml-[18px]">
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} level={level + 1} />
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
  const tree = useMemo(() => buildTree(filtered), [filtered]);

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
      <div className="text-[10px] uppercase font-semibold tracking-[0.04em] text-muted-foreground p-2">
        Wiki
      </div>
      {tree.map((n) => (
        <TreeNode key={n.id} node={n} />
      ))}
      {tree.length === 0 && (
        <div className="text-[12px] text-muted-foreground text-center p-4">
          Sin resultados.
        </div>
      )}
    </aside>
  );
}

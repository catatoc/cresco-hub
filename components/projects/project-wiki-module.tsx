import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { WikiPage } from '@/schemas/wiki';

export function ProjectWikiModule({ pages }: { pages: WikiPage[] }) {
  if (pages.length === 0) {
    return (
      <Module>
        <p className="text-[12px] text-muted-foreground py-3">Sin documentación asociada.</p>
      </Module>
    );
  }

  const sorted = [...pages].sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt));
  const visible = sorted.slice(0, 3);

  return (
    <Module
      action={pages.length > 3 ? (
        <Link href="/wiki" className="text-[11px] text-[#5e6ad2] hover:underline">Ver todo →</Link>
      ) : null}
    >
      <ul className="divide-y divide-[#f5f5f8]">
        {visible.map((w) => (
          <li key={w.id}>
            <a
              href={w.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors"
            >
              <span className="w-5 h-5 rounded-md bg-[#fafbff] border border-[#f0f0f4] grid place-items-center text-[12px] shrink-0">
                {w.icon ?? '📄'}
              </span>
              <span className="text-[12.5px] flex-1 min-w-0 truncate">{w.title}</span>
              {w.categories[0] && (
                <span className="text-[9.5px] uppercase tracking-[0.04em] bg-[#eeeffc] text-[#5e6ad2] px-1.5 py-0.5 rounded shrink-0">
                  {w.categories[0]}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </Module>
  );
}

function Module({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          Wiki
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

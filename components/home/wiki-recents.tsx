import Link from 'next/link';
import { FileText } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { WikiPage } from '@/schemas/wiki';

export function WikiRecents({ pages }: { pages: WikiPage[] }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold">Recientes en wiki</h2>
        <Link href="/wiki" className="text-[12px] text-muted-foreground hover:text-[#5e6ad2]">
          Ver wiki →
        </Link>
      </div>
      {pages.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin páginas aún.
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-white overflow-hidden">
          {pages.map((p, i) => (
            <Link
              href={`/wiki/${p.id}`}
              key={p.id}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#f7f7f8] ${i < pages.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="w-[22px] h-[22px] rounded bg-[#f4ecf8] text-[#7f3aa7] grid place-items-center shrink-0">
                {p.icon ? <span className="text-[13px]">{p.icon}</span> : <FileText className="w-3 h-3" />}
              </div>
              <span className="text-[13px] flex-1 truncate">{p.title}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatDistanceToNow(parseISO(p.lastEditedAt), { locale: es, addSuffix: false })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

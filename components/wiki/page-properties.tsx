import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/schemas/wiki';

const CATEGORY_COLOR: Record<string, string> = {
  Proposal: 'bg-[#faf0db] text-[#c78a2c]',
  'Customer research': 'bg-[#eff6ff] text-[#3a5fcc]',
  'Strategy doc': 'bg-[#f4ecf8] text-[#7f3aa7]',
  Planning: 'bg-[#fceaea] text-[#d24949]',
  Documentation: 'bg-[#e8f5ec] text-[#3f9f5c]',
};

type Props = { page: WikiPage };

export function PageProperties({ page }: Props) {
  if (page.categories.length === 0 && !page.lastEditedAt) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-y-2 sm:gap-y-1.5 gap-x-5 p-3 sm:p-3.5 bg-[#f7f7f8] border border-border rounded-lg mb-5 sm:mb-7 lg:mb-9 text-[12px]">
      {page.categories.length > 0 && (
        <>
          <div className="text-muted-foreground font-medium flex items-center gap-1.5">
            🏷 Categorías
          </div>
          <div className="flex flex-wrap gap-1.5">
            {page.categories.map((c: string) => (
              <span
                key={c}
                className={cn(
                  'inline-flex px-2 py-[1px] rounded text-[11px] font-medium',
                  CATEGORY_COLOR[c] ?? 'bg-[#eeeffc] text-[#5e6ad2]',
                )}
              >
                {c}
              </span>
            ))}
          </div>
        </>
      )}

      {page.lastEditedAt && (
        <>
          <div className="text-muted-foreground font-medium flex items-center gap-1.5">
            🕓 Editado
          </div>
          <div>
            hace {formatDistanceToNow(parseISO(page.lastEditedAt), { locale: es })}
          </div>
        </>
      )}
    </div>
  );
}

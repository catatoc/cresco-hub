import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { WikiPage } from '@/schemas/wiki';

type Props = { page: WikiPage };

export function PageProperties({ page }: Props) {
  if (page.categories.length === 0 && !page.lastEditedAt) return null;

  return (
    <div className="grid grid-cols-[120px_1fr] gap-y-1.5 gap-x-5 p-3.5 bg-[#f7f7f8] border border-border rounded-lg mb-9 text-[12px]">
      {page.categories.length > 0 && (
        <>
          <div className="text-muted-foreground font-medium flex items-center gap-1.5">
            🏷 Categorías
          </div>
          <div className="flex flex-wrap gap-1.5">
            {page.categories.map((c: string) => (
              <span
                key={c}
                className="inline-flex px-2 py-[1px] rounded text-[11px] font-medium bg-[#eeeffc] text-[#5e6ad2]"
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

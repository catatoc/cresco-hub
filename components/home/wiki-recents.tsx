import Link from 'next/link';
import { FileText } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { dateLocale } from '@/lib/i18n/date-locale';
import type { WikiPage } from '@/schemas/wiki';

export function WikiRecents({ pages }: { pages: WikiPage[] }) {
  const t = useTranslations('home.wikiRecents');
  const locale = useLocale();
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 mb-3 min-w-0">
        <h2 className="text-[13px] font-semibold truncate">{t('title')}</h2>
        <Link
          href="/wiki"
          className="shrink-0 text-[12px] text-muted-foreground hover:text-[#5e6ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {t('seeAll')}
        </Link>
      </div>
      {pages.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-white overflow-hidden">
          {pages.map((p, i) => (
            <Link
              href={`/wiki/${p.id}`}
              key={p.id}
              className={`flex items-center gap-2.5 px-3 sm:px-3.5 py-2.5 min-h-[44px] sm:min-h-0 hover:bg-[#f7f7f8] active:bg-[#f0f0f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${i < pages.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="w-[22px] h-[22px] rounded bg-[#f4ecf8] text-[#7f3aa7] grid place-items-center shrink-0">
                {p.icon ? <span className="text-[13px]">{p.icon}</span> : <FileText className="w-3 h-3" />}
              </div>
              <span className="text-[13px] flex-1 min-w-0 truncate">{p.title}</span>
              <span className="text-[11px] text-muted-foreground shrink-0 max-w-[80px] sm:max-w-none truncate">
                {formatDistanceToNow(parseISO(p.lastEditedAt), { locale: dateLocale(locale), addSuffix: false })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

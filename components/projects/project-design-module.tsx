import { Palette, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ProjectDesignModule({ designUrl }: { designUrl: string | null }) {
  const t = useTranslations('projects.designModule');
  if (!designUrl) return null;

  let host: string | null = null;
  try {
    host = new URL(designUrl).hostname.replace(/^www\./, '');
  } catch {
    host = null;
  }

  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          {t('title')}
        </h2>
      </header>
      <a
        href={designUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors group"
      >
        <span className="w-5 h-5 rounded-md bg-[#fafbff] border border-[#f0f0f4] grid place-items-center text-[12px] shrink-0">
          🎨
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[12.5px] truncate">{t('open')}</span>
          {host && <span className="block text-[11px] text-muted-foreground truncate">{host}</span>}
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-(--duration-fast) ease-(--ease-linear) group-hover:translate-x-px group-hover:-translate-y-px" />
      </a>
    </section>
  );
}

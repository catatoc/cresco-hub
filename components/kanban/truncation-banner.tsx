import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = { cap: number };

export function TruncationBanner({ cap }: Props) {
  const t = useTranslations('kanban.truncation');
  return (
    <div
      role="alert"
      className="flex items-center gap-2 px-3 py-2 mb-3 rounded-md border border-[#e6c98a] bg-[#faf0db] text-[#7a5a1a] text-[12px]"
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="leading-relaxed">
        {t.rich('message', {
          cap,
          mine: (chunks) => <span className="font-medium">{chunks}</span>,
        })}
      </span>
    </div>
  );
}

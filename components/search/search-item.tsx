'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CommandItem, CommandShortcut } from '@/components/ui/command';
import { highlightMatch } from '@/lib/search/highlight';
import type { SearchItem as SearchItemType } from '@/lib/search/types';

const TYPE_ICON: Record<SearchItemType['type'], string> = {
  task: '✅',
  meeting: '📅',
  wiki: '📖',
  project: '🧭',
  person: '👤',
};

const STATUS_DOT: Record<string, string> = {
  'In Progress': 'bg-[#4f7df3]',
  'Not Started': 'bg-[#c0c4cc]',
  Testing: 'bg-[#b58a1f]',
  'In Review': 'bg-[#a569bd]',
  Refining: 'bg-[#c0c4cc]',
  Done: 'bg-[#3cb371]',
  Archived: 'bg-[#c0c4cc]',
};

export function SearchItemRow({
  item,
  term,
  onSelect,
  showShortcut,
  staggerIndex = 0,
}: {
  item: SearchItemType;
  term: string;
  onSelect: (e: { metaKey?: boolean }) => void;
  showShortcut?: boolean;
  staggerIndex?: number;
}) {
  const t = useTranslations('search');
  const locale = useLocale();
  const icon = item.meta.emoji || TYPE_ICON[item.type];
  const metaParts: string[] = [];
  if (item.meta.projectName) metaParts.push(item.meta.projectName);
  if (item.meta.date) metaParts.push(new Date(item.meta.date).toLocaleDateString(locale));

  return (
    <CommandItem
      value={`${item.type}::${item.id}::${item.title}`}
      onSelect={() => onSelect({})}
      aria-label={`${item.title}, ${t(`itemTypes.${item.type}`)}${metaParts.length ? ', ' + metaParts.join(', ') : ''}`}
      className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-(--duration-base)"
      data-stagger-item=""
      style={{ animationDelay: `${staggerIndex * 40}ms` }}
    >
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="truncate">
        {highlightMatch(item.title, term).map((seg, idx) =>
          seg.match ? (
            <mark
              key={idx}
              className="bg-amber-100 text-amber-700 font-semibold rounded-sm px-0.5"
            >
              {seg.text}
            </mark>
          ) : (
            <span key={idx}>{seg.text}</span>
          ),
        )}
      </span>
      <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
        {item.meta.status && STATUS_DOT[item.meta.status] && (
          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[item.meta.status]}`} />
        )}
        {metaParts.length > 0 && <span>{metaParts.join(' · ')}</span>}
        {showShortcut && <CommandShortcut>↵</CommandShortcut>}
      </span>
    </CommandItem>
  );
}

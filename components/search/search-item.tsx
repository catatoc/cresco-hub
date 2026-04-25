'use client';

import { CommandItem, CommandShortcut } from '@/components/ui/command';
import { Highlight } from './highlight';
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
}: {
  item: SearchItemType;
  term: string;
  onSelect: (e: { metaKey?: boolean }) => void;
  showShortcut?: boolean;
}) {
  const icon = item.meta.emoji || TYPE_ICON[item.type];
  const metaParts: string[] = [];
  if (item.meta.projectName) metaParts.push(item.meta.projectName);
  if (item.meta.date) metaParts.push(new Date(item.meta.date).toLocaleDateString('es'));

  return (
    <CommandItem
      value={`${item.type}::${item.id}::${item.title}`}
      onSelect={() => onSelect({})}
      aria-label={`${item.title}, ${item.type}${metaParts.length ? ', ' + metaParts.join(', ') : ''}`}
    >
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="truncate">
        <Highlight text={item.title} term={term} />
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

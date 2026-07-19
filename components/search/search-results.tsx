'use client';

import { useTranslations } from 'next-intl';
import { CommandGroup } from '@/components/ui/command';
import { SearchItemRow } from './search-item';
import type { SearchGroup, SearchItem } from '@/lib/search/types';

export function SearchResults({
  groups,
  term,
  onSelect,
}: {
  groups: SearchGroup[];
  term: string;
  onSelect: (item: SearchItem, opts: { metaKey?: boolean }) => void;
}) {
  const t = useTranslations('search');
  let staggerIndex = 0;
  return (
    <>
      {groups.map((g) => (
        <CommandGroup key={g.type} heading={`${t(`groups.${g.type}`)} · ${g.count}`}>
          {g.items.map((it, i) => {
            const sIdx = staggerIndex++;
            return (
              <SearchItemRow
                key={it.id}
                term={term}
                item={it}
                showShortcut={i === 0}
                staggerIndex={sIdx}
                onSelect={(opts) => onSelect(it, opts)}
              />
            );
          })}
        </CommandGroup>
      ))}
    </>
  );
}

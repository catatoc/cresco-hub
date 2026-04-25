'use client';

import { CommandGroup } from '@/components/ui/command';
import { SearchItemRow } from './search-item';
import type { SearchGroup, SearchItem } from '@/lib/search/types';

const GROUP_LABEL: Record<SearchGroup['type'], string> = {
  tasks: 'Tareas',
  meetings: 'Reuniones',
  wiki: 'Wiki',
  projects: 'Proyectos',
  people: 'Personas',
};

export function SearchResults({
  groups,
  term,
  onSelect,
}: {
  groups: SearchGroup[];
  term: string;
  onSelect: (item: SearchItem, opts: { metaKey?: boolean }) => void;
}) {
  return (
    <>
      {groups.map((g) => (
        <CommandGroup key={g.type} heading={`${GROUP_LABEL[g.type]} · ${g.count}`}>
          {g.items.map((it, i) => (
            <SearchItemRow
              key={it.id}
              term={term}
              item={it}
              showShortcut={i === 0}
              onSelect={(opts) => onSelect(it, opts)}
            />
          ))}
        </CommandGroup>
      ))}
    </>
  );
}

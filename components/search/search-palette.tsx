'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { useSearch } from '@/hooks/use-search';
import { useSearchRecents, type RecentItem } from '@/hooks/use-search-recents';
import { parsePrefix } from '@/lib/search/parse-prefix';
import type { SearchFilter, SearchItem } from '@/lib/search/types';
import { SearchEmptyState } from './search-empty-state';
import { SearchResults } from './search-results';
import { SearchNoResults } from './search-no-results';
import { SearchFilterPills } from './search-filter-pills';

export function SearchPalette({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
}) {
  const router = useRouter();
  const t = useTranslations('search');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const { recents, push } = useSearchRecents(customerId);

  const parsed = useMemo(() => parsePrefix(query), [query]);
  const effectiveFilter: SearchFilter = parsed.type ?? filter;
  const { data, isFetching } = useSearch(parsed.term, effectiveFilter, customerId);

  const hasTerm = parsed.term.trim().length >= 2;
  const hasResults = (data?.groups?.length ?? 0) > 0;

  // Fire a no-results event once per settled query (spec instrumentation).
  useEffect(() => {
    if (hasTerm && parsed.term.length >= 3 && data && !isFetching && !hasResults) {
      window.dispatchEvent(
        new CustomEvent('search:no-results', { detail: { qLen: parsed.term.length } }),
      );
    }
  }, [data, isFetching, hasResults, hasTerm, parsed.term]);

  function close() {
    onOpenChange(false);
    setQuery('');
    setFilter('all');
  }

  function handleSelect(item: SearchItem, opts: { metaKey?: boolean }) {
    push({ id: item.id, type: item.type, title: item.title, url: item.url });
    window.dispatchEvent(
      new CustomEvent('search:result-click', {
        detail: { type: item.type, hasQuery: parsed.term.length > 0 },
      }),
    );
    if (opts.metaKey) {
      window.open(item.url, '_blank');
    } else {
      router.push(item.url);
      close();
    }
  }

  function handleOpenRecent(item: RecentItem, opts: { metaKey?: boolean }) {
    push({ id: item.id, type: item.type, title: item.title, url: item.url });
    if (opts.metaKey) {
      window.open(item.url, '_blank');
    } else {
      router.push(item.url);
      close();
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('palette.title')}
      description={t('palette.description')}
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t('palette.placeholder')}
        />

        {hasTerm && (
          <SearchFilterPills
            value={effectiveFilter}
            onChange={(v) => setFilter(v)}
            groups={data?.groups ?? []}
          />
        )}

        <CommandList>
          {!hasTerm && (
            <SearchEmptyState
              customerId={customerId}
              recents={recents}
              onOpenRecent={handleOpenRecent}
              onClose={close}
            />
          )}

          {hasTerm && isFetching && !hasResults && (
            <div className="py-6 px-3 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {hasTerm && hasResults && (
            <SearchResults
              groups={data!.groups}
              term={parsed.term}
              onSelect={(item, opts) => handleSelect(item, opts)}
            />
          )}

          {hasTerm && !isFetching && !hasResults && (
            <CommandEmpty>
              <SearchNoResults term={parsed.term} onClose={close} />
            </CommandEmpty>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useGlobalHotkey } from '@/hooks/use-global-hotkey';
import { SearchPalette } from './search-palette';

type SearchContextValue = {
  open: () => void;
  close: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearchContext(): SearchContextValue {
  const v = useContext(SearchContext);
  if (!v) throw new Error('useSearchContext must be used inside <SearchProvider>');
  return v;
}

export function SearchProvider({
  customerId,
  children,
}: {
  customerId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openFn = useCallback(() => setOpen(true), []);
  const closeFn = useCallback(() => setOpen(false), []);

  useGlobalHotkey('k', openFn, { mod: true });

  return (
    <SearchContext.Provider value={{ open: openFn, close: closeFn }}>
      {children}
      <SearchPalette open={open} onOpenChange={setOpen} customerId={customerId} />
    </SearchContext.Provider>
  );
}

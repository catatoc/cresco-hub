'use client';

import { useEffect } from 'react';

export function useGlobalHotkey(key: string, handler: () => void, options?: { mod?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const modOk = options?.mod ? e.metaKey || e.ctrlKey : true;
      if (modOk && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler, options?.mod]);
}

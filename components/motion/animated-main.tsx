'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Replaces the layout's `<main>` so it remounts on pathname changes,
 * triggering the tw-animate-css enter animation on every route nav.
 *
 * Why: <main> in the (app) layout is preserved across navigations —
 * only its children change — so a CSS-only entrance animation never
 * fires. Keying on pathname forces a fresh mount, and the
 * `animate-in fade-in slide-in-from-bottom-1` chain fires once per
 * navigation.
 *
 * Trade-off: intercepted parallel routes (e.g. @modal/(.)tareas/[id])
 * also change pathname, so the underlying page may re-mount briefly
 * when the modal opens. Acceptable since the modal's own animation
 * is the visual focus during that interaction.
 */
export function AnimatedMain({ children, className }: Props) {
  const pathname = usePathname();
  return (
    <main
      key={pathname}
      className={cn(
        'flex flex-col min-h-0 min-w-0 overflow-hidden bg-white',
        'animate-in fade-in slide-in-from-bottom-1 fill-mode-both',
        'duration-(--duration-base) ease-(--ease-linear)',
        className,
      )}
    >
      {children}
    </main>
  );
}

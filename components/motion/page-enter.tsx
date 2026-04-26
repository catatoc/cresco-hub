import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** ms — `animation-delay` for staggered enters */
  delay?: number;
};

/**
 * Page-level enter animation. Each `page.tsx` opts in by wrapping its root.
 *
 * Replaces the old AnimatedMain (which keyed `<main>` on pathname and remounted
 * on every navigation, including parallel-route opens). Local opt-in means
 * pages preserve state across navigation while still animating on first mount.
 */
export function PageEnter({ children, className, delay = 0 }: Props) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-1 fill-mode-both',
        'duration-(--duration-base) ease-(--ease-linear)',
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

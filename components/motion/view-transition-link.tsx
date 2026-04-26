'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactNode, type MouseEvent } from 'react';

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps next/link to trigger document.startViewTransition() before
 * router.push, enabling CSS view transitions on SPA navigation.
 *
 * Falls back to default <Link> behavior in browsers without the API.
 */
export function ViewTransitionLink({ href, children, className, ...rest }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (
      e.defaultPrevented ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      e.button !== 0 ||
      typeof href !== 'string'
    ) {
      return;
    }
    if (typeof document.startViewTransition !== 'function') {
      return;
    }
    e.preventDefault();
    document.startViewTransition(() => {
      startTransition(() => {
        router.push(href);
      });
    });
  }

  return (
    <Link href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}

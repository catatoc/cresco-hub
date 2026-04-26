'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/components/motion/m';

type Props = {
  href: string;
  icon: React.ReactNode;
  kbd?: string;
  count?: number;
  children: React.ReactNode;
  exact?: boolean;
};

export function NavItem({ href, icon, kbd, count, children, exact }: Props) {
  const pathname = usePathname();
  const active =
    exact || href === '/' || href === '#'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-[13px] font-normal text-muted-foreground transition-[background-color,color] duration-(--duration-fast) ease-(--ease-linear) hover:bg-black/[0.04] hover:text-foreground',
        active && 'bg-white text-foreground font-medium shadow-sm border border-border',
      )}
    >
      {active && (
        <m.span
          layoutId="sidebar-active-indicator"
          className="absolute -left-px top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {kbd && (
        <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/[0.06] text-muted-foreground font-[inherit]">
          {kbd}
        </kbd>
      )}
      {typeof count === 'number' && (
        <span className="text-[11px] bg-black/[0.05] text-muted-foreground px-1.5 rounded-full min-w-[18px] text-center leading-[18px]">
          {count}
        </span>
      )}
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Calendar, BookOpen, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LayoutGroup, m } from '@/components/motion/m';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/tareas', label: 'Tareas', icon: CheckSquare },
  { href: '/reuniones', label: 'Reuniones', icon: Calendar },
  { href: '/wiki', label: 'Wiki', icon: BookOpen },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-border/60 bg-white/65 supports-[backdrop-filter]:bg-white/55 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-1px_0_rgba(255,255,255,0.6)_inset] pb-[env(safe-area-inset-bottom)]"
    >
      <LayoutGroup id="bottom-nav">
        <ul className="flex items-stretch justify-around h-16">
          {ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1 min-w-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative h-full flex flex-col items-center justify-center gap-1 px-2 rounded-lg',
                    'text-[10px] font-medium tracking-[0.02em] text-muted-foreground transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    'active:bg-black/[0.04]',
                    active && 'text-foreground',
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="bottom-nav-active"
                      className="absolute inset-x-2 inset-y-1.5 rounded-lg bg-[#eeeffc]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    aria-hidden
                    className={cn(
                      'relative w-[18px] h-[18px] shrink-0 transition-colors',
                      active && 'text-[#5e6ad2]',
                    )}
                  />
                  <span className="relative truncate max-w-full">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </LayoutGroup>
    </nav>
  );
}

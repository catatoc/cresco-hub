'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Crumb = { label: string; href?: string };

type Props = {
  crumbs: Crumb[];
};

export function TaskDetailHeader({ crumbs }: Props) {
  const router = useRouter();
  const backRef = useRef<HTMLButtonElement>(null);

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/tareas');
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <div className="h-11 border-b border-border flex items-center px-4 gap-2 sm:gap-3 shrink-0 bg-white">
      <button
        ref={backRef}
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1 px-2 py-1 -ml-2 min-h-[36px] sm:min-h-0 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-(--duration-fast) ease-(--ease-out-soft) shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Volver a Tareas"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Volver</span>
      </button>
      <nav className="flex items-center gap-2 text-[13px] min-w-0 flex-1">
        <Link
          href="/tareas"
          className="hidden sm:inline-flex text-foreground font-medium hover:underline shrink-0"
        >
          Tareas
        </Link>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span
              key={i}
              className={cn(
                'flex items-center gap-2 min-w-0',
                !isLast && 'hidden md:flex',
              )}
            >
              <span className="text-muted-foreground shrink-0">/</span>
              {c.href ? (
                <Link
                  href={c.href}
                  className="text-muted-foreground hover:text-foreground truncate max-w-[40vw] sm:max-w-[24ch]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-muted-foreground truncate max-w-[40vw] sm:max-w-[24ch]">
                  {c.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

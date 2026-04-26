'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';

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
    <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-white">
      <button
        ref={backRef}
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1 px-2 py-1 -ml-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-(--duration-fast) ease-(--ease-out-soft)"
        aria-label="Volver a Tareas"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Volver
      </button>
      <nav className="flex items-center gap-2 text-[13px] min-w-0">
        <Link href="/tareas" className="text-foreground font-medium hover:underline">
          Tareas
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            <span className="text-muted-foreground">/</span>
            {c.href ? (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground truncate">
                {c.label}
              </Link>
            ) : (
              <span className="text-muted-foreground truncate">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/lib/i18n/locale';
import { cn } from '@/lib/utils';

export function useLanguageSwitch() {
  const router = useRouter();
  const serverLocale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  // El refresh re-consulta el servidor (en el portal, todo Notion) y tarda:
  // el estado optimista voltea el pill al instante y se re-sincroniza al llegar
  // el render con el locale real.
  const [optimistic, setOptimistic] = useState<Locale>(serverLocale);

  useEffect(() => {
    if (!pending) setOptimistic(serverLocale);
  }, [serverLocale, pending]);

  function switchTo(next: Locale) {
    if (next === optimistic || pending) return;
    setOptimistic(next);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => router.refresh());
  }

  const otherLocale: Locale = serverLocale === 'es' ? 'en' : 'es';
  return { locale: optimistic, serverLocale, otherLocale, switchTo, pending };
}

/** Pill ES/EN — para login, portal y cualquier superficie sin menú de usuario. */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations('common.language');
  const { locale, switchTo, pending } = useLanguageSwitch();

  return (
    <div
      role="group"
      aria-label={t('label')}
      aria-busy={pending}
      className={cn(
        'relative z-10 inline-flex items-center gap-0.5 rounded-full p-0.5',
        'border border-[#1A1612]/10 bg-[#F7F3EA]/70 backdrop-blur-sm',
        'shadow-[0_1px_2px_rgba(26,22,18,.05)]',
        'animate-in fade-in slide-in-from-top-1 duration-(--duration-slow) ease-(--ease-out-soft)',
        pending && 'cursor-wait',
        className,
      )}
    >
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            disabled={pending}
            aria-pressed={active}
            aria-label={t(l)}
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]',
              'transition-colors duration-(--duration-base) ease-(--ease-out-soft)',
              'outline-none focus-visible:ring-2 focus-visible:ring-[#3D5240]/40',
              active
                ? 'bg-[#3D5240] text-[#F7F3EA]'
                : 'text-[#8C8377] hover:text-[#5C544A]',
              active && pending && 'animate-pulse',
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

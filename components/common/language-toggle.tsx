'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/lib/i18n/locale';
import { cn } from '@/lib/utils';

export function useLanguageSwitch() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => router.refresh());
  }

  const otherLocale: Locale = locale === 'es' ? 'en' : 'es';
  return { locale, otherLocale, switchTo, pending };
}

/** Pill ES/EN — para login, portal y cualquier superficie sin menú de usuario. */
export function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations('common.language');
  const { locale, switchTo } = useLanguageSwitch();

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-background/80 p-0.5 text-[11px] font-medium',
        className,
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={locale === l}
          aria-label={t(l)}
          className={cn(
            'rounded-full px-2 py-0.5 uppercase tracking-[0.04em] transition-colors',
            locale === l
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

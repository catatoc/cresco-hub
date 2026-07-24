export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

type HeaderReader = { get(name: string): string | null };

/**
 * Resuelve el locale de la request: la cookie explícita (el toggle) gana;
 * sin cookie, español siempre. El inglés es opt-in — sin detección por país
 * ni Accept-Language (un cliente venezolano viajando no debe ver inglés).
 */
export function detectLocale(cookieValue: string | undefined, _headers: HeaderReader): Locale {
  if (cookieValue && (LOCALES as readonly string[]).includes(cookieValue)) {
    return cookieValue as Locale;
  }
  return DEFAULT_LOCALE;
}

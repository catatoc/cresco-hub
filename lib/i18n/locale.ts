export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

// Países hispanohablantes (ISO 3166-1 alpha-2). Cualquier otro país → inglés.
const SPANISH_COUNTRIES = new Set([
  'ES', 'MX', 'VE', 'CO', 'AR', 'PE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO',
  'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ', 'PR',
]);

type HeaderReader = { get(name: string): string | null };

/**
 * Resuelve el locale de la request: cookie explícita (el toggle) gana,
 * luego geo de Vercel (x-vercel-ip-country), luego Accept-Language.
 * Sin señales → español (comportamiento histórico de la app).
 */
export function detectLocale(cookieValue: string | undefined, headers: HeaderReader): Locale {
  if (cookieValue && (LOCALES as readonly string[]).includes(cookieValue)) {
    return cookieValue as Locale;
  }

  const country = headers.get('x-vercel-ip-country');
  if (country) return SPANISH_COUNTRIES.has(country.toUpperCase()) ? 'es' : 'en';

  const accept = headers.get('accept-language');
  if (accept) {
    for (const part of accept.split(',')) {
      const lang = part.trim().toLowerCase();
      if (lang.startsWith('es')) return 'es';
      if (lang.startsWith('en')) return 'en';
    }
  }

  return DEFAULT_LOCALE;
}

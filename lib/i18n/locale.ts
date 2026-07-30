export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Idioma por defecto del cliente activo. La escriben los dos puntos donde el
 * cliente activo se conoce (el callback de login y el switch de cliente), y
 * cede siempre ante el toggle. Cookie aparte a propósito: NEXT_LOCALE sigue
 * significando "el usuario eligió esto".
 */
export const CUSTOMER_LOCALE_COOKIE = 'customer-locale';

/**
 * Clientes que arrancan en un idioma distinto al default del portal.
 * Temporal y deliberadamente una constante: si esto deja de ser una prueba,
 * se cambia por una propiedad `Locale` en la base Customers sin tocar el
 * resto del cableado.
 */
export const CUSTOMER_LOCALES: Record<string, Locale> = {
  // amedi — inglés para pruebas (2026-07-31)
  '31a8af9a-4f71-80e8-b61b-d7888a9007e2': 'en',
};

/** El idioma de arranque de un cliente, o null si usa el default del portal. */
export function localeForCustomer(customerId: string | null | undefined): Locale | null {
  if (!customerId) return null;
  return CUSTOMER_LOCALES[customerId] ?? null;
}

const asLocale = (value: string | undefined): Locale | null =>
  value && (LOCALES as readonly string[]).includes(value) ? (value as Locale) : null;

type HeaderReader = { get(name: string): string | null };

/**
 * Resuelve el locale de la request, en orden: la cookie explícita (el toggle)
 * gana; si no, el default del cliente activo; si no, español. El inglés sigue
 * siendo opt-in — sin detección por país ni Accept-Language (un cliente
 * venezolano viajando no debe ver inglés).
 */
export function detectLocale(
  cookieValue: string | undefined,
  customerLocaleValue: string | undefined,
  _headers: HeaderReader,
): Locale {
  return asLocale(cookieValue) ?? asLocale(customerLocaleValue) ?? DEFAULT_LOCALE;
}

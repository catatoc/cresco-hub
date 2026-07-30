import 'server-only';
import { cookies } from 'next/headers';
import { lookupContextData, SELECTED_CUSTOMER_COOKIE } from '@/lib/auth/context';
import { localeForCustomer, type Locale } from '@/lib/i18n/locale';

/** Mismas opciones que la cookie de cliente seleccionado — viven juntas y duran lo mismo. */
export const CUSTOMER_LOCALE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
} as const;

/**
 * El idioma de arranque del cliente activo de este miembro, o null si usa el
 * default del portal.
 *
 * Replica la elección de cliente activo de `resolveContext`: la selección
 * previa si sigue siendo válida, si no el primer cliente del miembro. Un fallo
 * de Notion devuelve null — el idioma nunca debe bloquear un login.
 */
export async function resolveActiveCustomerLocale(email: string | null): Promise<Locale | null> {
  if (!email) return null;
  try {
    const looked = await lookupContextData(email);
    if (!looked) return null;

    const cookieStore = await cookies();
    const selectedId = cookieStore.get(SELECTED_CUSTOMER_COOKIE)?.value;
    const active =
      (selectedId ? looked.customers.find((c) => c.id === selectedId) : undefined) ??
      looked.customers[0];

    return localeForCustomer(active?.id);
  } catch {
    return null;
  }
}

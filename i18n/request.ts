import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { CUSTOMER_LOCALE_COOKIE, detectLocale, LOCALE_COOKIE } from '@/lib/i18n/locale';

// Un archivo por módulo para que las traducciones vivan cerca de su dominio.
const NAMESPACES = [
  'common',
  'shell',
  'home',
  'upcoming',
  'kanban',
  'editTasks',
  'create',
  'projects',
  'wiki',
  'meetings',
  'search',
  'portal',
  'auth',
  'testUsers',
  'legal',
  'ui',
] as const;

export default getRequestConfig(async () => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    cookieStore.get(CUSTOMER_LOCALE_COOKIE)?.value,
    headerStore,
  );

  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../messages/${locale}/${ns}.json`)).default] as const),
  );

  return { locale, messages: Object.fromEntries(entries) };
});

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Los componentes migrados a next-intl llaman useTranslations/useLocale y en los
// tests no hay NextIntlClientProvider. Este mock resuelve las claves contra los
// mensajes reales en español, así las aserciones existentes siguen pasando.
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  const namespaces = [
    'common', 'shell', 'home', 'upcoming', 'kanban', 'editTasks', 'create',
    'projects', 'wiki', 'meetings', 'search', 'portal', 'auth', 'testUsers',
    'legal', 'ui',
  ];
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, (await import(`./messages/es/${ns}.json`)).default] as const),
  );
  const messages = Object.fromEntries(entries);
  return {
    ...actual,
    useLocale: () => 'es',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useTranslations: (namespace?: string) =>
      (actual as any).createTranslator({ locale: 'es', messages, namespace }),
  };
});

import { es, enUS } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';

/** Locale de date-fns correspondiente al locale de la app. */
export function dateLocale(locale: string): DateFnsLocale {
  return locale === 'es' ? es : enUS;
}

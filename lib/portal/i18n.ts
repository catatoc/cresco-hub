// ── Portal del cliente · i18n de la capa server ─────────────────────────────
// Los labels que lib/portal genera en el server (fechas + textos sueltos) se
// resuelven aquí, con un diccionario puro y tipado. A propósito NO usa
// next-intl: la capa se mantiene pura y testeable, y las páginas del portal le
// pasan el locale ya resuelto con getLocale(). El default es 'es' para que el
// API móvil (app/api/portal/**) siga produciendo exactamente lo mismo.

export type PortalLocale = 'es' | 'en';

interface PortalStrings {
  meetingDefaultTitle: string;
  projectDefaultName: string;
  proposalDefaultTitle: string;
  testUserDefaultName: string;
  infraServiceDefaultName: string;
  paymentDefaultDescription: string;
  pillInProgress: string;
  pillPaused: string;
  pillStarting: string;
  delivery: string; // "· entrega"
  noDate: string; // "— · sin fecha"
  dash: string; // fallback de startLabel
}

const DICT: Record<PortalLocale, PortalStrings> = {
  es: {
    meetingDefaultTitle: 'Reunión',
    projectDefaultName: '(sin nombre)',
    proposalDefaultTitle: 'Propuesta',
    testUserDefaultName: 'Cuenta de prueba',
    infraServiceDefaultName: 'Servicio',
    paymentDefaultDescription: 'Pago',
    pillInProgress: 'en curso',
    pillPaused: 'en pausa',
    pillStarting: 'arrancando',
    delivery: 'entrega',
    noDate: 'sin fecha',
    dash: '—',
  },
  en: {
    meetingDefaultTitle: 'Meeting',
    projectDefaultName: '(untitled)',
    proposalDefaultTitle: 'Proposal',
    testUserDefaultName: 'Test account',
    infraServiceDefaultName: 'Service',
    paymentDefaultDescription: 'Payment',
    pillInProgress: 'in progress',
    pillPaused: 'on hold',
    pillStarting: 'starting',
    delivery: 'delivery',
    noDate: 'no date',
    dash: '—',
  },
};

export function portalDict(locale: PortalLocale = 'es'): PortalStrings {
  return DICT[locale];
}

/** Un string fijo o su par bilingüe — para contenido específico (p. ej. stacks). */
export type Localized = string | { es: string; en: string };

/** Resuelve un Localized al locale pedido; un string plano vale para ambos. */
export function pick(value: Localized | null | undefined, locale: PortalLocale = 'es'): string {
  if (value == null) return '';
  return typeof value === 'string' ? value : value[locale];
}

const intlLocale = (locale: PortalLocale): string => (locale === 'es' ? 'es' : 'en-US');

// ── fechas ───────────────────────────────────────────────────────────────────
// Leemos día/mes/hora en UTC del string ISO (nunca el huso del server), para
// respetar el huso con el que se guardó la fecha en Notion. Ver meeting.ts.

/** "8 jun" (es) · "Jun 8" (en) — día calendario en UTC; null si el ISO no parsea. */
export function dayMonthLabel(iso: string, locale: PortalLocale = 'es'): string | null {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  const month = new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', timeZone: 'UTC' }).format(d);
  return locale === 'es' ? `${day} ${month}` : `${month} ${day}`;
}

/** "junio 2026" (es) · "July 2026" (en) — mes/año del Date en el huso del server. */
export function monthYearLabel(date: Date, locale: PortalLocale = 'es'): string {
  const month = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long' }).format(date);
  return `${month} ${date.getFullYear()}`;
}

/**
 * Labels de fecha de una reunión, respetando el huso guardado en Notion.
 * es: "8 jun" · "lunes 8 de junio · 8:30 pm"
 * en: "Jun 8" · "Monday, June 8 · 8:30 pm"
 */
export function meetingDateLabels(
  iso: string | null,
  locale: PortalLocale = 'es',
): { dateLabel: string; fullDateLabel: string } {
  if (!iso) return { dateLabel: '', fullDateLabel: '' };
  const datePart = iso.slice(0, 10);
  const d = new Date(datePart + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return { dateLabel: '', fullDateLabel: '' };

  const loc = intlLocale(locale);
  const day = d.getUTCDate();
  const weekday = new Intl.DateTimeFormat(loc, { weekday: 'long', timeZone: 'UTC' }).format(d);
  const monthShort = new Intl.DateTimeFormat(loc, { month: 'short', timeZone: 'UTC' }).format(d);
  const monthLong = new Intl.DateTimeFormat(loc, { month: 'long', timeZone: 'UTC' }).format(d);

  const dateLabel = locale === 'es' ? `${day} ${monthShort}` : `${monthShort} ${day}`;
  let full = locale === 'es' ? `${weekday} ${day} de ${monthLong}` : `${weekday}, ${monthLong} ${day}`;

  const time = /T(\d{2}):(\d{2})/.exec(iso);
  if (time) {
    const h24 = Number(time[1]);
    const min = time[2];
    const ampm = h24 < 12 ? 'am' : 'pm';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    full += ` · ${h12}:${min} ${ampm}`;
  }
  return { dateLabel, fullDateLabel: full };
}

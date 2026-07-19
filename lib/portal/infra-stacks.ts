// ── Portal del cliente · stacks de infraestructura ──────────────────────────
// El modelo de costos vive en el repo (no en Notion) porque es una curva, no
// una factura: cada servicio define cuánto cuesta al mes en función de los
// usuarios activos, siguiendo los tiers reales del proveedor. El simulador
// del portal ("¿y si llegamos a X usuarios?") se precalcula en el server.
//
// Para agregar un cliente: definir su stack aquí y matchearlo en STACKS.

import type { Localized } from './i18n';

export interface InfraServiceDef {
  name: Localized;
  detail: Localized;
  /** costo mensual estimado en USD para `users` usuarios activos */
  monthlyAt: (users: number) => number;
  /** servicios con el mismo group se muestran como acordeón (p. ej. los servidores) */
  group?: Localized;
  /** explicación en cristiano para el cliente — se muestra al tocar el ⓘ */
  info?: Localized;
}

export interface InfraStackDef {
  /** usuarios activos estimados hoy — el primer stop del slider */
  baselineUsers: number;
  /** escalones del simulador (incluye el baseline como primer valor) */
  stops: number[];
  services: InfraServiceDef[];
}

/** escalera de tiers: [hastaUsuarios, precio]; el último escalón usa Infinity */
const tiers =
  (steps: [number, number][]) =>
  (users: number): number => {
    for (const [upTo, price] of steps) if (users <= upTo) return price;
    return steps[steps.length - 1]![1];
  };

// ── amedi · salud ────────────────────────────────────────────────────────────
// Stack real del repo: 4 servicios web en Render (api NestJS + client,
// consultorio y admin en Next.js), Supabase Pro (base de datos + auth),
// DigitalOcean Spaces + CDN (archivos), Postmark, WhatsApp Cloud API.
// Cada servidor escala su plan por separado según el tráfico que recibe:
// el API primero, la web del paciente después, consultorio y admin al final.
const AMEDI: InfraStackDef = {
  baselineUsers: 200,
  stops: [200, 500, 1_000, 2_500, 5_000, 10_000],
  services: [
    {
      name: 'API',
      detail: {
        es: 'servidor NestJS — el corazón · plan Standard',
        en: 'NestJS server — the core · Standard plan',
      },
      monthlyAt: tiers([[5_000, 25], [Infinity, 85]]),
      group: { es: 'Servidores · producción', en: 'Servers · production' },
      info: {
        es: 'El cerebro de la plataforma: procesa las citas, las historias clínicas y los permisos. Todas las apps hablan con él.',
        en: 'The brain of the platform: it processes appointments, medical records and permissions. Every app talks to it.',
      },
    },
    {
      name: { es: 'Web del paciente', en: 'Patient web' },
      detail: { es: 'app de citas (client)', en: 'appointments app (client)' },
      monthlyAt: tiers([[2_500, 7], [Infinity, 25]]),
      group: { es: 'Servidores · producción', en: 'Servers · production' },
      info: {
        es: 'La página donde tus pacientes agendan, pagan y ven sus citas.',
        en: 'The site where your patients book, pay and see their appointments.',
      },
    },
    {
      name: { es: 'Consultorio', en: 'Practice' },
      detail: { es: 'panel del doctor', en: "doctor's panel" },
      monthlyAt: tiers([[5_000, 7], [Infinity, 25]]),
      group: { es: 'Servidores · producción', en: 'Servers · production' },
      info: {
        es: 'Donde el doctor atiende: su agenda del día y la historia clínica del paciente.',
        en: "Where the doctor works: their daily schedule and the patient's medical record.",
      },
    },
    {
      name: 'Admin',
      detail: { es: 'panel de la clínica', en: 'clinic panel' },
      monthlyAt: tiers([[10_000, 7], [Infinity, 25]]),
      group: { es: 'Servidores · producción', en: 'Servers · production' },
      info: {
        es: 'Donde la clínica administra doctores, horarios, pagos y reportes.',
        en: 'Where the clinic manages doctors, schedules, payments and reports.',
      },
    },
    {
      name: { es: 'Supabase · base de datos + auth', en: 'Supabase · database + auth' },
      detail: { es: 'plan Pro · crece con cómputo', en: 'Pro plan · scales with compute' },
      monthlyAt: tiers([[5_000, 25], [Infinity, 75]]),
      info: {
        es: 'Guarda todos los datos (pacientes, citas, historias) y maneja los inicios de sesión de forma segura.',
        en: 'Stores all the data (patients, appointments, records) and handles logins securely.',
      },
    },
    {
      name: 'DigitalOcean Spaces',
      detail: { es: 'archivos + CDN · 250 GB incluidos', en: 'files + CDN · 250 GB included' },
      monthlyAt: tiers([[10_000, 5], [Infinity, 10]]),
      info: {
        es: 'Donde viven los archivos: estudios, imágenes y documentos de los pacientes, servidos rápido desde un CDN.',
        en: "Where the files live: patients' studies, images and documents, served fast from a CDN.",
      },
    },
    {
      name: { es: 'Postmark · correos', en: 'Postmark · email' },
      detail: { es: 'confirmaciones y recordatorios', en: 'confirmations and reminders' },
      monthlyAt: tiers([[2_500, 15], [12_000, 55], [Infinity, 115]]),
      info: {
        es: 'Envía los correos de la plataforma: confirmaciones de cita, recuperación de clave, facturas.',
        en: 'Sends the platform emails: appointment confirmations, password recovery, invoices.',
      },
    },
    {
      name: 'WhatsApp Cloud API',
      detail: { es: 'recordatorios de cita · por uso', en: 'appointment reminders · usage-based' },
      // ~2 conversaciones utility por usuario activo al mes (~$0.02 c/u)
      monthlyAt: (u) => Math.max(2, u * 0.04),
      info: {
        es: 'Los mensajes de WhatsApp que le llegan al paciente: recordatorios y confirmaciones. Se paga por mensaje enviado.',
        en: 'The WhatsApp messages the patient receives: reminders and confirmations. Billed per message sent.',
      },
    },
    {
      name: { es: 'Dominio · amedisalud.com', en: 'Domain · amedisalud.com' },
      detail: { es: 'renovación anual', en: 'annual renewal' },
      monthlyAt: () => 1.5,
      info: {
        es: 'La dirección de tu plataforma en internet — se renueva una vez al año.',
        en: "Your platform's address on the internet — renewed once a year.",
      },
    },
  ],
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const STACKS: { match: (customerName: string) => boolean; stack: InfraStackDef }[] = [
  { match: (n) => norm(n).includes('amedi'), stack: AMEDI },
];

export function findInfraStack(customerName: string): InfraStackDef | null {
  return STACKS.find((s) => s.match(customerName))?.stack ?? null;
}

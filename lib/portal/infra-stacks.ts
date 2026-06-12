// ── Portal del cliente · stacks de infraestructura ──────────────────────────
// El modelo de costos vive en el repo (no en Notion) porque es una curva, no
// una factura: cada servicio define cuánto cuesta al mes en función de los
// usuarios activos, siguiendo los tiers reales del proveedor. El simulador
// del portal ("¿y si llegamos a X usuarios?") se precalcula en el server.
//
// Para agregar un cliente: definir su stack aquí y matchearlo en STACKS.

export interface InfraServiceDef {
  name: string;
  detail: string;
  /** costo mensual estimado en USD para `users` usuarios activos */
  monthlyAt: (users: number) => number;
  /** servicios con el mismo group se muestran como acordeón (p. ej. los servidores) */
  group?: string;
  /** explicación en cristiano para el cliente — se muestra al tocar el ⓘ */
  info?: string;
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
      detail: 'servidor NestJS — el corazón · plan Standard',
      monthlyAt: tiers([[5_000, 25], [Infinity, 85]]),
      group: 'Servidores · producción',
      info: 'El cerebro de la plataforma: procesa las citas, las historias clínicas y los permisos. Todas las apps hablan con él.',
    },
    {
      name: 'Web del paciente',
      detail: 'app de citas (client)',
      monthlyAt: tiers([[2_500, 7], [Infinity, 25]]),
      group: 'Servidores · producción',
      info: 'La página donde tus pacientes agendan, pagan y ven sus citas.',
    },
    {
      name: 'Consultorio',
      detail: 'panel del doctor',
      monthlyAt: tiers([[5_000, 7], [Infinity, 25]]),
      group: 'Servidores · producción',
      info: 'Donde el doctor atiende: su agenda del día y la historia clínica del paciente.',
    },
    {
      name: 'Admin',
      detail: 'panel de la clínica',
      monthlyAt: tiers([[10_000, 7], [Infinity, 25]]),
      group: 'Servidores · producción',
      info: 'Donde la clínica administra doctores, horarios, pagos y reportes.',
    },
    {
      name: 'Supabase · base de datos + auth',
      detail: 'plan Pro · crece con cómputo',
      monthlyAt: tiers([[5_000, 25], [Infinity, 75]]),
      info: 'Guarda todos los datos (pacientes, citas, historias) y maneja los inicios de sesión de forma segura.',
    },
    {
      name: 'DigitalOcean Spaces',
      detail: 'archivos + CDN · 250 GB incluidos',
      monthlyAt: tiers([[10_000, 5], [Infinity, 10]]),
      info: 'Donde viven los archivos: estudios, imágenes y documentos de los pacientes, servidos rápido desde un CDN.',
    },
    {
      name: 'Postmark · correos',
      detail: 'confirmaciones y recordatorios',
      monthlyAt: tiers([[2_500, 15], [12_000, 55], [Infinity, 115]]),
      info: 'Envía los correos de la plataforma: confirmaciones de cita, recuperación de clave, facturas.',
    },
    {
      name: 'WhatsApp Cloud API',
      detail: 'recordatorios de cita · por uso',
      // ~2 conversaciones utility por usuario activo al mes (~$0.02 c/u)
      monthlyAt: (u) => Math.max(2, u * 0.04),
      info: 'Los mensajes de WhatsApp que le llegan al paciente: recordatorios y confirmaciones. Se paga por mensaje enviado.',
    },
    {
      name: 'Dominio · amedisalud.com',
      detail: 'renovación anual',
      monthlyAt: () => 1.5,
      info: 'La dirección de tu plataforma en internet — se renueva una vez al año.',
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

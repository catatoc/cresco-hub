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
// Stack real del repo: API NestJS (Docker → Render), client/admin/consultorio
// (Next.js → Vercel), Supabase auth + storage, Postmark, WhatsApp Cloud API.
const AMEDI: InfraStackDef = {
  baselineUsers: 200,
  stops: [200, 500, 1_000, 2_500, 5_000, 10_000],
  services: [
    {
      name: 'Render · API',
      detail: 'servicio web NestJS',
      monthlyAt: tiers([[500, 7], [5_000, 25], [Infinity, 85]]),
    },
    {
      name: 'Render · PostgreSQL',
      detail: 'base de datos',
      monthlyAt: tiers([[2_000, 19], [10_000, 55], [Infinity, 185]]),
    },
    {
      name: 'Vercel · web + admin',
      detail: 'portal del paciente y paneles',
      monthlyAt: tiers([[5_000, 20], [Infinity, 40]]),
    },
    {
      name: 'Supabase · auth + archivos',
      detail: 'autenticación y almacenamiento',
      monthlyAt: tiers([[100_000, 25], [Infinity, 75]]),
    },
    {
      name: 'Postmark · correos',
      detail: 'confirmaciones y recordatorios',
      monthlyAt: tiers([[2_500, 15], [12_000, 55], [Infinity, 115]]),
    },
    {
      name: 'WhatsApp Cloud API',
      detail: 'recordatorios de cita · por uso',
      // ~2 conversaciones utility por usuario activo al mes (~$0.02 c/u)
      monthlyAt: (u) => Math.max(2, u * 0.04),
    },
    {
      name: 'Dominio · amedisalud.com',
      detail: 'renovación anual',
      monthlyAt: () => 1.5,
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

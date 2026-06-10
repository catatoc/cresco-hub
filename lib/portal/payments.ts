// ── Portal del cliente · pagos ──────────────────────────────────────────────
// Lee la base Finance de Notion. Esa base mezcla finanzas internas de crescō
// con pagos de clientes, así que la frontera es doble y vive en el server:
// Customer = customer del contexto Y Type = Payment. Nada más sale de aquí.
// Si la base no está configurada o no es accesible, devuelve [] y la sección
// no se muestra (degradación silenciosa, el portal nunca se cae por esto).
import { serverEnv } from '@/lib/env';
import { queryAllRaw } from './data';
import type { AppContext } from '@/lib/auth/context';

export interface PortalPayment {
  id: string;
  description: string;
  notes: string | null; // texto largo: qué cubre este pago (propiedad Notes)
  amount: number;
  amountLabel: string; // "$3,500"
  dateLabel: string | null; // "1 mar" — Date o, si no hay, Due date
  paid: boolean;
}

export interface PortalPayments {
  items: PortalPayment[];
  pendingTotal: number;
  pendingLabel: string;
}

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dayMonth = (iso: string) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`;
};

export const money = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

// Status puede ser status o select según cómo esté la base; mismo trato
const selectName = (prop: any): string | null =>
  prop?.status?.name ?? prop?.select?.name ?? null;

export function parsePaymentRow(row: any): PortalPayment {
  const p = row.properties as Record<string, any>;
  // el título de Finance se llama "Description"; por si cambia, caemos al title que haya
  const titleProp = p.Description?.title
    ? p.Description
    : (Object.values(p).find((v: any) => v?.type === 'title') as any);
  const amount: number = typeof p.Amount?.number === 'number' ? p.Amount.number : 0;
  const date: string | null = p.Date?.date?.start ?? p['Due date']?.date?.start ?? null;
  return {
    id: row.id,
    description: ((titleProp?.title ?? []) as any[]).map((t) => t.plain_text).join('') || 'Pago',
    notes: ((p.Notes?.rich_text ?? []) as any[]).map((t) => t.plain_text).join('').trim() || null,
    amount,
    amountLabel: money(amount),
    dateLabel: date ? dayMonth(date) : null,
    paid: selectName(p.Status) === 'Paid',
  };
}

export async function loadPortalPayments(ctx: AppContext): Promise<PortalPayments> {
  const empty: PortalPayments = { items: [], pendingTotal: 0, pendingLabel: money(0) };
  const dataSourceId = serverEnv.NOTION_DB_FINANCE;
  if (!dataSourceId) return empty;

  try {
    const rows = await queryAllRaw(dataSourceId, {
      and: [
        { property: 'Customer', relation: { contains: ctx.customerId } },
        { property: 'Type', select: { equals: 'Payment' } },
      ],
    });
    const items = rows.map(parsePaymentRow);
    // pendientes primero, luego pagados (recientes arriba dentro de cada grupo)
    items.sort((a, b) => Number(a.paid) - Number(b.paid));
    const pendingTotal = items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
    return { items, pendingTotal, pendingLabel: money(pendingTotal) };
  } catch (e) {
    console.error('[portal] loadPortalPayments failed', e);
    return empty;
  }
}

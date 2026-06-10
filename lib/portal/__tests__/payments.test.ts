import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const env: Record<string, string | undefined> = {};
vi.mock('@/lib/env', () => ({ serverEnv: new Proxy({}, { get: (_t, p: string) => env[p] }) }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { parsePaymentRow, money, loadPortalPayments } from '../payments';
import type { AppContext } from '@/lib/auth/context';

const ctx = { customerId: 'customer-amedi', memberId: 'm-1' } as AppContext;

beforeEach(() => {
  mockNotion.dataSources.query.mockReset();
  delete env.NOTION_DB_FINANCE;
});

describe('money', () => {
  it('enteros sin decimales, fracciones con dos', () => {
    expect(money(3500)).toBe('$3,500');
    expect(money(40.5)).toBe('$40.50');
    expect(money(0)).toBe('$0');
  });
});

describe('parsePaymentRow', () => {
  it('parsea descripción, monto, fecha y estado', () => {
    const row = {
      id: 'pay-1',
      properties: {
        Description: { type: 'title', title: [{ plain_text: 'Adelanto 1 - Amedi' }] },
        Amount: { number: 3500 },
        Date: { date: { start: '2026-03-01' } },
        Status: { status: { name: 'Paid' } },
      },
    };
    expect(parsePaymentRow(row)).toEqual({
      id: 'pay-1',
      description: 'Adelanto 1 - Amedi',
      notes: null,
      amount: 3500,
      amountLabel: '$3,500',
      dateLabel: '1 mar',
      paid: true,
    });
  });

  it('Status como select también cuenta, y sin fecha cae a Due date o null', () => {
    const row = {
      id: 'pay-2',
      properties: {
        Description: { type: 'title', title: [{ plain_text: 'Adelanto 2' }] },
        Amount: { number: 3500 },
        Status: { select: { name: 'Pending' } },
        'Due date': { date: { start: '2026-07-15' } },
      },
    };
    const parsed = parsePaymentRow(row);
    expect(parsed.paid).toBe(false);
    expect(parsed.dateLabel).toBe('15 jul');
    expect(parsePaymentRow({ id: 'x', properties: { Amount: { number: 1 } } }).dateLabel).toBeNull();
  });
});

describe('loadPortalPayments', () => {
  it('sin NOTION_DB_FINANCE → vacío sin tocar Notion (degradación)', async () => {
    const out = await loadPortalPayments(ctx);
    expect(out).toEqual({ items: [], pendingTotal: 0, pendingLabel: '$0' });
    expect(mockNotion.dataSources.query).not.toHaveBeenCalled();
  });

  it('suma pendientes y ordena pendientes primero', async () => {
    env.NOTION_DB_FINANCE = 'finance-db';
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        { id: 'a', properties: { Description: { type: 'title', title: [{ plain_text: 'Pagado' }] }, Amount: { number: 2850 }, Status: { status: { name: 'Paid' } } } },
        { id: 'b', properties: { Description: { type: 'title', title: [{ plain_text: 'Adelanto 1' }] }, Amount: { number: 3500 }, Status: { status: { name: 'Pending' } } } },
        { id: 'c', properties: { Description: { type: 'title', title: [{ plain_text: 'Adelanto 2' }] }, Amount: { number: 3500 }, Status: { status: { name: 'Pending' } } } },
      ],
      has_more: false,
    });
    const out = await loadPortalPayments(ctx);
    expect(out.pendingTotal).toBe(7000);
    expect(out.pendingLabel).toBe('$7,000');
    expect(out.items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
    // el filtro de frontera viaja en la query (Customer + Type=Payment)
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(JSON.stringify(call.filter)).toContain('customer-amedi');
    expect(JSON.stringify(call.filter)).toContain('Payment');
  });

  it('si la query falla → vacío (el portal no se cae)', async () => {
    env.NOTION_DB_FINANCE = 'finance-db';
    mockNotion.dataSources.query.mockRejectedValueOnce(new Error('boom'));
    const out = await loadPortalPayments(ctx);
    expect(out.items).toEqual([]);
  });
});

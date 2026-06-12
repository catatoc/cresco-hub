import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const env: Record<string, string | undefined> = {};
vi.mock('@/lib/env', () => ({ serverEnv: new Proxy({}, { get: (_t, p: string) => env[p] }) }));

const mockNotion = { dataSources: { query: vi.fn() }, blocks: { children: { list: vi.fn() } } };

import { parseTestUserRow, parseInfraRow, monthlyOf, hostOf, loadPortalDocuments } from '../documents';
import type { AppContext } from '@/lib/auth/context';

// customerName sin stack en el repo → ejercita el camino de Finance/Notion
const ctx = { customerId: 'customer-x', memberId: 'm-1', customerName: 'distribuidora lara' } as AppContext;

beforeEach(() => {
  mockNotion.dataSources.query.mockReset();
  env.NOTION_DB_WIKI = 'wiki-db';
  env.NOTION_DB_TEST_USERS = 'test-users-db';
  delete env.NOTION_DB_FINANCE;
});

describe('monthlyOf', () => {
  it('normaliza la frecuencia a mensual', () => {
    expect(monthlyOf(120, 'Yearly')).toBe(10);
    expect(monthlyOf(30, 'Quarterly')).toBe(10);
    expect(monthlyOf(25, 'Monthly')).toBe(25);
    expect(monthlyOf(25, null)).toBe(25); // sin frecuencia se asume mensual
  });
});

describe('hostOf', () => {
  it('host + path sin el protocolo; path raíz se omite', () => {
    expect(hostOf('https://dev.amedisalud.com/login')).toBe('dev.amedisalud.com/login');
    expect(hostOf('https://admin.dev.amedisalud.com')).toBe('admin.dev.amedisalud.com');
    expect(hostOf('no-es-url')).toBeNull();
    expect(hostOf(null)).toBeNull();
  });
});

describe('parseTestUserRow', () => {
  it('parsea nombre, usuario, clave y url', () => {
    const row = {
      id: 'tu-1',
      properties: {
        Nombre: { title: [{ plain_text: 'Doctor de prueba' }] },
        Usuario: { rich_text: [{ plain_text: 'test.doctor01@amedi.test' }] },
        Clave: { rich_text: [{ plain_text: 'Clave-123' }] },
        URL: { url: 'https://dev.amedisalud.com/login' },
      },
    };
    expect(parseTestUserRow(row)).toEqual({
      id: 'tu-1',
      nombre: 'Doctor de prueba',
      usuario: 'test.doctor01@amedi.test',
      clave: 'Clave-123',
      url: 'https://dev.amedisalud.com/login',
      host: 'dev.amedisalud.com/login',
    });
  });
});

describe('parseInfraRow', () => {
  it('normaliza el monto anual a mensual con label', () => {
    const row = {
      id: 'inf-1',
      properties: {
        Description: { type: 'title', title: [{ plain_text: 'Dominio amedisalud.com' }] },
        Amount: { number: 18 },
        Frequency: { select: { name: 'Yearly' } },
        Notes: { rich_text: [{ plain_text: 'renovación anual' }] },
      },
    };
    const item = parseInfraRow(row);
    expect(item.monthly).toBeCloseTo(1.5);
    expect(item.monthlyLabel).toBe('$1.50');
    expect(item.detail).toBe('renovación anual');
  });
});

describe('loadPortalDocuments', () => {
  it('degrada en silencio: sin Finance y sin filas → chips vacíos', async () => {
    mockNotion.dataSources.query.mockResolvedValue({ results: [], has_more: false });
    const docs = await loadPortalDocuments(ctx);
    expect(docs).toEqual({ proposal: null, testUsers: [], infra: null });
  });

  it('una fuente caída no tumba a las demás', async () => {
    mockNotion.dataSources.query.mockImplementation((args: any) => {
      if (args.data_source_id === 'wiki-db') return Promise.reject(new Error('notion down'));
      return Promise.resolve({ results: [], has_more: false });
    });
    const docs = await loadPortalDocuments(ctx);
    expect(docs.proposal).toBeNull();
    expect(docs.testUsers).toEqual([]);
  });

  it('arma infra con total mensual y anual cuando Finance está configurada', async () => {
    env.NOTION_DB_FINANCE = 'finance-db';
    mockNotion.dataSources.query.mockImplementation((args: any) => {
      if (args.data_source_id === 'finance-db') {
        return Promise.resolve({
          has_more: false,
          results: [
            {
              id: 'inf-1',
              properties: {
                Description: { type: 'title', title: [{ plain_text: 'Render · API' }] },
                Amount: { number: 19 },
                Frequency: { select: { name: 'Monthly' } },
                Status: { status: { name: 'Paid' } },
              },
            },
            {
              id: 'inf-2',
              properties: {
                Description: { type: 'title', title: [{ plain_text: 'Cancelado' }] },
                Amount: { number: 99 },
                Status: { status: { name: 'Canceled' } },
              },
            },
          ],
        });
      }
      return Promise.resolve({ results: [], has_more: false });
    });
    const docs = await loadPortalDocuments(ctx);
    expect(docs.infra?.items.map((i) => i.name)).toEqual(['Render · API']);
    expect(docs.infra?.monthlyLabel).toBe('$19');
    expect(docs.infra?.yearlyLabel).toBe('$228');
  });
});

describe('buildInfraFromStack + stacks del repo', () => {
  it('amedi: el baseline cuadra y la matriz es monótona no-decreciente', async () => {
    const { findInfraStack } = await import('../infra-stacks');
    const { buildInfraFromStack } = await import('../documents');
    const stack = findInfraStack('amedi salud');
    expect(stack).not.toBeNull();
    const infra = buildInfraFromStack(stack!);

    // "hoy" (~200 usuarios): API Standard 25 + 3 Starter (7×3) + Supabase 25
    // + Spaces 5 + Postmark 15 + WhatsApp 8 + dominio 1.50
    expect(infra.monthlyLabel).toBe('$100.50');
    expect(infra.sim?.stops[0]).toBe(200);
    // los 4 servidores comparten grupo → acordeón en el portal
    expect(infra.sim?.items.filter((s) => s.group === 'Servidores · producción')).toHaveLength(4);

    // crecer en usuarios nunca abarata el total (los tiers solo suben)
    const totals = infra.sim!.totalByStop;
    for (let i = 1; i < totals.length; i++) expect(totals[i]!).toBeGreaterThanOrEqual(totals[i - 1]!);
    // y la matriz de cada servicio acompaña los escalones
    for (const s of infra.sim!.items) expect(s.byStop).toHaveLength(infra.sim!.stops.length);
  });

  it('clientes sin stack en el repo no traen simulador', async () => {
    const { findInfraStack } = await import('../infra-stacks');
    expect(findInfraStack('distribuidora lara')).toBeNull();
    expect(findInfraStack('mogos logística')).toBeNull();
  });

  it('un cliente con stack usa el modelo aunque Finance esté configurada', async () => {
    env.NOTION_DB_FINANCE = 'finance-db';
    mockNotion.dataSources.query.mockResolvedValue({ results: [], has_more: false });
    const amediCtx = { ...ctx, customerName: 'amedi salud' } as AppContext;
    const docs = await loadPortalDocuments(amediCtx);
    expect(docs.infra?.sim).not.toBeNull();
    expect(docs.infra?.monthlyLabel).toBe('$100.50');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({
  serverEnv: { NOTION_DB_TEST_USERS: 'ds-test-users' },
}));

const mockNotion = {
  dataSources: {
    query: vi.fn(),
  },
};

import { queryTestUsersByCustomer } from '../test-users';

describe('queryTestUsersByCustomer', () => {
  beforeEach(() => {
    mockNotion.dataSources.query.mockReset();
  });

  it('queries the test-users data source filtering by customer relation', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });

    await queryTestUsersByCustomer('customer-abc');

    expect(mockNotion.dataSources.query).toHaveBeenCalledWith({
      data_source_id: 'ds-test-users',
      filter: { property: 'Customers', relation: { contains: 'customer-abc' } },
      sorts: [{ property: 'Nombre', direction: 'ascending' }],
    });
  });

  it('parses a row into TestUser shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'page-1',
          last_edited_time: '2026-05-03T12:00:00Z',
          properties: {
            Nombre: { title: [{ plain_text: 'Usuario de Prueba 1' }] },
            Usuario: { rich_text: [{ plain_text: 'cliente@demo.com' }] },
            Clave: { rich_text: [{ plain_text: 's3cret' }] },
            URL: { url: 'https://staging.app.com' },
            Customers: { relation: [{ id: 'customer-abc' }] },
            Team: { relation: [{ id: 'team-1' }] },
          },
        },
      ],
    });

    const out = await queryTestUsersByCustomer('customer-abc');

    expect(out).toEqual([
      {
        id: 'page-1',
        nombre: 'Usuario de Prueba 1',
        usuario: 'cliente@demo.com',
        clave: 's3cret',
        url: 'https://staging.app.com',
        customerIds: ['customer-abc'],
        teamIds: ['team-1'],
        lastEditedAt: '2026-05-03T12:00:00Z',
      },
    ]);
  });

  it('falls back to empty strings and null url when fields missing', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'page-2',
          last_edited_time: '2026-05-03T12:00:00Z',
          properties: {
            Nombre: { title: [] },
            Usuario: { rich_text: [] },
            Clave: { rich_text: [] },
            URL: { url: null },
            Customers: { relation: [] },
            Team: { relation: [] },
          },
        },
      ],
    });

    const out = await queryTestUsersByCustomer('customer-abc');

    expect(out[0]).toMatchObject({
      nombre: 'Sin nombre',
      usuario: '',
      clave: '',
      url: null,
      customerIds: [],
      teamIds: [],
    });
  });

  it('skips results without properties (partial responses)', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [{ id: 'partial-1' }],
    });

    const out = await queryTestUsersByCustomer('customer-abc');
    expect(out).toEqual([]);
  });
});

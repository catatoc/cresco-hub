import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  pages: { retrieve: vi.fn() },
};

import { getCustomer } from '../customers';

describe('getCustomer', () => {
  beforeEach(() => mockNotion.pages.retrieve.mockReset());

  it('returns a parsed customer with emoji icon', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'customer-123',
      icon: { type: 'emoji', emoji: '🎯' },
      properties: {
        'Customer name': { title: [{ plain_text: 'Focus Kids' }] },
        Status: { status: { name: 'Active' } },
        Type: { select: { name: 'Customer' } },
      },
    });

    const customer = await getCustomer('customer-123');

    expect(customer).toEqual({
      id: 'customer-123',
      name: 'Focus Kids',
      icon: { type: 'emoji', value: '🎯' },
      status: 'Active',
      type: 'Customer',
    });
  });

  it('returns image icon when Notion page has external image', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'customer-123',
      icon: { type: 'external', external: { url: 'https://example.com/logo.png' } },
      properties: {
        'Customer name': { title: [{ plain_text: 'Focus Kids' }] },
        Status: { status: { name: 'Active' } },
        Type: { select: { name: 'Customer' } },
      },
    });

    const customer = await getCustomer('customer-123');

    expect(customer?.icon).toEqual({ type: 'image', value: 'https://example.com/logo.png' });
  });

  it('returns image icon when Notion page has uploaded file', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'customer-123',
      icon: { type: 'file', file: { url: 'https://notion.so/signed-url.png' } },
      properties: {
        'Customer name': { title: [{ plain_text: 'Focus Kids' }] },
        Status: { status: { name: 'Active' } },
        Type: { select: { name: 'Customer' } },
      },
    });

    const customer = await getCustomer('customer-123');

    expect(customer?.icon).toEqual({ type: 'image', value: 'https://notion.so/signed-url.png' });
  });

  it('returns null icon when page has no icon', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'customer-123',
      icon: null,
      properties: {
        'Customer name': { title: [{ plain_text: 'Focus Kids' }] },
        Status: { status: { name: 'Active' } },
        Type: { select: { name: 'Customer' } },
      },
    });

    const customer = await getCustomer('customer-123');

    expect(customer?.icon).toBeNull();
  });

  it('returns null on retrieval failure', async () => {
    mockNotion.pages.retrieve.mockRejectedValueOnce(new Error('not found'));
    const customer = await getCustomer('bad-id');
    expect(customer).toBeNull();
  });
});

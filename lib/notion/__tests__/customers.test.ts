import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  pages: { retrieve: vi.fn() },
};

import { getCustomer } from '../customers';

describe('getCustomer', () => {
  beforeEach(() => mockNotion.pages.retrieve.mockReset());

  it('returns a parsed customer', async () => {
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
      icon: '🎯',
      status: 'Active',
      type: 'Customer',
    });
  });

  it('returns null on retrieval failure', async () => {
    mockNotion.pages.retrieve.mockRejectedValueOnce(new Error('not found'));
    const customer = await getCustomer('bad-id');
    expect(customer).toBeNull();
  });
});

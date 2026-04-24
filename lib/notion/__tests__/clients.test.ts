import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  pages: { retrieve: vi.fn() },
};

import { getClient } from '../clients';

describe('getClient', () => {
  beforeEach(() => mockNotion.pages.retrieve.mockReset());

  it('returns a parsed client', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'client-123',
      icon: { type: 'emoji', emoji: '🎯' },
      properties: {
        Name: { title: [{ plain_text: 'Focus Kids' }] },
        Status: { select: { name: 'Active' } },
      },
    });

    const client = await getClient('client-123');

    expect(client).toEqual({
      id: 'client-123',
      name: 'Focus Kids',
      icon: '🎯',
      status: 'Active',
    });
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/notion/team', () => ({ findMemberByEmail: vi.fn() }));
vi.mock('@/lib/notion/customers', () => ({ getCustomer: vi.fn() }));

import { resolveContext } from '../context';
import { findMemberByEmail } from '@/lib/notion/team';
import { getCustomer } from '@/lib/notion/customers';

describe('resolveContext', () => {
  it('returns null when no email', async () => {
    const ctx = await resolveContext(null);
    expect(ctx).toBeNull();
  });

  it('returns null when email not in Team DB', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce(null);
    const ctx = await resolveContext('unknown@x.com');
    expect(ctx).toBeNull();
  });

  it('returns null when member has no customerIds', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null, customerIds: [], projectIds: [],
    });
    const ctx = await resolveContext('d@x.com');
    expect(ctx).toBeNull();
  });

  it('returns null when customer cannot be retrieved', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null,
      customerIds: ['customer-123'], projectIds: ['p-1'],
    });
    vi.mocked(getCustomer).mockResolvedValueOnce(null);
    const ctx = await resolveContext('d@x.com');
    expect(ctx).toBeNull();
  });

  it('returns context when email matches a member with customer', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null,
      customerIds: ['customer-123'], projectIds: ['p-1'],
    });
    vi.mocked(getCustomer).mockResolvedValueOnce({
      id: 'customer-123', name: 'Focus Kids', icon: '🎯', status: 'Active', type: 'Customer',
    });

    const ctx = await resolveContext('d@x.com');
    expect(ctx).toEqual({
      email: 'd@x.com',
      customerId: 'customer-123',
      customerName: 'Focus Kids',
      customerIcon: '🎯',
      projectIds: ['p-1'],
      memberId: 'm-1',
      memberName: 'Dani',
      isAdmin: false,
    });
  });
});

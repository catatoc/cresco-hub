import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/team', () => ({ findMemberByEmail: vi.fn() }));
vi.mock('@/lib/notion/customers', () => ({
  getCustomer: vi.fn(),
  getCustomers: vi.fn(),
}));

const cookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

import { resolveContext } from '../context';
import { findMemberByEmail } from '@/lib/notion/team';
import { getCustomers } from '@/lib/notion/customers';

beforeEach(() => {
  cookieGet.mockReset();
  cookieGet.mockReturnValue(undefined);
});

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
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null, customerIds: [], projectIds: [], portalSignIn: false, portalOnboarding: false, gender: null,
    });
    const ctx = await resolveContext('d@x.com');
    expect(ctx).toBeNull();
  });

  it('returns null when no customers can be retrieved', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null,
      customerIds: ['customer-123'], projectIds: ['p-1'], portalSignIn: false, portalOnboarding: false, gender: null,
    });
    vi.mocked(getCustomers).mockResolvedValueOnce([]);
    const ctx = await resolveContext('d@x.com');
    expect(ctx).toBeNull();
  });

  it('returns context with first customer when no cookie is set', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null,
      customerIds: ['customer-123'], projectIds: ['p-1'], portalSignIn: false, portalOnboarding: false, gender: null,
    });
    vi.mocked(getCustomers).mockResolvedValueOnce([
      {
        id: 'customer-123',
        name: 'Focus Kids',
        icon: { type: 'emoji', value: '🎯' },
        status: 'Active',
        type: 'Customer',
        logo: null,
      },
    ]);

    const ctx = await resolveContext('d@x.com');
    expect(ctx).toEqual({
      email: 'd@x.com',
      customerId: 'customer-123',
      customerName: 'Focus Kids',
      customerIcon: { type: 'emoji', value: '🎯' },
      customerLogo: null,
      customers: [
        { id: 'customer-123', name: 'Focus Kids', icon: { type: 'emoji', value: '🎯' } },
      ],
      projectIds: ['p-1'],
      memberId: 'm-1',
      memberName: 'Dani',
      isAdmin: false,
      isInternal: false,
      portalSignIn: false,
      portalOnboarding: false,
      memberGender: null,
    });
  });

  it('picks selected customer from cookie when valid', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null,
      customerIds: ['c-1', 'c-2'], projectIds: [], portalSignIn: false, portalOnboarding: false, gender: null,
    });
    vi.mocked(getCustomers).mockResolvedValueOnce([
      { id: 'c-1', name: 'A', icon: null, status: null, type: null, logo: null },
      { id: 'c-2', name: 'B', icon: null, status: null, type: null, logo: null },
    ]);
    cookieGet.mockReturnValue({ value: 'c-2' });

    const ctx = await resolveContext('d@x.com');
    expect(ctx?.customerId).toBe('c-2');
    expect(ctx?.customerName).toBe('B');
    expect(ctx?.customers).toHaveLength(2);
  });

  it('falls back to first customer when cookie id is not in member list', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', role: null, area: null,
      customerIds: ['c-1', 'c-2'], projectIds: [], portalSignIn: false, portalOnboarding: false, gender: null,
    });
    vi.mocked(getCustomers).mockResolvedValueOnce([
      { id: 'c-1', name: 'A', icon: null, status: null, type: null, logo: null },
      { id: 'c-2', name: 'B', icon: null, status: null, type: null, logo: null },
    ]);
    cookieGet.mockReturnValue({ value: 'unrelated-id' });

    const ctx = await resolveContext('d@x.com');
    expect(ctx?.customerId).toBe('c-1');
  });
});

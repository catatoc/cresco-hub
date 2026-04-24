import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/notion/team', () => ({ findMemberByEmail: vi.fn() }));
vi.mock('@/lib/notion/clients', () => ({ getClient: vi.fn() }));

import { resolveContext } from '../context';
import { findMemberByEmail } from '@/lib/notion/team';
import { getClient } from '@/lib/notion/clients';

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

  it('returns null when member has no clientId', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', clientId: null, projectIds: [], role: null,
    });
    const ctx = await resolveContext('d@x.com');
    expect(ctx).toBeNull();
  });

  it('returns null when client cannot be retrieved', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', clientId: 'client-123', projectIds: ['p-1'], role: null,
    });
    vi.mocked(getClient).mockResolvedValueOnce(null);
    const ctx = await resolveContext('d@x.com');
    expect(ctx).toBeNull();
  });

  it('returns context when email matches a member with client', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', clientId: 'client-123', projectIds: ['p-1'], role: null,
    });
    vi.mocked(getClient).mockResolvedValueOnce({
      id: 'client-123', name: 'Focus Kids', icon: '🎯', status: 'Active',
    });

    const ctx = await resolveContext('d@x.com');
    expect(ctx).toEqual({
      email: 'd@x.com',
      clientId: 'client-123',
      clientName: 'Focus Kids',
      clientIcon: '🎯',
      projectIds: ['p-1'],
      memberId: 'm-1',
      memberName: 'Dani',
      isAdmin: false,
    });
  });
});

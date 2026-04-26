import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = { auth: { getUser: vi.fn() } };
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));
vi.mock('@/lib/auth/context', () => ({ resolveContext: vi.fn() }));
vi.mock('@/lib/notion/sprints', () => ({
  listSprints: vi.fn(async () => [
    { id: 's1', sprintId: 12, name: 'Sprint 12', status: 'Current', startDate: null, endDate: null },
  ]),
}));
vi.mock('@/lib/notion/projects', () => ({
  queryProjectsByCustomer: vi.fn(async () => [
    { id: 'p1', name: 'Mogos', icon: '🚀', summary: null, status: null, priority: null, completion: null, ownerIds: [], customerId: 'c1', teamIds: [], startDate: null, endDate: null, url: 'u' },
  ]),
}));
vi.mock('@/lib/notion/team', () => ({
  queryMembersByCustomerAndName: vi.fn(async () => [
    { id: 'm1', name: 'Carlos', email: 'c@x', role: null, area: null, customerIds: ['c1'], projectIds: [] },
  ]),
}));
vi.mock('@/lib/notion/meetings', () => ({
  queryMeetingsByCustomer: vi.fn(async () => [
    { id: 'mt1', title: 'Standup', createdTime: '2026-04-26', date: null, endDate: null, meetingType: null, summary: null, attendeeIds: [], customerId: 'c1', projectIds: [], teamIds: [], taskIds: [], wikiIds: [], url: 'u' },
  ]),
}));

import { resolveContext } from '@/lib/auth/context';
import { GET } from '../route';

function req(query: string) {
  return new Request(`http://localhost/api/create/options?${query}`);
}

describe('GET /api/create/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: 'x@y' } } });
    (resolveContext as any).mockResolvedValue({ customerId: 'c1' });
  });

  it('401 when no user', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(req('type=sprint'));
    expect(res.status).toBe(401);
  });

  it('returns sprints array', async () => {
    const res = await GET(req('type=sprint'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.options).toHaveLength(1);
    expect(body.options[0]).toMatchObject({ id: 's1', label: expect.stringContaining('Sprint 12') });
  });

  it('returns projects array', async () => {
    const res = await GET(req('type=project'));
    const body = await res.json();
    expect(body.options[0]).toMatchObject({ id: 'p1', label: 'Mogos' });
  });

  it('returns team members filtered by q', async () => {
    const res = await GET(req('type=team&q=car'));
    const body = await res.json();
    expect(body.options[0]).toMatchObject({ id: 'm1', label: 'Carlos' });
  });

  it('returns meetings array', async () => {
    const res = await GET(req('type=meeting'));
    const body = await res.json();
    expect(body.options[0]).toMatchObject({ id: 'mt1', label: 'Standup' });
  });

  it('400 on unknown type', async () => {
    const res = await GET(req('type=unknown'));
    expect(res.status).toBe(400);
  });

  it('502 when underlying lib throws', async () => {
    const { listSprints } = await import('@/lib/notion/sprints');
    (listSprints as any).mockRejectedValueOnce(new Error('Notion down'));
    const res = await GET(req('type=sprint'));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('fetch-failed');
  });
});

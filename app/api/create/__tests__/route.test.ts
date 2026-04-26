import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: { getUser: vi.fn() },
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));
vi.mock('@/lib/auth/context', () => ({
  resolveContext: vi.fn(),
}));
vi.mock('@/lib/notion/tasks', () => ({
  createTask: vi.fn(async () => ({ id: 'task-1', url: 'https://notion.so/task-1' })),
}));
vi.mock('@/lib/notion/wiki', () => ({
  createWikiPage: vi.fn(async () => ({ id: 'wiki-1', url: 'https://notion.so/wiki-1' })),
}));

import { resolveContext } from '@/lib/auth/context';
import { createTask } from '@/lib/notion/tasks';
import { createWikiPage } from '@/lib/notion/wiki';
import { POST } from '../route';

function req(body: unknown) {
  return new Request('http://localhost/api/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no user', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(req({ type: 'task', customerId: 'c', title: 't' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no app context', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce(null);
    const res = await POST(req({ type: 'task', customerId: 'c', title: 't' }));
    expect(res.status).toBe(403);
  });

  it('returns 401 when body customerId differs from ctx customerId', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'real-cust' });
    const res = await POST(req({ type: 'task', customerId: 'fake', title: 't' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 with first issue.message on Zod fail', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    const res = await POST(req({ type: 'task', customerId: 'cust-1', title: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/title|small|String|empty/i);
  });

  it('dispatches task -> createTask, returns id+url', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    const res = await POST(
      req({
        type: 'task',
        customerId: 'cust-1',
        title: 'Hola',
        sprintId: 'sp-1',
        priority: 'High',
      }),
    );
    expect(res.status).toBe(200);
    expect(createTask).toHaveBeenCalledWith({
      customerId: 'cust-1',
      title: 'Hola',
      description: undefined,
      sprintId: 'sp-1',
      projectId: undefined,
      assigneeIds: [],
      priority: 'High',
      dueDate: undefined,
    });
    const body = await res.json();
    expect(body).toEqual({ id: 'task-1', url: 'https://notion.so/task-1' });
  });

  it('dispatches wiki -> createWikiPage', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    const res = await POST(
      req({ type: 'wiki', customerId: 'cust-1', title: 'Doc' }),
    );
    expect(res.status).toBe(200);
    expect(createWikiPage).toHaveBeenCalled();
    const body = await res.json();
    expect(body.id).toBe('wiki-1');
  });

  it('returns 500 with toast-friendly error on createTask throw', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    (createTask as any).mockRejectedValueOnce(new Error('Notion exploded'));
    const res = await POST(
      req({ type: 'task', customerId: 'cust-1', title: 't' }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

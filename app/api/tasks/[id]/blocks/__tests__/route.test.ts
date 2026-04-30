// app/api/tasks/[id]/blocks/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const resolveContext = vi.fn();
const getTask = vi.fn();
const replaceTaskBlocks = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: getUser() } }) },
  }),
}));
vi.mock('@/lib/auth/context', () => ({
  resolveContext: (email: string) => resolveContext(email),
}));
vi.mock('@/lib/notion/tasks', () => ({
  getTask: (id: string) => getTask(id),
}));
vi.mock('@/lib/notion/tasks-blocks', () => ({
  replaceTaskBlocks: (id: string, blocks: unknown[]) => replaceTaskBlocks(id, blocks),
}));

import { PATCH } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/tasks/t1/blocks', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 't1' });

describe('PATCH /api/tasks/[id]/blocks', () => {
  beforeEach(() => {
    getUser.mockReset();
    resolveContext.mockReset();
    getTask.mockReset();
    replaceTaskBlocks.mockReset();
  });

  it('401 when not authenticated', async () => {
    getUser.mockReturnValueOnce(null);
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(401);
  });

  it('403 when user has no customer context', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(403);
  });

  it('404 when task does not exist', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(404);
  });

  it('403 when task belongs to another customer', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'OTHER' });
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(403);
  });

  it('400 when body is missing doc', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    const res = await PATCH(makeRequest({}), { params });
    expect(res.status).toBe(400);
  });

  it('200 on success and delegates serialized blocks', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    replaceTaskBlocks.mockResolvedValueOnce({ ok: true });

    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    };
    const res = await PATCH(makeRequest({ doc }), { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(replaceTaskBlocks).toHaveBeenCalledTimes(1);
    const [taskId, blocks] = replaceTaskBlocks.mock.calls[0]!;
    expect(taskId).toBe('t1');
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Hi', link: null },
              annotations: {
                bold: false, italic: false, strikethrough: false,
                code: false, underline: false, color: 'default',
              },
            },
          ],
        },
      },
    ]);
  });

  it('returns 503 with stage info when replaceTaskBlocks throws stage:"append"', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    const err = Object.assign(new Error('append failed'), { stage: 'append' });
    replaceTaskBlocks.mockRejectedValueOnce(err);

    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };
    const res = await PATCH(makeRequest({ doc }), { params });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('append-failed');
  });

  it('returns 503 with stage info when replaceTaskBlocks throws stage:"delete"', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    const err = Object.assign(new Error('delete failed'), { stage: 'delete', remaining: 2 });
    replaceTaskBlocks.mockRejectedValueOnce(err);

    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };
    const res = await PATCH(makeRequest({ doc }), { params });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('delete-failed');
    expect(body.remaining).toBe(2);
  });
});

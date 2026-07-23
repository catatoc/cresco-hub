import { describe, it, expect, vi, beforeEach } from 'vitest';

const env: Record<string, string | undefined> = {};
vi.mock('@/lib/env', () => ({
  serverEnv: new Proxy({}, { get: (_t, p: string) => env[p] }),
}));

import { POST } from '../route';

function req(opts: { token?: string; query?: string; body?: unknown } = {}) {
  const url = `http://localhost/api/webhooks/release-published${opts.query ?? ''}`;
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

const SECRET = 'shhh-the-secret-value';

beforeEach(() => {
  for (const k of Object.keys(env)) delete env[k];
  vi.restoreAllMocks();
});

describe('POST /api/webhooks/release-published', () => {
  it('503 when the webhook secret is unset', async () => {
    const res = await POST(req({ token: 'x', body: { release_id: 'r1' } }));
    expect(res.status).toBe(503);
  });

  it('401 on a wrong secret', async () => {
    env.RELEASE_WEBHOOK_SECRET = SECRET;
    const res = await POST(req({ token: 'nope', body: { release_id: 'r1' } }));
    expect(res.status).toBe(401);
  });

  it('400 when no release id is present', async () => {
    env.RELEASE_WEBHOOK_SECRET = SECRET;
    const res = await POST(req({ token: SECRET, body: {} }));
    expect(res.status).toBe(400);
  });

  it('503 when the routine target is unset', async () => {
    env.RELEASE_WEBHOOK_SECRET = SECRET;
    const res = await POST(req({ token: SECRET, body: { release_id: 'r1' } }));
    expect(res.status).toBe(503);
  });

  it('forwards to the routine with the bearer token and returns ok', async () => {
    env.RELEASE_WEBHOOK_SECRET = SECRET;
    env.CLAUDE_EDITOR_ROUTINE_URL = 'https://routine.example/trigger';
    env.CLAUDE_EDITOR_ROUTINE_TOKEN = 'routine-token-1234567890';
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const res = await POST(req({ token: SECRET, body: { id: 'rel-123' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, release_id: 'rel-123' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('https://routine.example/trigger');
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer routine-token-1234567890');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['anthropic-beta']).toBe('experimental-cc-routine-2026-04-01');
    // The routine "fire" body is { text }, an extra turn — with the release id embedded.
    const body = JSON.parse(init?.body as string);
    expect(body.text).toContain('rel-123');
  });

  it('accepts the secret + release_id via query params', async () => {
    env.RELEASE_WEBHOOK_SECRET = SECRET;
    env.CLAUDE_EDITOR_ROUTINE_URL = 'https://routine.example/trigger';
    env.CLAUDE_EDITOR_ROUTINE_TOKEN = 'routine-token-1234567890';
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const res = await POST(req({ query: `?token=${SECRET}&release_id=rel-q` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, release_id: 'rel-q' });
  });

  it('502 when the routine rejects', async () => {
    env.RELEASE_WEBHOOK_SECRET = SECRET;
    env.CLAUDE_EDITOR_ROUTINE_URL = 'https://routine.example/trigger';
    env.CLAUDE_EDITOR_ROUTINE_TOKEN = 'routine-token-1234567890';
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('bad', { status: 403 }));

    const res = await POST(req({ token: SECRET, body: { release_id: 'r1' } }));
    expect(res.status).toBe(502);
  });
});

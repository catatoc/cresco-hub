import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Constant-time compare to avoid leaking the secret via timing. */
function tokenMatches(token: string | null, secret: string): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Release-published webhook — the bridge into the Claude Code "editor" routine.
 *
 * Notion's automation (Releases · Status=published) POSTs here with the release page id
 * and our shared secret. We validate it, then forward the release to the editor routine's
 * API trigger with the routine's own token. The routine token stays server-side — Notion
 * only ever knows `RELEASE_WEBHOOK_SECRET`, never the routine token.
 *
 * Auth (either, so Notion's webhook action works whether or not it can set headers):
 *   - `Authorization: Bearer <RELEASE_WEBHOOK_SECRET>`, or
 *   - `?token=<RELEASE_WEBHOOK_SECRET>` query param.
 * Release id (accepted flexibly from Notion's payload shape or the query):
 *   `release_id` | `id` | `page_id` | `data.id` | `?release_id=`.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = serverEnv.RELEASE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const auth = request.headers.get('authorization') ?? '';
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const queryToken = url.searchParams.get('token');
  if (!tokenMatches(headerToken ?? queryToken, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // Tolerate empty / non-JSON bodies — the release id may arrive via the query string.
  }
  const data = (body.data ?? {}) as Record<string, unknown>;
  const releaseId =
    (body.release_id as string) ??
    (body.id as string) ??
    (body.page_id as string) ??
    (data.id as string) ??
    url.searchParams.get('release_id');
  if (!releaseId) {
    return NextResponse.json({ error: 'missing release_id' }, { status: 400 });
  }

  const routineUrl = serverEnv.CLAUDE_EDITOR_ROUTINE_URL;
  const routineToken = serverEnv.CLAUDE_EDITOR_ROUTINE_TOKEN;
  if (!routineUrl || !routineToken) {
    return NextResponse.json({ error: 'editor routine not configured' }, { status: 503 });
  }

  let forwarded: Response;
  try {
    forwarded = await fetch(routineUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${routineToken}`,
      },
      body: JSON.stringify({ release_id: releaseId }),
    });
  } catch (e) {
    console.error('[release-published] forward failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'forward failed' }, { status: 502 });
  }

  if (!forwarded.ok) {
    const text = await forwarded.text().catch(() => '');
    console.error(`[release-published] routine ${forwarded.status}: ${text.slice(0, 200)}`);
    return NextResponse.json({ error: 'routine rejected', upstream: forwarded.status }, { status: 502 });
  }

  return NextResponse.json({ ok: true, release_id: releaseId });
}

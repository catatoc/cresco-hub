import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { toggleTaskForMember } from '@/lib/portal/toggle';

export const dynamic = 'force-dynamic';

// POST /api/portal/toggle — marca/desmarca una tarea propia (app móvil).
// Body: { taskId: string, done: boolean }. Misma verificación que el portal.
export async function POST(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  let body: { taskId?: unknown; done?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  if (typeof body.taskId !== 'string' || typeof body.done !== 'boolean') {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }
  const res = await toggleTaskForMember(ctx, body.taskId, body.done);
  return NextResponse.json(res, { status: res.ok ? 200 : 403 });
}

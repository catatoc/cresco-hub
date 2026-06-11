import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { markPortalSignIn } from '@/lib/portal/welcome';

export const dynamic = 'force-dynamic';

// POST /api/portal/welcome — el cliente terminó la bienvenida en la app:
// marca "Portal Sign In" en su página de Team (una sola vez por miembro).
export async function POST(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  const res = await markPortalSignIn(ctx);
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}

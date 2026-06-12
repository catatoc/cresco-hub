import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { markPortalOnboarding } from '@/lib/portal/welcome';

export const dynamic = 'force-dynamic';

// POST /api/portal/onboarding — el cliente terminó (o saltó) el tour en la
// app: marca "Portal Onboarding Check" en su página de Team (una sola vez
// por miembro — la misma marca que usa el tour del portal web).
export async function POST(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  const res = await markPortalOnboarding(ctx);
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}

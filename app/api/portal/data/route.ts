import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { loadPortalData } from '@/lib/portal/data';

export const dynamic = 'force-dynamic';

// GET /api/portal/data — todo el home del cliente en un JSON (app móvil).
// Auth: Authorization: Bearer <supabase access token>.
export async function GET(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  try {
    const data = await loadPortalData(ctx);
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/portal/data] failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

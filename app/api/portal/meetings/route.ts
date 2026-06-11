import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { loadPortalMeetings } from '@/lib/portal/meeting';

export const dynamic = 'force-dynamic';

// GET /api/portal/meetings — el índice completo de reuniones del customer
// (más recientes primero) para la app móvil. Auth: Bearer de Supabase.
export async function GET(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  try {
    return NextResponse.json({ meetings: await loadPortalMeetings(ctx) });
  } catch (e) {
    console.error('[api/portal/meetings] failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

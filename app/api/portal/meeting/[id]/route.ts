import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { loadPortalMeeting } from '@/lib/portal/meeting';

export const dynamic = 'force-dynamic';

// GET /api/portal/meeting/:id — la reunión completa para la app móvil:
// acta (contenido de la página, sin transcription ni sección interna de
// acciones) + acuerdos (tasks del customer). Auth: Bearer de Supabase;
// el gate por Customer vive en loadPortalMeeting (ajena → 404).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  const { id } = await params;
  try {
    const meeting = await loadPortalMeeting(ctx, id);
    if (!meeting) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json(meeting);
  } catch (e) {
    console.error('[api/portal/meeting] failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

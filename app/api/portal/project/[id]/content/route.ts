import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { loadProjectContent } from '@/lib/portal/content';

export const dynamic = 'force-dynamic';

// GET /api/portal/project/:id/content — el brief del proyecto (app móvil).
// Auth: Authorization: Bearer <supabase access token>. El gate por Customer
// vive en loadProjectContent (proyecto ajeno → 404).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  const { id } = await params;
  try {
    const blocks = await loadProjectContent(ctx, id);
    if (blocks === null) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ blocks });
  } catch (e) {
    console.error('[api/portal/project/content] failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

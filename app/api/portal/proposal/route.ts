import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { loadProposalContent } from '@/lib/portal/documents';

export const dynamic = 'force-dynamic';

// GET /api/portal/proposal — la propuesta Wiki (bloques de Notion) para la
// app móvil. Espejo del server action getProposal() del portal web, con
// Bearer: misma frontera segura de bloques, scopeada al customer del contexto.
export async function GET(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  try {
    const proposal = await loadProposalContent(ctx);
    return NextResponse.json({ proposal });
  } catch (e) {
    console.error('[api/portal/proposal] failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

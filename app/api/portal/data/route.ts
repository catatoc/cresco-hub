import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { loadPortalData } from '@/lib/portal/data';
import { loadPortalPayments } from '@/lib/portal/payments';
import { loadPortalDocuments } from '@/lib/portal/documents';

export const dynamic = 'force-dynamic';

// GET /api/portal/data — todo el home del cliente en un JSON (app móvil),
// pagos incluidos. Auth: Authorization: Bearer <supabase access token>.
export async function GET(request: Request) {
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });
  try {
    const [data, payments, documents] = await Promise.all([
      loadPortalData(ctx),
      loadPortalPayments(ctx),
      loadPortalDocuments(ctx),
    ]);
    return NextResponse.json({
      ...data,
      payments,
      documents,
      portalSignIn: ctx.portalSignIn,
      portalOnboarding: ctx.portalOnboarding,
      memberGender: ctx.memberGender,
    });
  } catch (e) {
    console.error('[api/portal/data] failed', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

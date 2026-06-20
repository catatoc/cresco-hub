import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// /api/portal hace su propia auth (Bearer token de la app móvil), no cookies.
// /api/cron hace su propia auth (CRON_SECRET), disparado por Supabase Cron.
const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/mobile', '/no-access', '/api/auth', '/api/portal', '/api/cron', '/privacy', '/terms'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Segment-aware match so '/api/cron' never matches '/api/cron-foo'.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

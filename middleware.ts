import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { LOCALE_COOKIE, LOCALE_PARAM, localeFromParam } from '@/lib/i18n/locale';

// /api/portal hace su propia auth (Bearer token de la app móvil), no cookies.
// /api/cron hace su propia auth (CRON_SECRET), disparado por Supabase Cron.
// /api/webhooks hace su propia auth (RELEASE_WEBHOOK_SECRET), disparado por la automatización de Notion.
const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/mobile', '/no-access', '/api/auth', '/api/portal', '/api/cron', '/api/webhooks', '/privacy', '/terms'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ?lang=en fija el idioma ANTES de cualquier auth, para que el enlace que le
  // mandamos a un cliente abra el login ya en su idioma (el login es público:
  // sin sesión no hay cliente activo del que deducirlo). Va antes del early
  // return de PUBLIC_PATHS justo para cubrir /login y la raíz.
  //
  // Redirige sin el parámetro a propósito: la cookie escrita en esta respuesta
  // no la ve el render de esta misma request, solo el siguiente.
  const requested = localeFromParam(request.nextUrl.searchParams.get(LOCALE_PARAM));
  if (requested) {
    const url = request.nextUrl.clone();
    url.searchParams.delete(LOCALE_PARAM);
    const response = NextResponse.redirect(url);
    // Sin httpOnly: el toggle del hub lee y escribe esta misma cookie desde el
    // cliente con document.cookie.
    response.cookies.set(LOCALE_COOKIE, requested, {
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

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

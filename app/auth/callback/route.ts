import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  CUSTOMER_LOCALE_COOKIE_OPTIONS,
  resolveActiveCustomerLocale,
} from '@/lib/i18n/customer-locale';
import { CUSTOMER_LOCALE_COOKIE } from '@/lib/i18n/locale';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);

      // El cliente activo fija el idioma de arranque. El toggle (NEXT_LOCALE)
      // sigue ganando, así que esto no pisa una elección previa del usuario.
      const locale = await resolveActiveCustomerLocale(data.user?.email ?? null);
      if (locale) {
        response.cookies.set(CUSTOMER_LOCALE_COOKIE, locale, CUSTOMER_LOCALE_COOKIE_OPTIONS);
      } else {
        response.cookies.delete(CUSTOMER_LOCALE_COOKIE);
      }

      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}

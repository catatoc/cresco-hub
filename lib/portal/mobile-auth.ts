// Auth del API móvil: la app manda el access token de Supabase como Bearer.
// Validamos el token → email → mismo resolveContext del portal (misma frontera).
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';
import { resolveContext, type AppContext } from '@/lib/auth/context';

export async function resolveMobileContext(request: Request): Promise<AppContext | null> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) return null;

  return resolveContext(data.user.email);
}

import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { lookupContextData, resolveContext, type AppContext } from './context';

/** Tag de revalidación del contexto de un miembro (welcome/tour lo invalidan). */
export const contextTag = (email: string) => `ctx:${email.toLowerCase()}`;

// La búsqueda en Notion (Team + Customers) se cachea 60s por email: es la
// consulta que TODA página repite y casi nunca cambia. Las acciones que sí la
// cambian (Portal Sign In / Onboarding) revalidan el tag y ven el dato fresco.
const cachedLookup = (email: string) =>
  unstable_cache(() => lookupContextData(email), ['ctx-lookup', email.toLowerCase()], {
    revalidate: 60,
    tags: [contextTag(email)],
  })();

export async function requireContext(): Promise<AppContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect('/login');

  const ctx = await resolveContext(user.email, await cachedLookup(user.email));
  if (!ctx) redirect('/no-access');
  return ctx;
}

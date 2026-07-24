import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveContext, type AppContext } from './context';

export async function requireContext(): Promise<AppContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect('/login');

  const ctx = await resolveContext(user.email);
  if (!ctx) redirect('/no-access');
  return ctx;
}

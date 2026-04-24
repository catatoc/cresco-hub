import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const context = await resolveContext(user.email);
  if (!context) {
    return NextResponse.json({ error: 'no-access', email: user.email }, { status: 403 });
  }

  return NextResponse.json(context);
}

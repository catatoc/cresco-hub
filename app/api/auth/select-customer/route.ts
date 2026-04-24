import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { findMemberByEmail } from '@/lib/notion/team';
import { SELECTED_CUSTOMER_COOKIE } from '@/lib/auth/context';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ customerId: z.string().min(1) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  }

  const member = await findMemberByEmail(user.email);
  if (!member || !member.customerIds.includes(parsed.data.customerId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SELECTED_CUSTOMER_COOKIE, parsed.data.customerId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}

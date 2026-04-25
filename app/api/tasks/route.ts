import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { createTask } from '@/lib/notion/tasks';
import { getCurrentSprint } from '@/lib/notion/sprints';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid-body' }, { status: 400 });

  const sprint = await getCurrentSprint().catch(() => null);
  const created = await createTask({
    customerId: ctx.customerId,
    title: parsed.data.title,
    sprintId: sprint?.id ?? null,
  });
  return NextResponse.json({ id: created.id, url: `/tareas/${created.id}` });
}

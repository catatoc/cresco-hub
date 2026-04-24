import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { getTask, updateTaskStatus } from '@/lib/notion/tasks';
import { taskStatusSchema } from '@/schemas/task';

const bodySchema = z.object({ status: taskStatusSchema });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  const task = await getTask(id);
  if (!task) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  if (task.clientId !== ctx.customerId)
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });

  await updateTaskStatus(id, parsed.data.status);
  return NextResponse.json({ ok: true });
}

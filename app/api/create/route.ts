import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { createTask } from '@/lib/notion/tasks';
import { createWikiPage } from '@/lib/notion/wiki';
import { createInput } from '@/schemas/create';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ctx = await resolveContext(user.email);
  if (!ctx) {
    return NextResponse.json({ error: 'no-access' }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid-body' },
      { status: 400 },
    );
  }

  if (parsed.data.customerId !== ctx.customerId) {
    return NextResponse.json({ error: 'customer-mismatch' }, { status: 403 });
  }

  try {
    if (parsed.data.type === 'task') {
      const t = parsed.data;
      const created = await createTask({
        customerId: t.customerId,
        title: t.title,
        description: t.description,
        sprintId: t.sprintId,
        projectId: t.projectId,
        assigneeIds: t.assigneeIds,
        priority: t.priority,
        dueDate: t.dueDate,
      });
      return NextResponse.json({ id: created.id, url: created.url });
    } else {
      const w = parsed.data;
      const created = await createWikiPage({
        customerId: w.customerId,
        title: w.title,
        emoji: w.emoji,
        categories: w.categories,
        projectId: w.projectId,
        meetingId: w.meetingId,
      });
      return NextResponse.json({ id: created.id, url: created.url });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'create-failed' },
      { status: 500 },
    );
  }
}

// app/api/tasks/[id]/blocks/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { getTask } from '@/lib/notion/tasks';
import { getBlocks } from '@/lib/notion/blocks';
import { replaceTaskBlocks } from '@/lib/notion/tasks-blocks';
import { proseMirrorToNotionBlocks } from '@/lib/edit-tasks/serialize-to-notion';
import { extractPlainText } from '@/lib/claude-code/extract-plain-text';

const bodySchema = z.object({
  doc: z.object({
    type: z.literal('doc'),
    content: z.array(z.unknown()).optional(),
  }).passthrough(),
});

type StagedError = Error & {
  stage?: 'delete' | 'append' | 'update';
  remaining?: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [ctx, task, blocks] = await Promise.all([
    resolveContext(user.email),
    getTask(id),
    getBlocks(id),
  ]);

  if (!ctx) {
    return NextResponse.json({ error: 'no-access' }, { status: 403 });
  }
  if (!task) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  if (task.customerId !== ctx.customerId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const content = extractPlainText(blocks, Number.POSITIVE_INFINITY);
  return NextResponse.json({ content });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // resolveContext (member + customers) and getTask are independent — fire
  // them together. The body parse is also CPU-only and runs concurrently
  // while the network calls are in flight.
  const [ctx, task, payload] = await Promise.all([
    resolveContext(user.email),
    getTask(id),
    req.json().catch(() => null),
  ]);

  if (!ctx) {
    return NextResponse.json({ error: 'no-access' }, { status: 403 });
  }
  if (!task) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  if (task.customerId !== ctx.customerId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (payload === null) {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const blocks = proseMirrorToNotionBlocks(parsed.data.doc as Parameters<typeof proseMirrorToNotionBlocks>[0]);

  try {
    await replaceTaskBlocks(id, blocks);
    return NextResponse.json({ ok: true });
  } catch (rawErr) {
    const err = rawErr as StagedError;
    if (err.stage === 'delete') {
      return NextResponse.json(
        { error: 'delete-failed', remaining: err.remaining ?? null },
        { status: 503 },
      );
    }
    if (err.stage === 'append') {
      return NextResponse.json({ error: 'append-failed' }, { status: 503 });
    }
    if (err.stage === 'update') {
      return NextResponse.json({ error: 'update-failed' }, { status: 503 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

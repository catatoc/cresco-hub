// El PDF del documento privado para la app móvil — mismo gate Bearer que el
// HTML. Se sirve inline (no attachment) para que el WebView lo renderice.
import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { resolveMobileContext } from '@/lib/portal/mobile-auth';
import { findDocFile, docFilePath } from '@/lib/portal/doc-files';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await resolveMobileContext(request);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 401 });

  const doc = findDocFile(slug, ctx.customerName);
  if (!doc?.pdf) return new Response('No encontrado', { status: 404 });

  const buf = await readFile(docFilePath(doc.pdf));
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${doc.slug}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

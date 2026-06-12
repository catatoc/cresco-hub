// El HTML del documento privado para la app móvil — mismo gate que el visor
// web (/portal/docs/[slug]/raw) pero con Bearer en vez de cookie: token →
// contexto → el slug debe pertenecer al customer; cualquier otro caso, 404.
// El contenido vive en el repo (private-docs/): actualizarlo actualiza todas
// las plataformas a la vez, sin tocar la app.
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
  if (!doc) return new Response('No encontrado', { status: 404 });

  const buf = await readFile(docFilePath(doc.html));
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}

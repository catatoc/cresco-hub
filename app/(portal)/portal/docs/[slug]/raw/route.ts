// Sirve el HTML del documento privado. Los route handlers no pasan por el
// layout, así que el gate completo vive aquí: sesión → contexto → el slug
// debe pertenecer al customer. Sin sesión → login; otro cliente → 404.
import { readFile } from 'node:fs/promises';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { findDocFile, docFilePath } from '@/lib/portal/doc-files';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');
  const ctx = await resolveContext(user.email);
  if (!ctx) redirect('/no-access');

  const doc = findDocFile(slug, ctx.customerName);
  if (!doc) return new Response('No encontrado', { status: 404 });

  const buf = await readFile(docFilePath(doc.html));
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}

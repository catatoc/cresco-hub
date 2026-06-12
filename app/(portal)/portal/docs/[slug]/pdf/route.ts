// Descarga del PDF del documento privado — mismo gate que el HTML.
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
  if (!doc?.pdf) return new Response('No encontrado', { status: 404 });

  const buf = await readFile(docFilePath(doc.pdf));
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.slug}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

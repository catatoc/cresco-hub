import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Último salto del puente móvil: 302 del servidor hacia el deep link de la app
// (los redirects de servidor a esquemas custom SÍ los intercepta el in-app browser).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '';
  const hash = url.searchParams.get('hash') ?? '';
  const ok = (next.startsWith('exp://') || next.startsWith('crescoapp://')) && hash.length > 0;
  if (!ok) return NextResponse.json({ error: 'bad-request' }, { status: 400 });
  return NextResponse.redirect(`${next}#${hash}`, 302);
}

// El visor de documentos privados: la propuesta (microsite) a pantalla
// completa con una barra mínima del portal. El gate vive en dos capas:
// el layout (portal) exige sesión, y aquí el slug debe pertenecer al
// customer del contexto — cualquier otro usuario recibe 404.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireContext } from '@/lib/auth/require-context';
import { findDocFile } from '@/lib/portal/doc-files';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'crescō · tu propuesta',
};

export default async function DocViewerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireContext();
  const doc = findDocFile(slug, ctx.customerName);
  if (!doc) notFound();

  return (
    <div className="cp-dv">
      <div className="cp-dv-bar">
        <Link className="cp-dv-back" href="/portal">← volver al portal</Link>
        <div className="cp-dv-title">
          <span className="cp-dv-w">{doc.title}</span>
          <span className="cp-dv-m">{doc.meta}</span>
        </div>
        <div className="cp-dv-actions">
          <span className="cp-dv-lock"><i /><span className="cp-dv-lock-t">solo {ctx.customerName.toLowerCase()}</span></span>
          {doc.pdf && (
            <a className="cp-dv-pdf" href={`/portal/docs/${doc.slug}/pdf`}>
              descargar PDF <span className="cp-dv-circ">↓</span>
            </a>
          )}
        </div>
      </div>
      <iframe className="cp-dv-frame" src={`/portal/docs/${doc.slug}/raw`} title={doc.title} />
    </div>
  );
}

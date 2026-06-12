// ── Portal del cliente · documentos privados (archivos) ─────────────────────
// Propuestas y documentos ricos (microsites HTML, PDFs) que viven en el repo
// bajo private-docs/ y se sirven SOLO al cliente dueño: el registry mapea
// slug → cliente, y la ruta /portal/docs/[slug] verifica el contexto antes
// de servir — cualquier otro usuario recibe 404, ni siquiera "no autorizado".
// Mismo patrón que infra-stacks: el dato vive en el repo, versionado en git.
import path from 'node:path';

export interface PortalDocFile {
  slug: string;
  title: string; // "Propuesta · cuatro módulos"
  meta: string; // "kenco × crescō · v3.0 · junio 2026" — subtítulo de la barra
  chipState: string; // estado que muestra el chip de la cápsula
  /** rutas relativas a private-docs/ */
  html: string;
  pdf?: string;
  match: (customerName: string) => boolean;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const DOC_FILES: PortalDocFile[] = [
  {
    slug: 'kenco-propuesta',
    title: 'Propuesta · cuatro módulos',
    meta: 'kenco × crescō · v3.0 · junio 2026',
    chipState: 'v3.0 · 4 módulos',
    html: 'kenco/propuesta-4-modulos.html',
    pdf: 'kenco/propuesta.pdf',
    match: (n) => norm(n).includes('kenco'),
  },
];

/** El documento del slug, solo si pertenece al cliente — null en cualquier otro caso. */
export function findDocFile(slug: string, customerName: string): PortalDocFile | null {
  const doc = DOC_FILES.find((d) => d.slug === slug);
  return doc && doc.match(customerName) ? doc : null;
}

/** Los documentos del cliente (para armar los chips de la cápsula). */
export function docFilesForCustomer(customerName: string): PortalDocFile[] {
  return DOC_FILES.filter((d) => d.match(customerName));
}

/** Ruta absoluta dentro de private-docs/ — rechaza cualquier intento de escape. */
export function docFilePath(relative: string): string {
  const root = path.join(process.cwd(), 'private-docs');
  const abs = path.join(root, relative);
  if (!abs.startsWith(root + path.sep)) throw new Error('ruta fuera de private-docs');
  return abs;
}

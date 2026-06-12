'use server';

import { requireContext } from '@/lib/auth/require-context';
import { toggleTaskForMember } from '@/lib/portal/toggle';
import { markPortalSignIn } from '@/lib/portal/welcome';
import { loadProjectContent, type ProjectBlock } from '@/lib/portal/content';
import { loadProposalContent } from '@/lib/portal/documents';

// Marca/desmarca una tarea del cliente (portal web). La verificación de
// ownership vive en toggleTaskForMember (compartida con el API móvil).
export async function toggleMyTask(taskId: string, done: boolean): Promise<{ ok: boolean }> {
  const ctx = await requireContext();
  return toggleTaskForMember(ctx, taskId, done);
}

// El cliente terminó (o saltó) las diapositivas de bienvenida → marca
// "Portal Sign In" en su página de Team para no volver a mostrarlas.
export async function completePortalWelcome(): Promise<{ ok: boolean }> {
  const ctx = await requireContext();
  return markPortalSignIn(ctx);
}

// El brief del proyecto (contenido de la página en Notion) — se carga lazy
// al abrir el proyecto. El gate por Customer vive en loadProjectContent.
export async function getProjectBrief(projectId: string): Promise<ProjectBlock[]> {
  const ctx = await requireContext();
  return (await loadProjectContent(ctx, projectId)) ?? [];
}

// La propuesta del cliente (Wiki con categoría Proposal) — se carga lazy al
// abrir el chip en la cápsula. El gate por Customer vive en el query.
export async function getProposal(): Promise<{ title: string; blocks: ProjectBlock[] } | null> {
  const ctx = await requireContext();
  return loadProposalContent(ctx);
}

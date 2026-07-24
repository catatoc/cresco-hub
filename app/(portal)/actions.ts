'use server';

import { revalidateTag } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { requireContext, contextTag } from '@/lib/auth/require-context';
import { portalTag } from '@/lib/portal/cache';
import { toggleTaskForMember } from '@/lib/portal/toggle';
import { markPortalSignIn, markPortalOnboarding } from '@/lib/portal/welcome';
import { loadProjectContent, loadTaskContent, type ProjectBlock } from '@/lib/portal/content';
import { loadProposalContent } from '@/lib/portal/documents';
import type { PortalLocale } from '@/lib/portal/i18n';

// Marca/desmarca una tarea del cliente (portal web). La verificación de
// ownership vive en toggleTaskForMember (compartida con el API móvil).
export async function toggleMyTask(taskId: string, done: boolean): Promise<{ ok: boolean }> {
  const ctx = await requireContext();
  const res = await toggleTaskForMember(ctx, taskId, done);
  revalidateTag(portalTag(ctx.customerId), 'max');
  return res;
}

// El cliente terminó (o saltó) las diapositivas de bienvenida → marca
// "Portal Sign In" en su página de Team para no volver a mostrarlas.
export async function completePortalWelcome(): Promise<{ ok: boolean }> {
  const ctx = await requireContext();
  const res = await markPortalSignIn(ctx);
  revalidateTag(contextTag(ctx.email), 'max');
  return res;
}

// El brief del proyecto (contenido de la página en Notion) — se carga lazy
// al abrir el proyecto. El gate por Customer vive en loadProjectContent.
export async function getProjectBrief(projectId: string): Promise<ProjectBlock[]> {
  const ctx = await requireContext();
  return (await loadProjectContent(ctx, projectId)) ?? [];
}

// El cuerpo de la tarea (los specs de su página en Notion) — se carga lazy
// al abrir el modal. El gate por Customer vive en loadTaskContent.
export async function getTaskBody(taskId: string): Promise<ProjectBlock[]> {
  const ctx = await requireContext();
  return (await loadTaskContent(ctx, taskId)) ?? [];
}

// La propuesta del cliente (Wiki con categoría Proposal) — se carga lazy al
// abrir el chip en la cápsula. El gate por Customer vive en el query.
export async function getProposal(): Promise<{ title: string; blocks: ProjectBlock[] } | null> {
  const ctx = await requireContext();
  const locale: PortalLocale = (await getLocale()) === 'en' ? 'en' : 'es';
  return loadProposalContent(ctx, locale);
}

// El cliente terminó (o saltó) el tour de coachmarks → marca
// "Portal Onboarding Check" en su página de Team.
export async function completePortalTour(): Promise<{ ok: boolean }> {
  const ctx = await requireContext();
  const res = await markPortalOnboarding(ctx);
  revalidateTag(contextTag(ctx.email), 'max');
  return res;
}

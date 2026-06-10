'use server';

import { requireContext } from '@/lib/auth/require-context';
import { toggleTaskForMember } from '@/lib/portal/toggle';
import { markPortalSignIn } from '@/lib/portal/welcome';

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

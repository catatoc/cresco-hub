'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TAREAS_SCOPE_COOKIE, type TareasScope } from '@/lib/auth/context';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Update the active /tareas scope.
 *
 * Writes the user's choice to the `tareas-scope` cookie so it persists across
 * sessions, then redirects to /tareas with the new `?scope=` and the same
 * `?sprint=` value (if any).
 */
export async function setTareasScope(
  scope: TareasScope,
  sprintId: string | null,
): Promise<void> {
  const store = await cookies();
  store.set(TAREAS_SCOPE_COOKIE, scope, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });

  const params = new URLSearchParams();
  if (sprintId) params.set('sprint', sprintId);
  params.set('scope', scope);
  redirect(`/tareas?${params.toString()}`);
}

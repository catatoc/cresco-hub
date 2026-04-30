'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SCOPE_COOKIE, type Scope, type ScopeKey } from './resolve';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Update the active scope for a section, persist it to its cookie, and
 * redirect to the section's path with the new `?scope=` plus any extra query
 * params the caller wants preserved.
 */
export async function setScope(
  key: ScopeKey,
  scope: Scope,
  redirectPath: string,
  extraParams: Record<string, string> = {},
): Promise<void> {
  const store = await cookies();
  store.set(SCOPE_COOKIE[key], scope, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });

  const params = new URLSearchParams(extraParams);
  params.set('scope', scope);
  redirect(`${redirectPath}?${params.toString()}`);
}

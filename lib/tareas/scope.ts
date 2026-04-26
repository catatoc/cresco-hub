import type { TareasScope } from '@/lib/auth/context';

const VALID: readonly TareasScope[] = ['mine', 'team'] as const;

function isValid(value: unknown): value is TareasScope {
  return typeof value === 'string' && (VALID as readonly string[]).includes(value);
}

/**
 * Resolve the active scope for /tareas using URL → cookie → default.
 *
 * @param urlValue   raw `?scope=` value from searchParams (string | undefined)
 * @param cookieValue raw cookie value (string | undefined)
 */
export function resolveScope(
  urlValue: string | undefined,
  cookieValue: string | undefined,
): TareasScope {
  if (isValid(urlValue)) return urlValue;
  if (isValid(cookieValue)) return cookieValue;
  return 'mine';
}

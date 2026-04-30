export type Scope = 'mine' | 'team';
export type ScopeKey = 'home' | 'tareas' | 'reuniones' | 'proyectos';

const VALID: readonly Scope[] = ['mine', 'team'] as const;

export const SCOPE_COOKIE: Record<ScopeKey, string> = {
  home: 'home-scope',
  tareas: 'tareas-scope',
  reuniones: 'reuniones-scope',
  proyectos: 'proyectos-scope',
};

function isValid(value: unknown): value is Scope {
  return typeof value === 'string' && (VALID as readonly string[]).includes(value);
}

/**
 * Resolve the active scope for a section using URL → cookie → default ('mine').
 *
 * The `_key` arg is reserved for future per-key defaults but is currently
 * unused. Naming it makes the call sites read symmetrically.
 */
export function resolveScope(
  _key: ScopeKey,
  urlValue: string | undefined,
  cookieValue: string | undefined,
): Scope {
  if (isValid(urlValue)) return urlValue;
  if (isValid(cookieValue)) return cookieValue;
  return 'mine';
}

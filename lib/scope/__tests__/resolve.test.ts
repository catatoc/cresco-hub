import { describe, it, expect } from 'vitest';
import { resolveScope, SCOPE_COOKIE, type ScopeKey } from '../resolve';

describe('resolveScope', () => {
  const keys: ScopeKey[] = ['home', 'tareas', 'reuniones', 'proyectos'];

  it.each(keys)('defaults to "mine" for %s when no input', (key) => {
    expect(resolveScope(key, undefined, undefined)).toBe('mine');
  });

  it.each(keys)('uses URL value when valid for %s', (key) => {
    expect(resolveScope(key, 'team', undefined)).toBe('team');
  });

  it.each(keys)('falls back to cookie when URL absent for %s', (key) => {
    expect(resolveScope(key, undefined, 'team')).toBe('team');
  });

  it('URL takes precedence over cookie', () => {
    expect(resolveScope('home', 'mine', 'team')).toBe('mine');
  });

  it('ignores invalid URL value, uses cookie', () => {
    expect(resolveScope('home', 'garbage', 'team')).toBe('team');
  });

  it('ignores invalid cookie value, returns "mine"', () => {
    expect(resolveScope('home', undefined, 'garbage')).toBe('mine');
  });
});

describe('SCOPE_COOKIE', () => {
  it('exposes one cookie name per scope key', () => {
    expect(SCOPE_COOKIE.home).toBe('home-scope');
    expect(SCOPE_COOKIE.tareas).toBe('tareas-scope');
    expect(SCOPE_COOKIE.reuniones).toBe('reuniones-scope');
    expect(SCOPE_COOKIE.proyectos).toBe('proyectos-scope');
  });
});

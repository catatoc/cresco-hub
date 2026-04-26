import { describe, it, expect } from 'vitest';
import { resolveScope } from '../scope';

describe('resolveScope', () => {
  it('returns "mine" when no URL param and no cookie', () => {
    expect(resolveScope(undefined, undefined)).toBe('mine');
  });

  it('uses URL param when present (team)', () => {
    expect(resolveScope('team', undefined)).toBe('team');
  });

  it('uses URL param when present (mine)', () => {
    expect(resolveScope('mine', 'team')).toBe('mine');
  });

  it('falls back to cookie when no URL param', () => {
    expect(resolveScope(undefined, 'team')).toBe('team');
  });

  it('ignores invalid URL values and uses cookie', () => {
    expect(resolveScope('garbage', 'team')).toBe('team');
  });

  it('ignores invalid cookie values and returns "mine"', () => {
    expect(resolveScope(undefined, 'garbage')).toBe('mine');
  });

  it('URL takes precedence over cookie even when cookie is set', () => {
    expect(resolveScope('mine', 'team')).toBe('mine');
  });
});

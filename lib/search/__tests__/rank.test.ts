import { describe, it, expect } from 'vitest';
import { scoreMatch } from '../rank';

describe('scoreMatch', () => {
  it('returns 0 for no match', () => {
    expect(scoreMatch('kick', 'random meeting notes')).toBe(0);
  });

  it('scores contains match', () => {
    expect(scoreMatch('kick', 'Team kickoff prep')).toBeGreaterThanOrEqual(20);
  });

  it('scores prefix match higher than contains', () => {
    const prefix = scoreMatch('kick', 'Kickoff Mogos');
    const contains = scoreMatch('kick', 'Team kickoff prep');
    expect(prefix).toBeGreaterThan(contains);
  });

  it('scores exact match higher than prefix', () => {
    const exact = scoreMatch('kickoff', 'Kickoff');
    const prefix = scoreMatch('kickoff', 'Kickoff Mogos');
    expect(exact).toBeGreaterThan(prefix);
  });

  it('is case-insensitive', () => {
    expect(scoreMatch('MOGOS', 'mogos saas')).toBeGreaterThan(0);
  });

  it('adds recency boost when meta.date is within 7 days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const boosted = scoreMatch('kick', 'Kickoff', { date: today });
    const plain = scoreMatch('kick', 'Kickoff');
    expect(boosted).toBeGreaterThan(plain);
  });

  it('treats empty term as 0 score', () => {
    expect(scoreMatch('', 'anything')).toBe(0);
  });
});

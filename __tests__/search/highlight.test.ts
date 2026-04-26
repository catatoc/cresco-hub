import { describe, expect, it } from 'vitest';
import { highlightMatch } from '@/lib/search/highlight';

describe('highlightMatch', () => {
  it('returns plain text when query is empty', () => {
    const out = highlightMatch('Onboarding mobile', '');
    expect(out).toEqual([{ text: 'Onboarding mobile', match: false }]);
  });

  it('returns plain text when query has no match', () => {
    const out = highlightMatch('Onboarding', 'xyz');
    expect(out).toEqual([{ text: 'Onboarding', match: false }]);
  });

  it('splits text into segments around a single match', () => {
    const out = highlightMatch('Onboarding mobile', 'mob');
    expect(out).toEqual([
      { text: 'Onboarding ', match: false },
      { text: 'mob', match: true },
      { text: 'ile', match: false },
    ]);
  });

  it('matches case-insensitively', () => {
    const out = highlightMatch('Onboarding', 'ONB');
    expect(out).toEqual([
      { text: 'Onb', match: true },
      { text: 'oarding', match: false },
    ]);
  });

  it('handles multiple non-overlapping matches', () => {
    const out = highlightMatch('abc abc', 'abc');
    expect(out).toEqual([
      { text: 'abc', match: true },
      { text: ' ', match: false },
      { text: 'abc', match: true },
    ]);
  });

  it('escapes regex special chars in query', () => {
    const out = highlightMatch('a.b.c', '.');
    expect(out).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
      { text: '.', match: true },
      { text: 'c', match: false },
    ]);
  });
});

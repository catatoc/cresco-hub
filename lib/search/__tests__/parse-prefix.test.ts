import { describe, it, expect } from 'vitest';
import { parsePrefix } from '../parse-prefix';

describe('parsePrefix', () => {
  it('returns no type for plain text', () => {
    expect(parsePrefix('kickoff')).toEqual({ type: null, term: 'kickoff' });
  });

  it('maps # to tasks', () => {
    expect(parsePrefix('#fix login')).toEqual({ type: 'tasks', term: 'fix login' });
  });

  it('maps @ to people', () => {
    expect(parsePrefix('@dani')).toEqual({ type: 'people', term: 'dani' });
  });

  it('maps ! to wiki', () => {
    expect(parsePrefix('!onboarding')).toEqual({ type: 'wiki', term: 'onboarding' });
  });

  it('trims surrounding whitespace', () => {
    expect(parsePrefix('  # kickoff  ')).toEqual({ type: 'tasks', term: 'kickoff' });
  });

  it('treats a lone prefix as empty term', () => {
    expect(parsePrefix('#')).toEqual({ type: 'tasks', term: '' });
  });

  it('does not split prefix inside a word', () => {
    expect(parsePrefix('some#tag')).toEqual({ type: null, term: 'some#tag' });
  });
});

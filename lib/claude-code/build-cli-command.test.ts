import { describe, it, expect } from 'vitest';
import { buildCliCommand } from './build-cli-command';

describe('buildCliCommand', () => {
  it('returns just the claude command when no repo path is given', () => {
    expect(buildCliCommand({ prompt: 'Fix the bug', repoPath: null })).toBe(
      'claude "Fix the bug"',
    );
  });

  it('prefixes with cd when repo path is given', () => {
    expect(
      buildCliCommand({ prompt: 'Fix the bug', repoPath: '/Users/me/project' }),
    ).toBe('cd /Users/me/project && claude "Fix the bug"');
  });

  it('escapes double quotes inside the prompt', () => {
    expect(
      buildCliCommand({ prompt: 'Add "Hello" greeting', repoPath: null }),
    ).toBe('claude "Add \\"Hello\\" greeting"');
  });

  it('escapes backslashes inside the prompt', () => {
    expect(
      buildCliCommand({ prompt: 'Use \\n for newline', repoPath: null }),
    ).toBe('claude "Use \\\\n for newline"');
  });

  it('preserves newlines in the prompt (unquoted)', () => {
    const out = buildCliCommand({ prompt: 'line one\nline two', repoPath: null });
    expect(out).toBe('claude "line one\nline two"');
  });

  it('treats empty repoPath string as no repo', () => {
    expect(buildCliCommand({ prompt: 'p', repoPath: '' })).toBe('claude "p"');
  });
});

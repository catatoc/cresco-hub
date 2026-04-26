import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('motion tokens', () => {
  const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf-8');

  it.each([
    '--duration-instant',
    '--duration-fast',
    '--duration-base',
    '--duration-slow',
    '--duration-celebrate',
    '--ease-linear',
    '--ease-spring',
    '--ease-out-soft',
  ])('defines %s token', (token) => {
    expect(css).toMatch(new RegExp(`${token}\\s*:`));
  });

  it('declares reduced-motion override', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});

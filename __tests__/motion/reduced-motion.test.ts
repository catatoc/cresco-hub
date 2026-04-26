import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('reduced-motion guards in CSS', () => {
  const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf-8');

  it('contains a reduced-motion block that disables empty-bob', () => {
    const reducedBlocks = css.split('@media (prefers-reduced-motion: reduce)').slice(1);
    expect(reducedBlocks.length).toBeGreaterThan(0);
    expect(reducedBlocks.join('\n')).toMatch(/\.empty-bob\s*\{\s*animation:\s*none\s*;?\s*\}/);
  });

  it('contains a reduced-motion block that disables column-flash', () => {
    const reducedBlocks = css.split('@media (prefers-reduced-motion: reduce)').slice(1);
    expect(reducedBlocks.join('\n')).toMatch(/\[data-flashed\]\s*\{\s*animation:\s*none\s*;?\s*\}/);
  });

  it('zeroes out duration tokens under reduced-motion', () => {
    const idx = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(idx).toBeGreaterThan(-1);
    const block = css.slice(idx, idx + 600);
    expect(block).toMatch(/--duration-base:\s*0ms/);
  });
});

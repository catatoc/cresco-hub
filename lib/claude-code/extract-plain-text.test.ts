import { describe, it, expect } from 'vitest';
import { extractPlainText } from './extract-plain-text';

const para = (text: string) => ({
  type: 'paragraph',
  paragraph: { rich_text: [{ plain_text: text }] },
});

const heading = (level: 1 | 2 | 3, text: string) => ({
  type: `heading_${level}`,
  [`heading_${level}`]: { rich_text: [{ plain_text: text }] },
});

const bulletItem = (text: string) => ({
  type: 'bulleted_list_item',
  bulleted_list_item: { rich_text: [{ plain_text: text }] },
});

const numberedItem = (text: string) => ({
  type: 'numbered_list_item',
  numbered_list_item: { rich_text: [{ plain_text: text }] },
});

const todo = (text: string, checked: boolean) => ({
  type: 'to_do',
  to_do: { checked, rich_text: [{ plain_text: text }] },
});

const quote = (text: string) => ({
  type: 'quote',
  quote: { rich_text: [{ plain_text: text }] },
});

const code = (text: string, language = 'plain text') => ({
  type: 'code',
  code: { language, rich_text: [{ plain_text: text }] },
});

const image = () => ({ type: 'image', image: { external: { url: 'https://x' } } });
const divider = () => ({ type: 'divider', divider: {} });

describe('extractPlainText', () => {
  it('returns empty string for an empty array', () => {
    expect(extractPlainText([])).toBe('');
  });

  it('joins paragraphs with newlines', () => {
    const out = extractPlainText([para('First.'), para('Second.')]);
    expect(out).toBe('First.\nSecond.');
  });

  it('renders headings with leading hashes', () => {
    const out = extractPlainText([heading(1, 'Title'), heading(2, 'Sub'), heading(3, 'Sub-sub')]);
    expect(out).toBe('# Title\n## Sub\n### Sub-sub');
  });

  it('renders bulleted and numbered list items with markers', () => {
    const out = extractPlainText([bulletItem('a'), bulletItem('b'), numberedItem('c')]);
    expect(out).toBe('- a\n- b\n1. c');
  });

  it('renders to-do items with checkbox markers', () => {
    const out = extractPlainText([todo('done', true), todo('not done', false)]);
    expect(out).toBe('- [x] done\n- [ ] not done');
  });

  it('renders quotes with > prefix', () => {
    expect(extractPlainText([quote('an aphorism')])).toBe('> an aphorism');
  });

  it('renders code as fenced blocks', () => {
    expect(extractPlainText([code('let x = 1', 'typescript')])).toBe(
      '```typescript\nlet x = 1\n```',
    );
  });

  it('skips unsupported block types (image, divider)', () => {
    expect(extractPlainText([para('keep'), image(), divider(), para('also keep')])).toBe(
      'keep\nalso keep',
    );
  });

  it('caps output at maxChars and adds an ellipsis', () => {
    const long = 'x'.repeat(2500);
    const out = extractPlainText([para(long)], 2000);
    expect(out.length).toBe(2000);
    expect(out.endsWith('…')).toBe(true);
  });

  it('uses 2000 as the default cap', () => {
    const long = 'x'.repeat(3000);
    const out = extractPlainText([para(long)]);
    expect(out.length).toBe(2000);
  });

  it('handles missing rich_text gracefully', () => {
    const broken = { type: 'paragraph', paragraph: {} };
    expect(extractPlainText([broken])).toBe('');
  });
});

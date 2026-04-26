import { describe, it, expect } from 'vitest';
import { createTaskInput, createWikiInput, createInput } from '../create';

describe('createTaskInput', () => {
  const base = {
    type: 'task' as const,
    customerId: 'cust-1',
    title: 'Hola mundo',
  };

  it('accepts minimal valid payload', () => {
    expect(() => createTaskInput.parse(base)).not.toThrow();
  });

  it('rejects empty title', () => {
    expect(() => createTaskInput.parse({ ...base, title: '   ' })).toThrow();
  });

  it('rejects title > 200 chars', () => {
    expect(() => createTaskInput.parse({ ...base, title: 'a'.repeat(201) })).toThrow();
  });

  it('rejects empty customerId', () => {
    expect(() => createTaskInput.parse({ ...base, customerId: '' })).toThrow();
  });

  it('defaults assigneeIds to []', () => {
    const out = createTaskInput.parse(base);
    expect(out.assigneeIds).toEqual([]);
  });

  it('only accepts Low/Medium/High priority', () => {
    expect(() => createTaskInput.parse({ ...base, priority: 'Urgent' })).toThrow();
    expect(() => createTaskInput.parse({ ...base, priority: 'High' })).not.toThrow();
  });
});

describe('createWikiInput', () => {
  const base = {
    type: 'wiki' as const,
    customerId: 'cust-1',
    title: 'Onboarding doc',
  };

  it('defaults emoji to 📄', () => {
    const out = createWikiInput.parse(base);
    expect(out.emoji).toBe('📄');
  });

  it('defaults categories to []', () => {
    const out = createWikiInput.parse(base);
    expect(out.categories).toEqual([]);
  });

  it('only accepts the 5 wikiCategory values', () => {
    expect(() =>
      createWikiInput.parse({ ...base, categories: ['Other'] }),
    ).toThrow();
    expect(() =>
      createWikiInput.parse({ ...base, categories: ['Documentation'] }),
    ).not.toThrow();
  });
});

describe('createInput discriminated union', () => {
  it('rejects payload missing type', () => {
    expect(() => createInput.parse({ customerId: 'c', title: 't' })).toThrow();
  });
});

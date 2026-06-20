import { describe, it, expect } from 'vitest';
import { externalKey } from '../types';

describe('externalKey', () => {
  it('namespaces provider:project:issue', () => {
    expect(
      externalKey({ provider: 'posthog', externalProjectId: '94699', externalId: 'abc-123' }),
    ).toBe('posthog:94699:abc-123');
  });

  it('keeps different projects distinct for the same issue id', () => {
    const a = externalKey({ provider: 'posthog', externalProjectId: '1', externalId: 'x' });
    const b = externalKey({ provider: 'posthog', externalProjectId: '2', externalId: 'x' });
    expect(a).not.toBe(b);
  });
});

import { describe, it, expect } from 'vitest';
import { createAdapter } from '../adapters';
import { PostHogAdapter } from '../posthog-adapter';
import type { ErrorSource } from '@/schemas/integrations/source';

const base: ErrorSource = {
  id: 's',
  provider: 'posthog',
  host: 'https://us.posthog.com',
  apiKey: 'phx',
  externalProjectId: '94699',
  notionProjectId: null,
  notionCustomerId: null,
  notionProviderId: null,
  minOccurrences: 3,
  lastSyncedAt: null,
};

describe('createAdapter', () => {
  it('builds a PostHogAdapter for posthog', () => {
    const a = createAdapter(base);
    expect(a).toBeInstanceOf(PostHogAdapter);
    expect(a.provider).toBe('posthog');
  });

  it('throws for sentry (not implemented yet)', () => {
    expect(() => createAdapter({ ...base, provider: 'sentry' })).toThrow(/sentry/);
  });
});

import { describe, it, expect } from 'vitest';
import { normalizedIssueSchema, externalStatusSchema } from '../error-issue';

// Real PostHog issue shape (Amedi project 94699).
const sample = {
  externalId: '019e714d-c2a6-7bd2-9f85-7c3272093241',
  provider: 'posthog',
  externalProjectId: '94699',
  name: 'DOMException',
  description: 'AbortError: Lock was stolen by another request',
  status: 'active',
  occurrences: 69,
  users: 1,
  sessions: 2,
  library: 'web',
  sourceFile: null,
  firstSeen: '2026-05-28T21:16:19.251000-04:00',
  lastSeen: '2026-06-04T10:33:43.066000-04:00',
  url: 'https://us.posthog.com/project/94699/error_tracking/019e714d-c2a6-7bd2-9f85-7c3272093241',
};

describe('normalizedIssueSchema', () => {
  it('parses a real PostHog issue shape', () => {
    expect(normalizedIssueSchema.parse(sample)).toMatchObject({
      name: 'DOMException',
      occurrences: 69,
      provider: 'posthog',
    });
  });

  it('rejects an unknown status', () => {
    expect(() => externalStatusSchema.parse('deleted')).toThrow();
  });

  it('rejects a non-url', () => {
    expect(() => normalizedIssueSchema.parse({ ...sample, url: 'not-a-url' })).toThrow();
  });
});

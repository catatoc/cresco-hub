import { z } from 'zod';
import { providerSchema } from '@/schemas/integrations/source';

/** Raw issue status as reported by the provider (PostHog vocabulary; Sentry maps onto it). */
export const externalStatusSchema = z.enum([
  'active',
  'resolved',
  'suppressed',
  'pending_release',
  'archived',
]);
export type ExternalStatus = z.infer<typeof externalStatusSchema>;

/**
 * Provider-agnostic issue shape. Every adapter maps its API response onto this,
 * so the reconcile engine never sees provider-specific fields.
 */
export const normalizedIssueSchema = z.object({
  externalId: z.string(),
  provider: providerSchema,
  externalProjectId: z.string(),
  name: z.string(),
  description: z.string(),
  status: externalStatusSchema,
  occurrences: z.number().int().nonnegative(),
  users: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  library: z.string().nullable(),
  sourceFile: z.string().nullable(),
  firstSeen: z.string(),
  lastSeen: z.string(),
  url: z.string().url(),
});
export type NormalizedIssue = z.infer<typeof normalizedIssueSchema>;

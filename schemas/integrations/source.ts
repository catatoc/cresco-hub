import { z } from 'zod';

/** Error-tracking providers we can mirror into Notion. */
export const providerSchema = z.enum(['posthog', 'sentry']);
export type Provider = z.infer<typeof providerSchema>;

/**
 * A connected error-tracking source, as returned by the Supabase registry RPC
 * `get_enabled_error_sources` (one row per provider project, with its API key
 * already decrypted from Vault). Snake_case from SQL → camelCase domain shape.
 *
 * `apiKey` is a secret — never log it.
 */
export const errorSourceSchema = z
  .object({
    source_id: z.string(),
    provider: providerSchema,
    host: z.string().url(),
    api_key: z.string().min(1),
    external_project_id: z.string(),
    notion_project_id: z.string().nullable(),
    notion_customer_id: z.string().nullable(),
    notion_provider_id: z.string().nullable(),
    min_occurrences: z.number().int().nonnegative(),
    // Tolerant default so the code is safe to deploy before migration 0003 lands.
    filter_test_accounts: z.boolean().default(true),
    last_synced_at: z.string().nullable(),
  })
  .transform((r) => ({
    id: r.source_id,
    provider: r.provider,
    host: r.host,
    apiKey: r.api_key,
    externalProjectId: r.external_project_id,
    notionProjectId: r.notion_project_id,
    notionCustomerId: r.notion_customer_id,
    notionProviderId: r.notion_provider_id,
    minOccurrences: r.min_occurrences,
    filterTestAccounts: r.filter_test_accounts,
    lastSyncedAt: r.last_synced_at,
  }));
export type ErrorSource = z.infer<typeof errorSourceSchema>;

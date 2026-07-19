import { PostHogAdapter } from '@/lib/integrations/error-tracking/posthog-adapter';
import type { ProviderAdapter } from '@/lib/integrations/error-tracking/types';
import type { ErrorSource } from '@/schemas/integrations/source';

/** Build the adapter for a source. Adding a provider = one case here. */
export function createAdapter(source: ErrorSource): ProviderAdapter {
  switch (source.provider) {
    case 'posthog':
      return new PostHogAdapter({
        host: source.host,
        projectId: source.externalProjectId,
        apiKey: source.apiKey,
        filterTestAccounts: source.filterTestAccounts,
      });
    case 'sentry':
      throw new Error('adapter for provider "sentry" not implemented yet');
    default: {
      const _exhaustive: never = source.provider;
      throw new Error(`unknown provider: ${String(_exhaustive)}`);
    }
  }
}

import type { ExternalStatus } from '@/schemas/integrations/error-issue';

export type Bit = 'open' | 'closed';

const EXTERNAL_CLOSED: ReadonlySet<ExternalStatus> = new Set(['resolved', 'suppressed', 'archived']);
const NOTION_CLOSED: ReadonlySet<string> = new Set(['Done', 'Archived']);

/** Status set on a reopened (recurred) bug. */
export const REOPEN_STATUS = 'Not Started';
/** Status set on a brand-new open bug. */
export const NEW_OPEN_STATUS = 'Not Started';

export function externalBit(status: ExternalStatus): Bit {
  return EXTERNAL_CLOSED.has(status) ? 'closed' : 'open';
}

export function notionBit(status: string): Bit {
  return NOTION_CLOSED.has(status) ? 'closed' : 'open';
}

export function parseSnapshot(value: string | null): Bit | null {
  return value === 'open' || value === 'closed' ? value : null;
}

/** Notion internal Status to set when the provider CLOSES an issue. */
export function notionCloseStatus(external: ExternalStatus): 'Done' | 'Archived' {
  return external === 'resolved' ? 'Done' : 'Archived'; // suppressed | archived → Archived
}

/** Provider status to set when a Notion task is CLOSED by a human. */
export function providerCloseStatus(notionStatus: string): 'resolved' | 'suppressed' {
  return notionStatus === 'Archived' ? 'suppressed' : 'resolved';
}

export type ReconcileDecision =
  | { kind: 'noop'; snapshot: Bit }
  | { kind: 'set-notion-status'; status: string; reopened: boolean; snapshot: Bit }
  | { kind: 'close-provider'; providerStatus: 'resolved' | 'suppressed'; snapshot: Bit };

/**
 * Decide what to do for an EXISTING bug task at the open↔closed boundary, given
 * the provider status, the Notion internal status, and the snapshot from the last
 * sync. Intermediate human states (In Progress / Testing / …) are preserved ONLY
 * while both sides agree on the open/closed bit; on a disagreement the winning side
 * moves the task to a terminal state (Done / Archived / Not Started).
 *
 * With a single open/closed snapshot, a disagreement means exactly ONE side moved
 * since the last sync (both moving to the same bit would agree, not disagree), so
 * "closing wins" reduces to: propagate the side that changed.
 */
export function decideExisting(args: {
  external: ExternalStatus;
  notionStatus: string;
  snapshot: Bit | null;
}): ReconcileDecision {
  const ext = externalBit(args.external);
  const not = notionBit(args.notionStatus);

  if (ext === not) return { kind: 'noop', snapshot: ext };

  // Disagree. snapshot === null (legacy row) ⇒ treat Notion as unchanged so the
  // provider drives; otherwise the side that differs from the snapshot is the mover.
  const providerMoved = args.snapshot === null || ext !== args.snapshot;

  if (providerMoved) {
    if (ext === 'closed') {
      return { kind: 'set-notion-status', status: notionCloseStatus(args.external), reopened: false, snapshot: 'closed' };
    }
    // Provider reopened (the bug recurred) on a closed Notion task.
    return { kind: 'set-notion-status', status: REOPEN_STATUS, reopened: true, snapshot: 'open' };
  }

  // Notion moved.
  if (not === 'closed') {
    // A human closed it in Notion → close the provider.
    return { kind: 'close-provider', providerStatus: providerCloseStatus(args.notionStatus), snapshot: 'closed' };
  }
  // A human reopened a provider-resolved bug in Notion. The provider is authoritative
  // for the lifecycle (errors are triaged there), so re-close. To truly reopen, do it
  // in PostHog and it flows back as a provider move.
  return { kind: 'set-notion-status', status: notionCloseStatus(args.external), reopened: false, snapshot: 'closed' };
}

/** Decision for a brand-new issue with no Notion task yet. */
export function decideNew(external: ExternalStatus): { internalStatus: string; snapshot: Bit } {
  return externalBit(external) === 'closed'
    ? { internalStatus: notionCloseStatus(external), snapshot: 'closed' }
    : { internalStatus: NEW_OPEN_STATUS, snapshot: 'open' };
}

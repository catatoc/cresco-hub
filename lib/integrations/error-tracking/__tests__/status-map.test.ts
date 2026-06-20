import { describe, it, expect } from 'vitest';
import {
  externalBit,
  notionBit,
  notionCloseStatus,
  providerCloseStatus,
  parseSnapshot,
  decideExisting,
  decideNew,
} from '../status-map';

describe('bit projections', () => {
  it('maps external statuses to open/closed', () => {
    expect(externalBit('active')).toBe('open');
    expect(externalBit('pending_release')).toBe('open');
    expect(externalBit('resolved')).toBe('closed');
    expect(externalBit('suppressed')).toBe('closed');
    expect(externalBit('archived')).toBe('closed');
  });

  it('maps notion statuses to open/closed (only Done/Archived are closed)', () => {
    expect(notionBit('Done')).toBe('closed');
    expect(notionBit('Archived')).toBe('closed');
    expect(notionBit('In Progress')).toBe('open');
    expect(notionBit('Testing')).toBe('open');
    expect(notionBit('Not Started')).toBe('open');
  });

  it('maps close kinds across the boundary', () => {
    expect(notionCloseStatus('resolved')).toBe('Done');
    expect(notionCloseStatus('suppressed')).toBe('Archived');
    expect(notionCloseStatus('archived')).toBe('Archived');
    expect(providerCloseStatus('Done')).toBe('resolved');
    expect(providerCloseStatus('Archived')).toBe('suppressed');
  });

  it('parses the snapshot string', () => {
    expect(parseSnapshot('open')).toBe('open');
    expect(parseSnapshot('closed')).toBe('closed');
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot('')).toBeNull();
  });
});

describe('decideExisting', () => {
  it('noop when both already agree (open) — leaves intermediate human states', () => {
    expect(decideExisting({ external: 'active', notionStatus: 'In Progress', snapshot: 'open' })).toEqual({
      kind: 'noop',
      snapshot: 'open',
    });
  });

  it('noop when both already agree (closed)', () => {
    expect(decideExisting({ external: 'resolved', notionStatus: 'Done', snapshot: 'closed' })).toEqual({
      kind: 'noop',
      snapshot: 'closed',
    });
  });

  it('provider resolved → close Notion as Done', () => {
    expect(decideExisting({ external: 'resolved', notionStatus: 'In Progress', snapshot: 'open' })).toEqual({
      kind: 'set-notion-status',
      status: 'Done',
      reopened: false,
      snapshot: 'closed',
    });
  });

  it('provider suppressed → close Notion as Archived', () => {
    expect(decideExisting({ external: 'suppressed', notionStatus: 'Not Started', snapshot: 'open' })).toEqual({
      kind: 'set-notion-status',
      status: 'Archived',
      reopened: false,
      snapshot: 'closed',
    });
  });

  it('provider reopened (recurred) on a Done task → reopen Notion', () => {
    expect(decideExisting({ external: 'active', notionStatus: 'Done', snapshot: 'closed' })).toEqual({
      kind: 'set-notion-status',
      status: 'Not Started',
      reopened: true,
      snapshot: 'open',
    });
  });

  it('human closed in Notion (Done) → resolve the provider', () => {
    expect(decideExisting({ external: 'active', notionStatus: 'Done', snapshot: 'open' })).toEqual({
      kind: 'close-provider',
      providerStatus: 'resolved',
      snapshot: 'closed',
    });
  });

  it('human closed in Notion (Archived) → suppress the provider', () => {
    expect(decideExisting({ external: 'active', notionStatus: 'Archived', snapshot: 'open' })).toEqual({
      kind: 'close-provider',
      providerStatus: 'suppressed',
      snapshot: 'closed',
    });
  });

  it('human reopened a provider-resolved bug → provider wins, re-close', () => {
    expect(decideExisting({ external: 'resolved', notionStatus: 'In Progress', snapshot: 'closed' })).toEqual({
      kind: 'set-notion-status',
      status: 'Done',
      reopened: false,
      snapshot: 'closed',
    });
  });

  it('null snapshot (legacy row) → provider drives', () => {
    expect(decideExisting({ external: 'resolved', notionStatus: 'In Progress', snapshot: null })).toEqual({
      kind: 'set-notion-status',
      status: 'Done',
      reopened: false,
      snapshot: 'closed',
    });
  });
});

describe('decideNew', () => {
  it('open issue → Not Started', () => {
    expect(decideNew('active')).toEqual({ internalStatus: 'Not Started', snapshot: 'open' });
  });
  it('resolved issue → Done', () => {
    expect(decideNew('resolved')).toEqual({ internalStatus: 'Done', snapshot: 'closed' });
  });
  it('suppressed issue → Archived', () => {
    expect(decideNew('suppressed')).toEqual({ internalStatus: 'Archived', snapshot: 'closed' });
  });
});

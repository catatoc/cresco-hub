import type { SearchEntityType } from './types';

const PREFIX_MAP: Record<string, SearchEntityType> = {
  '#': 'tasks',
  '@': 'people',
  '!': 'wiki',
};

export function parsePrefix(raw: string): { type: SearchEntityType | null; term: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { type: null, term: '' };

  const first = trimmed[0]!;
  const type = PREFIX_MAP[first];
  if (!type) return { type: null, term: trimmed };

  const rest = trimmed.slice(1).trim();
  return { type, term: rest };
}

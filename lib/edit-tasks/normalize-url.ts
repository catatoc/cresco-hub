const SCHEMES = ['http://', 'https://', 'mailto:'];

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  if (SCHEMES.some((s) => trimmed.toLowerCase().startsWith(s))) return trimmed;
  return `https://${trimmed}`;
}

import { getNotion } from './client';
import { notionUserSchema, type NotionUser } from '@/schemas/notion-user';

const cache = new Map<string, NotionUser | null>();

export async function getUser(userId: string): Promise<NotionUser | null> {
  if (cache.has(userId)) return cache.get(userId)!;

  const notion = getNotion();
  try {
    const u = await notion.users.retrieve({ user_id: userId });
    const parsed = notionUserSchema.parse({
      id: u.id,
      name: (u as any).name ?? null,
      avatarUrl: (u as any).avatar_url ?? null,
      email: (u as any).type === 'person' ? (u as any).person?.email ?? null : null,
    });
    cache.set(userId, parsed);
    return parsed;
  } catch {
    cache.set(userId, null);
    return null;
  }
}

export async function getUsers(userIds: string[]): Promise<NotionUser[]> {
  const unique = Array.from(new Set(userIds));
  const users = await Promise.all(unique.map(getUser));
  return users.filter((u): u is NotionUser => u !== null);
}

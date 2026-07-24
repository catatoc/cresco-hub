import { Client } from '@notionhq/client';
import { serverEnv } from '@/lib/env';

let _client: Client | null = null;

export function getNotion(): Client {
  if (!_client) {
    // timeoutMs: el default del SDK son 60s — en un bache de Notion eso se
    // siente como página colgada; mejor fallar a los 10s y reintentar/caer
    // al error boundary con Reintentar
    _client = new Client({ auth: serverEnv.NOTION_API_KEY, timeoutMs: 10_000 });
  }
  return _client;
}

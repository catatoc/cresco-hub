import { Client } from '@notionhq/client';
import { serverEnv } from '@/lib/env';

let _client: Client | null = null;

export function getNotion(): Client {
  if (!_client) {
    _client = new Client({ auth: serverEnv.NOTION_API_KEY });
  }
  return _client;
}

import { getNotion } from './client';
import { clientSchema, type Client } from '@/schemas/client';

export async function getClient(id: string): Promise<Client | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    const props = page.properties as Record<string, any>;
    const icon = (page as any).icon;

    return clientSchema.parse({
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text ?? '',
      icon: icon?.type === 'emoji' ? icon.emoji : null,
      status: props.Status?.select?.name ?? null,
    });
  } catch {
    return null;
  }
}

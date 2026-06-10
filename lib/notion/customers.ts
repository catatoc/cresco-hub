import { getNotion } from './client';
import { customerSchema, type Customer, type CustomerIcon } from '@/schemas/customer';

function parseIcon(icon: any): CustomerIcon | null {
  if (!icon) return null;
  if (icon.type === 'emoji' && typeof icon.emoji === 'string') {
    return { type: 'emoji', value: icon.emoji };
  }
  if (icon.type === 'external' && typeof icon.external?.url === 'string') {
    return { type: 'image', value: icon.external.url };
  }
  if (icon.type === 'file' && typeof icon.file?.url === 'string') {
    return { type: 'image', value: icon.file.url };
  }
  return null;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    const p = page.properties as Record<string, any>;

    return customerSchema.parse({
      id: page.id,
      name: p['Customer name']?.title?.[0]?.plain_text ?? '',
      icon: parseIcon((page as any).icon),
      status: p.Status?.status?.name ?? null,
      type: p.Type?.select?.name ?? null,
      logo: typeof p.Logo?.url === 'string' ? p.Logo.url : null,
    });
  } catch {
    return null;
  }
}

export async function getCustomers(ids: string[]): Promise<Customer[]> {
  const results = await Promise.all(ids.map((id) => getCustomer(id)));
  return results.filter((c): c is Customer => c !== null);
}

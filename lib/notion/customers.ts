import { getNotion } from './client';
import { customerSchema, type Customer } from '@/schemas/customer';

export async function getCustomer(id: string): Promise<Customer | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    const p = page.properties as Record<string, any>;
    const icon = (page as any).icon;

    return customerSchema.parse({
      id: page.id,
      name: p['Customer name']?.title?.[0]?.plain_text ?? '',
      icon: icon?.type === 'emoji' ? icon.emoji : null,
      status: p.Status?.status?.name ?? null,
      type: p.Type?.select?.name ?? null,
    });
  } catch {
    return null;
  }
}

// Marca/desmarca una tarea del cliente — lógica compartida entre el server
// action del portal web y el API móvil. Seguridad: solo si la tarea está
// asignada al miembro (relación Team) Y pertenece a su customer.
import { getNotion } from '@/lib/notion/client';
import type { AppContext } from '@/lib/auth/context';

export async function toggleTaskForMember(
  ctx: AppContext,
  taskId: string,
  done: boolean,
): Promise<{ ok: boolean }> {
  try {
    const notion = getNotion();
    const page: any = await notion.pages.retrieve({ page_id: taskId });
    if (!('properties' in page)) return { ok: false };
    const p = page.properties as Record<string, any>;
    const teamIds: string[] = (p.Team?.relation ?? []).map((r: { id: string }) => r.id);
    const customerId: string | null = p.Customer?.relation?.[0]?.id ?? null;
    if (!teamIds.includes(ctx.memberId) || customerId !== ctx.customerId) {
      return { ok: false };
    }
    await notion.pages.update({
      page_id: taskId,
      properties: { Status: { status: { name: done ? 'Done' : 'Not Started' } } },
    } as any);
    return { ok: true };
  } catch (e) {
    console.error('[portal] toggleTaskForMember failed', e);
    return { ok: false };
  }
}

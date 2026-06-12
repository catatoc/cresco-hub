// Bienvenida del portal — se muestra una sola vez por miembro. La marca vive
// en Notion (checkbox "Portal Sign In" en Team), no en el navegador: el
// cliente la ve una vez sin importar el dispositivo.
import { getNotion } from '@/lib/notion/client';
import type { AppContext } from '@/lib/auth/context';

export async function markPortalSignIn(ctx: AppContext): Promise<{ ok: boolean }> {
  try {
    await getNotion().pages.update({
      page_id: ctx.memberId,
      properties: { 'Portal Sign In': { checkbox: true } },
    } as any);
    return { ok: true };
  } catch (e) {
    console.error('[portal] markPortalSignIn failed', e);
    return { ok: false };
  }
}

// El tour del portal (coachmarks) — misma filosofía: se ve una vez por
// miembro, la marca vive en Notion ("Portal Onboarding Check" en Team).
export async function markPortalOnboarding(ctx: AppContext): Promise<{ ok: boolean }> {
  try {
    await getNotion().pages.update({
      page_id: ctx.memberId,
      properties: { 'Portal Onboarding Check': { checkbox: true } },
    } as any);
    return { ok: true };
  } catch (e) {
    console.error('[portal] markPortalOnboarding failed', e);
    return { ok: false };
  }
}

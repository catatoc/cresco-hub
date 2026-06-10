import type { Metadata } from 'next';
import { requireContext } from '@/lib/auth/require-context';
import { loadPortalData } from '@/lib/portal/data';
import { loadPortalPayments } from '@/lib/portal/payments';
import { PortalHome } from '@/components/portal/portal-home';
import { WelcomeExperience } from '@/components/portal/welcome-experience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'crescō · tu proyecto',
};

export default async function PortalPage() {
  const ctx = await requireContext();

  // primera entrada (Portal Sign In vacío en Team) → bienvenida; al terminar,
  // el server action marca el checkbox y el refresh cae en el portal
  if (!ctx.portalSignIn) {
    return <WelcomeExperience firstName={ctx.memberName.split(/\s+/)[0] ?? ctx.memberName} gender={ctx.memberGender} />;
  }

  const [data, payments] = await Promise.all([loadPortalData(ctx), loadPortalPayments(ctx)]);
  return <PortalHome data={data} payments={payments} />;
}

import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireContext } from '@/lib/auth/require-context';
import type { PortalLocale } from '@/lib/portal/i18n';
import {
  cachedPortalData,
  cachedPortalPayments,
  cachedPortalDocuments,
} from '@/lib/portal/cache';
import { PortalHome } from '@/components/portal/portal-home';
import { WelcomeExperience } from '@/components/portal/welcome-experience';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.metadata');
  return { title: `crescō · ${t('home')}` };
}

export default async function PortalPage() {
  const ctx = await requireContext();

  // primera entrada (Portal Sign In vacío en Team) → bienvenida; al terminar,
  // el server action marca el checkbox y el refresh cae en el portal
  if (!ctx.portalSignIn) {
    return <WelcomeExperience firstName={ctx.memberName.split(/\s+/)[0] ?? ctx.memberName} gender={ctx.memberGender} />;
  }

  const locale: PortalLocale = (await getLocale()) === 'en' ? 'en' : 'es';
  const [data, payments, documents] = await Promise.all([
    cachedPortalData(ctx, locale),
    cachedPortalPayments(ctx, locale),
    cachedPortalDocuments(ctx, locale),
  ]);
  return <PortalHome data={data} payments={payments} documents={documents} showTour={!ctx.portalOnboarding} />;
}

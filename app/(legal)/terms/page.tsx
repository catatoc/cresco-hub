import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { TermsContentEs } from './terms-content-es';
import { TermsContentEn } from './terms-content-en';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal.terms');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function TermsPage() {
  const t = await getTranslations('legal');
  const locale = await getLocale();

  return (
    <article className="max-w-none">
      <h1 className="text-3xl font-medium tracking-[-0.035em] text-[#1A1612] mb-2">
        {t('terms.title')}
      </h1>
      <p className="text-sm text-[#8C8377] mb-10">
        {t('lastUpdated')}: {t('terms.date')}
      </p>

      {locale === 'en' ? <TermsContentEn /> : <TermsContentEs />}
    </article>
  );
}

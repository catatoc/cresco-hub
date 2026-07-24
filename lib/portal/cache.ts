// ── Portal del cliente · capa de cache ──────────────────────────────────────
// Los loaders del portal consultan Notion en vivo (300-800ms por llamada, y
// peor en un bache). Aquí se envuelven en unstable_cache con 60s de vida y un
// tag por customer: el portal se siente instantáneo y las acciones que mutan
// (toggle de tarea) revalidan el tag para ver el dato fresco.
import { unstable_cache } from 'next/cache';
import type { AppContext } from '@/lib/auth/context';
import type { PortalLocale } from './i18n';
import { loadPortalData } from './data';
import { loadPortalPayments } from './payments';
import { loadPortalDocuments } from './documents';
import { loadPortalMeetings, loadPortalMeeting } from './meeting';

export const portalTag = (customerId: string) => `portal:${customerId}`;

const REVALIDATE = 60;

const opts = (ctx: AppContext) => ({
  revalidate: REVALIDATE,
  tags: [portalTag(ctx.customerId)],
});

export const cachedPortalData = (ctx: AppContext, locale: PortalLocale) =>
  unstable_cache(
    () => loadPortalData(ctx, locale),
    ['portal-data', ctx.customerId, ctx.memberId, locale],
    opts(ctx),
  )();

export const cachedPortalPayments = (ctx: AppContext, locale: PortalLocale) =>
  unstable_cache(
    () => loadPortalPayments(ctx, locale),
    ['portal-payments', ctx.customerId, locale],
    opts(ctx),
  )();

export const cachedPortalDocuments = (ctx: AppContext, locale: PortalLocale) =>
  unstable_cache(
    () => loadPortalDocuments(ctx, locale),
    ['portal-documents', ctx.customerId, ctx.memberId, locale],
    opts(ctx),
  )();

export const cachedPortalMeetings = (ctx: AppContext, locale: PortalLocale) =>
  unstable_cache(
    () => loadPortalMeetings(ctx, locale),
    ['portal-meetings', ctx.customerId, locale],
    opts(ctx),
  )();

export const cachedPortalMeeting = (ctx: AppContext, meetingId: string, locale: PortalLocale) =>
  unstable_cache(
    () => loadPortalMeeting(ctx, meetingId, locale),
    ['portal-meeting', ctx.customerId, meetingId, locale],
    opts(ctx),
  )();

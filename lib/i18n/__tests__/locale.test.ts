import { describe, expect, it } from 'vitest';
import { detectLocale, localeForCustomer, CUSTOMER_LOCALES } from '@/lib/i18n/locale';

const noHeaders = { get: () => null };
const AMEDI = '31a8af9a-4f71-80e8-b61b-d7888a9007e2';

describe('detectLocale · precedencia', () => {
  it('sin cookies, español', () => {
    expect(detectLocale(undefined, undefined, noHeaders)).toBe('es');
  });

  it('el default del cliente aplica cuando no hay toggle', () => {
    expect(detectLocale(undefined, 'en', noHeaders)).toBe('en');
  });

  it('el toggle gana sobre el default del cliente', () => {
    expect(detectLocale('es', 'en', noHeaders)).toBe('es');
    expect(detectLocale('en', 'es', noHeaders)).toBe('en');
  });

  it('ignora valores basura y cae al siguiente nivel', () => {
    expect(detectLocale('fr', 'en', noHeaders)).toBe('en');
    expect(detectLocale('fr', 'de', noHeaders)).toBe('es');
    expect(detectLocale('', '', noHeaders)).toBe('es');
  });

  it('no detecta por Accept-Language', () => {
    const headers = { get: () => 'en-US,en;q=0.9' };
    expect(detectLocale(undefined, undefined, headers)).toBe('es');
  });
});

describe('localeForCustomer', () => {
  it('amedi arranca en inglés', () => {
    expect(localeForCustomer(AMEDI)).toBe('en');
  });

  it('cualquier otro cliente usa el default del portal', () => {
    expect(localeForCustomer('31a8af9a-4f71-8090-a71c-c30f323c018b')).toBeNull();
    expect(localeForCustomer(null)).toBeNull();
    expect(localeForCustomer(undefined)).toBeNull();
  });

  it('los ids del override son uuids con guiones, como los devuelve Notion', () => {
    for (const id of Object.keys(CUSTOMER_LOCALES)) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });
});

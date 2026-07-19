import { describe, it, expect } from 'vitest';
import { dayMonthLabel, monthYearLabel, meetingDateLabels, portalDict, pick } from '../i18n';

describe('dayMonthLabel', () => {
  it('formatea el día calendario en UTC según el locale', () => {
    // default 'es' preserva el formato histórico "8 jun"
    expect(dayMonthLabel('2026-06-08')).toBe('8 jun');
    expect(dayMonthLabel('2026-06-08', 'es')).toBe('8 jun');
    // en-US invierte el orden y capitaliza el mes: "Jun 8"
    expect(dayMonthLabel('2026-06-08', 'en')).toBe('Jun 8');
  });

  it('null si el ISO no parsea', () => {
    expect(dayMonthLabel('no-es-fecha', 'en')).toBeNull();
  });
});

describe('monthYearLabel', () => {
  it('mes largo + año según locale', () => {
    const jun = new Date('2026-06-15T12:00:00Z');
    expect(monthYearLabel(jun, 'es')).toBe('junio 2026');
    expect(monthYearLabel(jun, 'en')).toBe('June 2026');
  });
});

describe('meetingDateLabels', () => {
  it('en-US: "Jun 8" y "Monday, June 8 · 8:30 pm" respetando el huso del ISO', () => {
    const { dateLabel, fullDateLabel } = meetingDateLabels('2026-06-08T20:30:00.000+08:00', 'en');
    expect(dateLabel).toBe('Jun 8');
    expect(fullDateLabel).toBe('Monday, June 8 · 8:30 pm');
  });

  it('en-US sin hora → sin hora en el label', () => {
    expect(meetingDateLabels('2026-05-04', 'en').fullDateLabel).toBe('Monday, May 4');
  });

  it('default sigue en español', () => {
    expect(meetingDateLabels('2026-06-08T20:30:00.000+08:00').fullDateLabel).toBe(
      'lunes 8 de junio · 8:30 pm',
    );
  });
});

describe('portalDict / pick', () => {
  it('el default es español', () => {
    expect(portalDict().pillPaused).toBe('en pausa');
    expect(portalDict('en').pillPaused).toBe('on hold');
  });

  it('pick resuelve strings planos y pares bilingües', () => {
    expect(pick('API', 'en')).toBe('API');
    expect(pick({ es: 'Consultorio', en: 'Practice' }, 'en')).toBe('Practice');
    expect(pick({ es: 'Consultorio', en: 'Practice' })).toBe('Consultorio');
    expect(pick(undefined, 'en')).toBe('');
  });
});

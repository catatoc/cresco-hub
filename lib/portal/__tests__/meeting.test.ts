import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({
  serverEnv: { NOTION_DB_TEAM: 'team-db', NOTION_DB_MEETINGS: 'meetings-db' },
}));

const mockNotion = {
  pages: { retrieve: vi.fn() },
  blocks: { children: { list: vi.fn() } },
  dataSources: { query: vi.fn() },
};

import { meetingDateLabels, parseActaBlocks, loadPortalMeeting } from '../meeting';
import type { AppContext } from '@/lib/auth/context';

const ctx = {
  email: 'cliente@amedi.co',
  memberId: 'member-1',
  memberName: 'Andrés',
  customerId: 'customer-amedi',
  customerName: 'Amedi',
  customerIcon: null,
  customerLogo: null,
  customers: [],
  projectIds: [],
  isAdmin: false,
  isInternal: false,
  portalSignIn: true,
} satisfies AppContext;

beforeEach(() => {
  mockNotion.pages.retrieve.mockReset();
  mockNotion.blocks.children.list.mockReset();
  mockNotion.dataSources.query.mockReset();
});

describe('meetingDateLabels', () => {
  it('respeta el huso del ISO (no el del runtime) y formatea 12h', () => {
    const { dateLabel, fullDateLabel } = meetingDateLabels('2026-06-08T20:30:00.000+08:00');
    expect(dateLabel).toBe('8 jun');
    expect(fullDateLabel).toBe('lunes 8 de junio · 8:30 pm');
  });

  it('fecha sin hora → sin hora en el label', () => {
    const { fullDateLabel } = meetingDateLabels('2026-05-04');
    expect(fullDateLabel).toBe('lunes 4 de mayo');
  });

  it('mediodía y medianoche en 12h', () => {
    expect(meetingDateLabels('2026-06-08T12:00:00.000Z').fullDateLabel).toContain('12:00 pm');
    expect(meetingDateLabels('2026-06-08T00:15:00.000Z').fullDateLabel).toContain('12:15 am');
  });

  it('null → labels vacíos', () => {
    expect(meetingDateLabels(null)).toEqual({ dateLabel: '', fullDateLabel: '' });
  });
});

const block = (type: string, text: string) => ({
  type,
  [type]: { rich_text: [{ plain_text: text }] },
});

describe('parseActaBlocks', () => {
  it('excluye transcription y mapea los tipos soportados', () => {
    const out = parseActaBlocks([
      { type: 'transcription', transcription: {} },
      block('heading_2', 'Resumen ejecutivo'),
      block('paragraph', 'Reunión de incorporación.'),
      block('heading_3', 'Temas clave'),
      block('bulleted_list_item', 'Sync semanal'),
      block('numbered_list_item', 'Paso uno'),
      { type: 'embed', embed: {} },
    ]);
    expect(out).toEqual([
      { kind: 'h2', text: 'Resumen ejecutivo' },
      { kind: 'p', text: 'Reunión de incorporación.' },
      { kind: 'h3', text: 'Temas clave' },
      { kind: 'li', text: 'Sync semanal' },
      { kind: 'oli', text: 'Paso uno' },
    ]);
  });

  it('excluye la sección Acciones completa (heading + contenido)', () => {
    const out = parseActaBlocks([
      block('heading_3', 'Temas clave'),
      block('bulleted_list_item', 'Tema A'),
      block('heading_3', 'Acciones'),
      block('paragraph', 'Las tareas se crearon en Refining para el triage.'),
      block('bulleted_list_item', 'interno'),
    ]);
    expect(out).toEqual([
      { kind: 'h3', text: 'Temas clave' },
      { kind: 'li', text: 'Tema A' },
    ]);
  });

  it('la sección Acciones termina en el próximo heading del mismo nivel', () => {
    const out = parseActaBlocks([
      block('heading_3', 'Acciones'),
      block('paragraph', 'interno'),
      block('heading_3', 'Cierre'),
      block('paragraph', 'Gracias a todos.'),
    ]);
    expect(out).toEqual([
      { kind: 'h3', text: 'Cierre' },
      { kind: 'p', text: 'Gracias a todos.' },
    ]);
  });

  it('matchea Acciones sin importar mayúsculas/acentos y omite vacíos', () => {
    const out = parseActaBlocks([
      block('heading_2', 'ACCIONES'),
      block('paragraph', 'interno'),
    ]);
    expect(out).toEqual([]);
    expect(parseActaBlocks([block('paragraph', '   ')])).toEqual([]);
  });
});

describe('loadPortalMeeting · gate por customer', () => {
  it('reunión de otro customer → null', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'meeting-1',
      properties: { Customer: { relation: [{ id: 'customer-otro' }] } },
    });
    expect(await loadPortalMeeting(ctx, 'meeting-1')).toBeNull();
    expect(mockNotion.blocks.children.list).not.toHaveBeenCalled();
  });

  it('id inexistente (retrieve lanza) → null', async () => {
    mockNotion.pages.retrieve.mockRejectedValueOnce(new Error('not found'));
    expect(await loadPortalMeeting(ctx, 'nope')).toBeNull();
  });

  it('reunión del customer → carga acta y filtra acuerdos de otros customers', async () => {
    mockNotion.pages.retrieve
      .mockResolvedValueOnce({
        id: 'meeting-1',
        properties: {
          Name: { title: [{ plain_text: 'Touchpoint' }] },
          'Meeting type': { select: { name: 'Touchpoint' } },
          Date: { date: { start: '2026-06-08T20:30:00.000+08:00' } },
          Customer: { relation: [{ id: 'customer-amedi' }] },
          Team: { relation: [] },
          Tasks: { relation: [{ id: 'task-mia' }, { id: 'task-ajena' }] },
          Summary: { rich_text: [] },
        },
      })
      // task del customer del cliente
      .mockResolvedValueOnce({
        id: 'task-mia',
        properties: {
          'Task name': { title: [{ plain_text: 'Acuerdo visible' }] },
          Status: { status: { name: 'In Progress' } },
          Customer: { relation: [{ id: 'customer-amedi' }] },
          Team: { relation: [{ id: 'member-1' }] },
        },
      })
      // task de otro customer: debe filtrarse
      .mockResolvedValueOnce({
        id: 'task-ajena',
        properties: {
          'Task name': { title: [{ plain_text: 'Interna' }] },
          Status: { status: { name: 'Not Started' } },
          Customer: { relation: [{ id: 'customer-otro' }] },
          Team: { relation: [] },
        },
      });
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [
        { type: 'transcription', transcription: {} },
        block('heading_2', 'Resumen ejecutivo'),
        block('paragraph', 'La reunión.'),
      ],
      has_more: false,
    });
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [], has_more: false }); // team

    const meeting = await loadPortalMeeting(ctx, 'meeting-1');
    expect(meeting).not.toBeNull();
    expect(meeting!.title).toBe('Touchpoint');
    expect(meeting!.fullDateLabel).toBe('lunes 8 de junio · 8:30 pm');
    expect(meeting!.acta).toEqual([
      { kind: 'h2', text: 'Resumen ejecutivo' },
      { kind: 'p', text: 'La reunión.' },
    ]);
    expect(meeting!.acuerdos).toHaveLength(1);
    expect(meeting!.acuerdos[0]!.title).toBe('Acuerdo visible');
    expect(meeting!.acuerdos[0]!.mine).toBe(true);
  });
});

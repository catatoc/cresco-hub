import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  pages: { retrieve: vi.fn() },
  blocks: { children: { list: vi.fn() } },
};

import { parseProjectBlocks, loadProjectContent } from '../content';
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
  memberGender: null,
} satisfies AppContext;

beforeEach(() => {
  mockNotion.pages.retrieve.mockReset();
  mockNotion.blocks.children.list.mockReset();
});

const rt = (text: string) => ({ rich_text: [{ plain_text: text }] });

describe('parseProjectBlocks', () => {
  it('mapea el subset seguro y aplana los rich text', () => {
    const out = parseProjectBlocks([
      { type: 'callout', callout: { ...rt('Resumen'), icon: { type: 'emoji', emoji: '🛡️' } } },
      { type: 'heading_2', heading_2: rt('Objetivo') },
      { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Hola ' }, { plain_text: 'mundo' }] } },
      { type: 'bulleted_list_item', bulleted_list_item: rt('punto') },
      { type: 'numbered_list_item', numbered_list_item: rt('paso') },
      { type: 'quote', quote: rt('cita') },
    ]);
    expect(out).toEqual([
      { kind: 'callout', text: 'Resumen', icon: '🛡️' },
      { kind: 'h2', text: 'Objetivo' },
      { kind: 'p', text: 'Hola mundo' },
      { kind: 'li', text: 'punto' },
      { kind: 'oli', text: 'paso' },
      { kind: 'quote', text: 'cita' },
    ]);
  });

  it('excluye tipos no soportados (child pages, code no-mermaid, embeds)', () => {
    const out = parseProjectBlocks([
      { type: 'paragraph', paragraph: rt('visible') },
      { type: 'child_page', child_page: { title: 'Reporte interno' } },
      { type: 'code', code: { ...rt('secret()'), language: 'typescript' } },
      { type: 'image', image: {} }, // sin url → fuera
      { type: 'embed', embed: {} },
      { type: 'to_do', to_do: rt('tarea interna') },
    ]);
    expect(out).toEqual([{ kind: 'p', text: 'visible' }]);
  });

  it('los code blocks mermaid pasan como diagrama', () => {
    const out = parseProjectBlocks([
      { type: 'code', code: { ...rt('graph TD; A-->B'), language: 'mermaid' } },
      { type: 'code', code: { ...rt('console.log(1)'), language: 'javascript' } },
    ]);
    expect(out).toEqual([{ kind: 'mermaid', text: 'graph TD; A-->B' }]);
  });

  it('las imágenes pasan con url (file o external) y caption', () => {
    const out = parseProjectBlocks([
      { type: 'image', image: { file: { url: 'https://s3/a.png' }, caption: [{ plain_text: 'Wireframe' }] } },
      { type: 'image', image: { external: { url: 'https://cdn/b.png' }, caption: [] } },
    ]);
    expect(out).toEqual([
      { kind: 'img', text: 'Wireframe', url: 'https://s3/a.png' },
      { kind: 'img', text: '', url: 'https://cdn/b.png' },
    ]);
  });

  it('corta todo lo que sigue al último divisor (notas internas)', () => {
    const out = parseProjectBlocks([
      { type: 'heading_2', heading_2: rt('Objetivo') },
      { type: 'paragraph', paragraph: rt('contenido') },
      { type: 'divider', divider: {} },
      { type: 'paragraph', paragraph: rt('más contenido') },
      { type: 'divider', divider: {} },
      { type: 'paragraph', paragraph: rt('Referencia: docs/audit en el repo') },
    ]);
    expect(out).toEqual([
      { kind: 'h2', text: 'Objetivo' },
      { kind: 'p', text: 'contenido' },
      { kind: 'divider', text: '' },
      { kind: 'p', text: 'más contenido' },
    ]);
  });

  it('sin divisor no corta nada; párrafos vacíos fuera', () => {
    const out = parseProjectBlocks([
      { type: 'paragraph', paragraph: rt('a') },
      { type: 'paragraph', paragraph: { rich_text: [] } },
      { type: 'paragraph', paragraph: rt('b') },
    ]);
    expect(out).toEqual([
      { kind: 'p', text: 'a' },
      { kind: 'p', text: 'b' },
    ]);
  });
});

describe('loadProjectContent', () => {
  it('niega proyectos de otro customer (null → 404)', async () => {
    mockNotion.pages.retrieve.mockResolvedValue({
      properties: { Customer: { relation: [{ id: 'customer-otro' }] } },
    });
    expect(await loadProjectContent(ctx, 'proj-1')).toBeNull();
    expect(mockNotion.blocks.children.list).not.toHaveBeenCalled();
  });

  it('entrega los bloques del proyecto propio', async () => {
    mockNotion.pages.retrieve.mockResolvedValue({
      properties: { Customer: { relation: [{ id: 'customer-amedi' }] } },
    });
    mockNotion.blocks.children.list.mockResolvedValue({
      results: [{ type: 'heading_2', heading_2: rt('Objetivo') }],
      has_more: false,
    });
    expect(await loadProjectContent(ctx, 'proj-1')).toEqual([{ kind: 'h2', text: 'Objetivo' }]);
  });
});

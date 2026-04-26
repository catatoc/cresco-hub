# Meetings page UX redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar `/reuniones` para que abra por defecto la última reunión pasada, mostrar `Summary` en hero y sidebar (timeline agrupado por mes), añadir banner de próxima reunión, contador de tareas abiertas y empty state.

**Architecture:** Cambio acotado a `app/(app)/reuniones/`, `components/meetings/`, `schemas/meeting.ts` y `lib/notion/meetings.ts`. Nueva utilidad de selección en `lib/meetings/select.ts`. Server components se mantienen como están (force-dynamic). Tests con vitest siguiendo el patrón existente en `lib/notion/__tests__/`.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind, Zod, date-fns, vitest.

**Spec:** `docs/superpowers/specs/2026-04-26-meetings-page-ux-design.md`

---

## File Structure

**Create:**
- `lib/meetings/select.ts` — pure helpers `pickDefault` y `pickNextMeeting`
- `lib/meetings/__tests__/select.test.ts` — tests unitarios
- `components/meetings/next-meeting-banner.tsx` — banner verde "Próxima reunión"
- `components/meetings/meetings-empty.tsx` — empty state cuando no hay reuniones

**Modify:**
- `schemas/meeting.ts` — añadir `summary: string | null`
- `lib/notion/meetings.ts` — parsear `Summary` rich_text
- `lib/notion/__tests__/meetings.test.ts` — extender tests con `Summary`
- `components/meetings/hero-meeting.tsx` — render summary + counter de tareas
- `components/meetings/history-panel.tsx` — agrupación por mes + estilo timeline + summary
- `app/(app)/reuniones/page.tsx` — usar `pickDefault`/`pickNextMeeting`, banner, empty state
- `app/(app)/reuniones/[meetingId]/page.tsx` — calcular `nextMeeting` y pasarlo al banner
- `app/(app)/reuniones/loading.tsx` — ajustar skeleton al nuevo sidebar

---

## Task 1: Schema + parser de `Summary`

**Files:**
- Modify: `schemas/meeting.ts`
- Modify: `lib/notion/meetings.ts:5-21`
- Test: `lib/notion/__tests__/meetings.test.ts`

- [ ] **Step 1: Extender el test existente con la propiedad `Summary`**

Edit `lib/notion/__tests__/meetings.test.ts` — dentro del fixture de `properties` (línea ~22) agregar:

```ts
Summary: {
  rich_text: [
    { plain_text: 'Definimos prioridades. ' },
    { plain_text: 'Carlos lleva la migración.' },
  ],
},
```

Y dentro del `expect(meetings[0]).toMatchObject({ ... })` agregar:

```ts
summary: 'Definimos prioridades. Carlos lleva la migración.',
```

- [ ] **Step 2: Correr el test, debe fallar**

```bash
npx vitest run lib/notion/__tests__/meetings.test.ts
```

Expected: FAIL — `Required` (zod) o `summary` no presente en output.

- [ ] **Step 3: Añadir `summary` al schema**

Edit `schemas/meeting.ts`:

```ts
import { z } from 'zod';

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().nullable(),
  endDate: z.string().nullable(),
  meetingType: z.string().nullable(),
  summary: z.string().nullable(),
  attendeeIds: z.array(z.string()),
  customerId: z.string().nullable(),
  projectIds: z.array(z.string()),
  teamIds: z.array(z.string()),
  taskIds: z.array(z.string()),
  wikiIds: z.array(z.string()),
  url: z.string().url(),
});
export type Meeting = z.infer<typeof meetingSchema>;
```

- [ ] **Step 4: Parsear `Summary` en `parseMeeting`**

Edit `lib/notion/meetings.ts` — dentro de `parseMeeting`, junto a los otros campos (después de `meetingType`):

```ts
summary:
  ((p.Summary?.rich_text ?? []) as Array<{ plain_text: string }>)
    .map((t) => t.plain_text)
    .join('')
    .trim() || null,
```

- [ ] **Step 5: Correr el test, debe pasar**

```bash
npx vitest run lib/notion/__tests__/meetings.test.ts
```

Expected: PASS.

- [ ] **Step 6: Agregar test para `summary` ausente**

Edit `lib/notion/__tests__/meetings.test.ts` — añadir un caso:

```ts
it('returns null summary when Summary property is missing', async () => {
  mockNotion.dataSources.query.mockResolvedValueOnce({
    results: [
      {
        id: 'meeting-2',
        url: 'https://notion.so/meeting-2',
        properties: {
          Name: { title: [{ plain_text: 'Sin summary' }] },
          Date: { date: { start: '2026-04-01', end: null } },
          'Meeting type': { select: null },
          Attendees: { people: [] },
          Customer: { relation: [{ id: 'cust-focus' }] },
          Projects: { relation: [] },
          Team: { relation: [] },
          Tasks: { relation: [] },
          Wiki: { relation: [] },
        },
      },
    ],
  });

  const meetings = await queryMeetingsByCustomer('cust-focus');
  expect(meetings[0].summary).toBeNull();
});
```

Run: `npx vitest run lib/notion/__tests__/meetings.test.ts`. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add schemas/meeting.ts lib/notion/meetings.ts lib/notion/__tests__/meetings.test.ts
git commit -m "feat(meetings): add Summary field to schema and parser"
```

---

## Task 2: Helpers de selección (`pickDefault`, `pickNextMeeting`)

**Files:**
- Create: `lib/meetings/select.ts`
- Test: `lib/meetings/__tests__/select.test.ts`

- [ ] **Step 1: Escribir el test fallando**

Create `lib/meetings/__tests__/select.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickDefault, pickNextMeeting } from '../select';
import type { Meeting } from '@/schemas/meeting';

function makeMeeting(id: string, date: string | null): Meeting {
  return {
    id,
    title: id,
    date,
    endDate: null,
    meetingType: null,
    summary: null,
    attendeeIds: [],
    customerId: 'cust-1',
    projectIds: [],
    teamIds: [],
    taskIds: [],
    wikiIds: [],
    url: `https://notion.so/${id}`,
  };
}

const NOW = new Date('2026-04-26T12:00:00Z').getTime();

describe('pickDefault', () => {
  it('returns null for empty list', () => {
    expect(pickDefault([], NOW)).toBeNull();
  });

  it('ignores meetings without date', () => {
    const m = makeMeeting('a', null);
    expect(pickDefault([m], NOW)).toBeNull();
  });

  it('returns most recent past meeting when past meetings exist', () => {
    const meetings = [
      makeMeeting('future', '2026-05-01T10:00:00Z'),
      makeMeeting('old', '2026-04-10T10:00:00Z'),
      makeMeeting('recent-past', '2026-04-24T10:00:00Z'),
    ];
    expect(pickDefault(meetings, NOW)?.id).toBe('recent-past');
  });

  it('returns earliest future meeting when no past meetings exist', () => {
    const meetings = [
      makeMeeting('far-future', '2026-06-01T10:00:00Z'),
      makeMeeting('soon', '2026-04-30T10:00:00Z'),
    ];
    expect(pickDefault(meetings, NOW)?.id).toBe('soon');
  });

  it('treats meetings starting at exactly now as past', () => {
    const meetings = [makeMeeting('exact', '2026-04-26T12:00:00Z')];
    expect(pickDefault(meetings, NOW)?.id).toBe('exact');
  });
});

describe('pickNextMeeting', () => {
  it('returns null when no future meetings', () => {
    const meetings = [makeMeeting('past', '2026-04-10T10:00:00Z')];
    expect(pickNextMeeting(meetings, NOW)).toBeNull();
  });

  it('returns earliest future meeting', () => {
    const meetings = [
      makeMeeting('far', '2026-06-01T10:00:00Z'),
      makeMeeting('soon', '2026-04-30T10:00:00Z'),
      makeMeeting('past', '2026-04-10T10:00:00Z'),
    ];
    expect(pickNextMeeting(meetings, NOW)?.id).toBe('soon');
  });

  it('ignores meetings without date', () => {
    const meetings = [
      makeMeeting('null-date', null),
      makeMeeting('soon', '2026-04-30T10:00:00Z'),
    ];
    expect(pickNextMeeting(meetings, NOW)?.id).toBe('soon');
  });
});
```

- [ ] **Step 2: Correr test, debe fallar**

```bash
npx vitest run lib/meetings/__tests__/select.test.ts
```

Expected: FAIL — `Cannot find module '../select'`.

- [ ] **Step 3: Implementar `lib/meetings/select.ts`**

Create `lib/meetings/select.ts`:

```ts
import type { Meeting } from '@/schemas/meeting';

function withDate(m: Meeting): m is Meeting & { date: string } {
  return m.date !== null;
}

export function pickDefault(meetings: Meeting[], now: number): Meeting | null {
  const dated = meetings.filter(withDate);
  if (dated.length === 0) return null;

  const past = dated
    .filter((m) => new Date(m.date).getTime() <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (past.length > 0) return past[0];

  const future = dated
    .filter((m) => new Date(m.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return future[0] ?? null;
}

export function pickNextMeeting(meetings: Meeting[], now: number): Meeting | null {
  const future = meetings
    .filter(withDate)
    .filter((m) => new Date(m.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return future[0] ?? null;
}
```

- [ ] **Step 4: Correr test, debe pasar**

```bash
npx vitest run lib/meetings/__tests__/select.test.ts
```

Expected: PASS (todos los casos).

- [ ] **Step 5: Commit**

```bash
git add lib/meetings/select.ts lib/meetings/__tests__/select.test.ts
git commit -m "feat(meetings): add pickDefault and pickNextMeeting selection helpers"
```

---

## Task 3: NextMeetingBanner component

**Files:**
- Create: `components/meetings/next-meeting-banner.tsx`

- [ ] **Step 1: Escribir el componente**

Create `components/meetings/next-meeting-banner.tsx`:

```tsx
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';

type Props = { nextMeeting: Meeting };

export function NextMeetingBanner({ nextMeeting }: Props) {
  if (!nextMeeting.date) return null;
  const d = parseISO(nextMeeting.date);
  const time = format(d, "h:mmaaa", { locale: es }).replace(/\s/g, '');
  const day = format(d, "EEEE d 'de' MMMM", { locale: es });

  return (
    <Link
      href={`/reuniones/${nextMeeting.id}`}
      className="flex items-center justify-between gap-3 px-3.5 py-2 mb-5 rounded-md border border-[#c7e6d2] bg-[#eef9f1] text-[#2c5d3f] hover:bg-[#e3f3e7] transition-colors"
    >
      <span className="text-[11.5px] leading-tight">
        <strong className="font-semibold">Próxima reunión</strong>
        <span className="mx-1.5 opacity-60">·</span>
        <span className="capitalize">{day}</span>
        <span className="mx-1.5 opacity-60">·</span>
        {time}
      </span>
      <span className="text-[11px] font-semibold text-[#3f9f5c]">Ver →</span>
    </Link>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS (componente aislado, sin imports rotos).

- [ ] **Step 3: Commit**

```bash
git add components/meetings/next-meeting-banner.tsx
git commit -m "feat(meetings): add NextMeetingBanner component"
```

---

## Task 4: MeetingsEmpty component

**Files:**
- Create: `components/meetings/meetings-empty.tsx`

- [ ] **Step 1: Escribir el componente**

Create `components/meetings/meetings-empty.tsx`:

```tsx
import { CalendarDays } from 'lucide-react';

export function MeetingsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-full bg-[#eeeffc] grid place-items-center mb-5">
        <CalendarDays className="w-6 h-6 text-[#5e6ad2]" />
      </div>
      <h2 className="text-[15px] font-semibold mb-2">Aún no hay reuniones</h2>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed">
        Cuando crees una reunión en Notion para este cliente, aparecerá aquí con su
        agenda, asistentes y action items.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/meetings/meetings-empty.tsx
git commit -m "feat(meetings): add MeetingsEmpty empty state component"
```

---

## Task 5: Refactor HistoryPanel — agrupación por mes y estilo timeline

**Files:**
- Modify: `components/meetings/history-panel.tsx`

- [ ] **Step 1: Reescribir el componente**

Replace entire content of `components/meetings/history-panel.tsx` with:

```tsx
import Link from 'next/link';
import { format, parseISO, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Meeting } from '@/schemas/meeting';
import { cn } from '@/lib/utils';

type Props = { meetings: Meeting[]; currentId?: string };

type MonthGroup = { key: string; label: string; meetings: Meeting[] };

function groupByMonth(meetings: Meeting[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const m of meetings) {
    if (!m.date) continue;
    const d = parseISO(m.date);
    const key = format(d, 'yyyy-MM');
    const label = format(d, 'MMMM yyyy', { locale: es }).toUpperCase();
    if (!groups.has(key)) groups.set(key, { key, label, meetings: [] });
    groups.get(key)!.meetings.push(m);
  }
  return Array.from(groups.values());
}

export function HistoryPanel({ meetings, currentId }: Props) {
  const groups = groupByMonth(meetings);

  return (
    <aside className="border-l border-border bg-[#f7f7f8] overflow-auto">
      <div className="p-5 pb-4">
        <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-[0.04em] px-1">
          Historial
        </h3>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="px-5 pb-3">
          <h4 className="sticky top-0 z-10 bg-[#f7f7f8] text-[10px] font-bold tracking-[0.05em] text-muted-foreground py-2 mb-1.5 border-b border-border">
            {g.label}
          </h4>

          {g.meetings.map((m) => {
            const active = m.id === currentId;
            const d = m.date ? parseISO(m.date) : null;
            const week = d ? getISOWeek(d) : null;

            return (
              <Link
                key={m.id}
                href={`/reuniones/${m.id}`}
                className={cn(
                  'block py-2 pl-3 pr-1 mb-2 border-l-2 transition-colors hover:bg-white/60 rounded-r-sm',
                  active ? 'border-[#5e6ad2] bg-white/40' : 'border-[#e5e5e5]',
                )}
              >
                <div
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-[0.04em]',
                    active ? 'text-[#5e6ad2]' : 'text-muted-foreground',
                  )}
                >
                  {d && format(d, 'MMM d', { locale: es })}
                  {week && ` · Sem ${week}`}
                </div>
                <div className={cn('text-[12px] leading-snug mt-0.5', active ? 'font-semibold' : 'font-medium')}>
                  {m.title}
                </div>
                {m.summary && (
                  <p
                    className={cn(
                      'text-[11px] leading-[1.5] mt-1 line-clamp-3',
                      active ? 'text-[#555]' : 'text-muted-foreground',
                    )}
                  >
                    {m.summary}
                  </p>
                )}
              </Link>
            );
          })}
        </section>
      ))}

      {meetings.length === 0 && (
        <div className="text-[12px] text-muted-foreground text-center p-4">Sin reuniones aún.</div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Verificar visualmente**

```bash
npm run dev
```

Abrir http://localhost:3000/reuniones. Confirmar:
- Sidebar agrupa por mes (`ABRIL 2026`, `MARZO 2026`, etc.)
- Cada item tiene borde izquierdo (violeta si activo, gris si no)
- Summary aparece bajo cada título cuando existe
- Headers de mes son sticky al hacer scroll

- [ ] **Step 4: Commit**

```bash
git add components/meetings/history-panel.tsx
git commit -m "feat(meetings): redesign HistoryPanel with month grouping and timeline style"
```

---

## Task 6: HeroMeeting — Summary y counter de tareas

**Files:**
- Modify: `components/meetings/hero-meeting.tsx`

- [ ] **Step 1: Renderizar `summary` debajo del título**

Edit `components/meetings/hero-meeting.tsx` — entre `<h1>` y la barra de meta (después de la línea `<h1 className="text-[22px]...">{meeting.title}</h1>`), agregar:

```tsx
{meeting.summary && (
  <p className="text-[12.5px] text-muted-foreground leading-[1.55] max-w-[640px] mb-4">
    {meeting.summary}
  </p>
)}
```

- [ ] **Step 2: Cambiar el count de action items**

En `hero-meeting.tsx`, dentro del bloque que renderiza la sección "Tareas de esta reunión", reemplazar:

```tsx
<SectionHead title="Tareas de esta reunión" count={`${actionItems.length} vinculadas`} />
```

por:

```tsx
{(() => {
  const open = actionItems.filter((t) => t.status !== 'Done').length;
  const done = actionItems.length - open;
  const label = `${open} abierta${open === 1 ? '' : 's'} · ${done} hecha${done === 1 ? '' : 's'}`;
  return (
    <SectionHead
      title="Tareas de esta reunión"
      count={label}
      countTone={open > 0 ? 'warn' : 'muted'}
    />
  );
})()}
```

- [ ] **Step 3: Extender `SectionHead` con `countTone`**

En el mismo archivo, reemplazar la función `SectionHead` al final por:

```tsx
function SectionHead({
  title,
  count,
  countTone = 'muted',
}: {
  title: string;
  count?: string;
  countTone?: 'muted' | 'warn';
}) {
  return (
    <div className="flex items-baseline gap-2.5 mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {title}
      </h2>
      {count && (
        <span
          className={cn(
            'text-[12px] font-medium',
            countTone === 'warn' ? 'text-[#b8741d]' : 'text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}
```

Y añadir el import al inicio del archivo si falta:

```tsx
import { cn } from '@/lib/utils';
```

- [ ] **Step 4: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Verificar visualmente**

Refrescar `/reuniones`. Confirmar:
- Aparece un párrafo gris con el summary debajo del título cuando la reunión tiene Summary
- En la sección "Tareas de esta reunión" el count dice `"3 abiertas · 2 hechas"` (en naranja `#b8741d` cuando hay abiertas, gris si todas están hechas)

- [ ] **Step 6: Commit**

```bash
git add components/meetings/hero-meeting.tsx
git commit -m "feat(meetings): show summary in hero and open/done counter on action items"
```

---

## Task 7: Wire `pickDefault` y banner en `app/(app)/reuniones/page.tsx`

**Files:**
- Modify: `app/(app)/reuniones/page.tsx`

- [ ] **Step 1: Reemplazar lógica de selección y agregar banner + empty state**

Replace entire content of `app/(app)/reuniones/page.tsx` with:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { pickDefault, pickNextMeeting } from '@/lib/meetings/select';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';
import { NextMeetingBanner } from '@/components/meetings/next-meeting-banner';
import { MeetingsEmpty } from '@/components/meetings/meetings-empty';

export const dynamic = 'force-dynamic';

export default async function ReunionesPage() {
  const ctx = await requireContext();
  const meetings = await queryMeetingsByCustomer(ctx.customerId);

  const now = Date.now();
  const current = pickDefault(meetings, now);
  const nextMeeting = pickNextMeeting(meetings, now);
  const showBanner =
    current && current.date && new Date(current.date).getTime() <= now && nextMeeting !== null;

  let blocks: any[] = [];
  let actionItems: Task[] = [];
  let membersById = new Map<string, TeamMember>();

  if (current) {
    [blocks, actionItems] = await Promise.all([
      getBlocks(current.id),
      Promise.all(current.taskIds.map(getTask)).then((ts) =>
        ts.filter((t: Task | null): t is Task => t !== null),
      ),
    ]);

    const memberIds = Array.from(
      new Set([...current.teamIds, ...actionItems.flatMap((t) => t.assigneeIds)]),
    );
    const members = await getTeamMembers(memberIds);
    membersById = new Map(members.map((m) => [m.id, m]));
  }

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Reuniones' },
          { label: current?.title ?? 'Sin reuniones', muted: true },
        ]}
      />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          {current ? (
            <>
              {showBanner && nextMeeting && <NextMeetingBanner nextMeeting={nextMeeting} />}
              <HeroMeeting
                meeting={current}
                blocks={blocks}
                actionItems={actionItems}
                membersById={membersById}
              />
            </>
          ) : (
            <MeetingsEmpty />
          )}
        </div>
        <HistoryPanel meetings={meetings} currentId={current?.id} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Verificar visualmente**

Abrir http://localhost:3000/reuniones. Confirmar:
- Si hay reuniones pasadas, abre la más reciente pasada por defecto
- Si hay una próxima futura, aparece banner verde encima del hero
- Si el cliente no tiene reuniones, aparece el empty state centrado
- Si solo hay futuras (no pasadas), abre la próxima futura sin banner

- [ ] **Step 4: Commit**

```bash
git add app/(app)/reuniones/page.tsx
git commit -m "feat(meetings): use pickDefault and show next-meeting banner on /reuniones"
```

---

## Task 8: Wire banner en `[meetingId]/page.tsx`

**Files:**
- Modify: `app/(app)/reuniones/[meetingId]/page.tsx`

- [ ] **Step 1: Calcular next y mostrar banner cuando aplique**

Replace entire content of `app/(app)/reuniones/[meetingId]/page.tsx` with:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByCustomer, getMeeting } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { getTask } from '@/lib/notion/tasks';
import { getTeamMembers } from '@/lib/notion/team';
import { pickNextMeeting } from '@/lib/meetings/select';
import type { Task } from '@/schemas/task';
import { notFound } from 'next/navigation';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';
import { NextMeetingBanner } from '@/components/meetings/next-meeting-banner';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const ctx = await requireContext();
  const { meetingId } = await params;

  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.customerId !== ctx.customerId) notFound();

  const [meetings, blocks, actionItems] = await Promise.all([
    queryMeetingsByCustomer(ctx.customerId),
    getBlocks(meetingId),
    Promise.all(meeting.taskIds.map(getTask)).then((ts) =>
      ts.filter((t: Task | null): t is Task => t !== null),
    ),
  ]);

  const memberIds = Array.from(
    new Set([...meeting.teamIds, ...actionItems.flatMap((t) => t.assigneeIds)]),
  );
  const members = await getTeamMembers(memberIds);
  const membersById = new Map(members.map((m) => [m.id, m]));

  const now = Date.now();
  const nextMeeting = pickNextMeeting(meetings, now);
  const isPast = meeting.date ? new Date(meeting.date).getTime() <= now : false;
  const showBanner = isPast && nextMeeting && nextMeeting.id !== meeting.id;

  return (
    <>
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: meeting.title, muted: true }]} />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          {showBanner && nextMeeting && <NextMeetingBanner nextMeeting={nextMeeting} />}
          <HeroMeeting
            meeting={meeting}
            blocks={blocks}
            actionItems={actionItems}
            membersById={membersById}
          />
        </div>
        <HistoryPanel meetings={meetings} currentId={meeting.id} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Verificar visualmente**

Click una reunión pasada en el sidebar. Confirmar:
- El banner verde "Próxima reunión" aparece arriba si hay próxima futura
- Si entras a la próxima futura, el banner NO aparece (porque `nextMeeting.id === meeting.id`)

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/reuniones/[meetingId]/page.tsx"
git commit -m "feat(meetings): show next-meeting banner on detail page"
```

---

## Task 9: Ajustar skeleton de loading

**Files:**
- Modify: `app/(app)/reuniones/loading.tsx`

- [ ] **Step 1: Actualizar skeleton al nuevo layout del sidebar**

Replace entire content of `app/(app)/reuniones/loading.tsx` with:

```tsx
import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: 'Cargando…', muted: true }]} />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7">
          <div className="rounded-xl border border-[#dfe1f2] bg-gradient-to-b from-[#fbfcff] to-white p-6 mb-7 space-y-3">
            <div className="h-4 w-56 bg-[#eeeffc] rounded animate-pulse" />
            <div className="h-6 w-80 bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-3 w-[60%] bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-3 w-[45%] bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-12 w-full bg-[#f7f7f8] rounded animate-pulse mt-4" />
            <div className="flex gap-2">
              <div className="h-8 w-28 bg-[#5e6ad2]/30 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-24 bg-[#f7f7f8] rounded animate-pulse" />
            <div className="border border-border rounded-lg bg-white p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 bg-[#f7f7f8] rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <aside className="border-l border-border bg-[#f7f7f8] p-5 space-y-4">
          <div className="h-3 w-20 bg-[#e5e5e5] rounded animate-pulse" />
          {[0, 1].map((g) => (
            <div key={g} className="space-y-2.5">
              <div className="h-2.5 w-16 bg-[#e5e5e5] rounded animate-pulse" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="pl-3 border-l-2 border-[#e5e5e5] py-1 space-y-1.5">
                  <div className="h-2.5 w-20 bg-[#e5e5e5] rounded animate-pulse" />
                  <div className="h-3 w-[80%] bg-[#e5e5e5] rounded animate-pulse" />
                  <div className="h-2.5 w-[95%] bg-[#eee] rounded animate-pulse" />
                  <div className="h-2.5 w-[70%] bg-[#eee] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/reuniones/loading.tsx
git commit -m "feat(meetings): update loading skeleton to match new sidebar layout"
```

---

## Task 10: Validación final

- [ ] **Step 1: Correr toda la suite de tests**

```bash
npm run test:run
```

Expected: PASS — todos los tests verdes (incluye los nuevos de `select.ts` y los extendidos de `meetings.ts`).

- [ ] **Step 2: Typecheck completo**

```bash
npm run typecheck
```

Expected: PASS sin errores.

- [ ] **Step 3: Lint (si está configurado)**

```bash
npm run lint 2>&1 || true
```

Expected: PASS o sin issues nuevos.

- [ ] **Step 4: Smoke test manual end-to-end**

Con `npm run dev` corriendo, abrir http://localhost:3000/reuniones y verificar:

1. Por defecto carga la última reunión pasada (si existe).
2. Banner verde "Próxima reunión" arriba del hero cuando hay una futura.
3. Summary del meeting aparece debajo del título en hero.
4. Counter "X abiertas · Y hechas" aparece (en naranja si hay abiertas).
5. Sidebar agrupa por mes con headers sticky `ABRIL 2026`, etc.
6. Items del sidebar tienen borde izquierdo violeta (activo) o gris (resto), summary truncado a 3 líneas.
7. Click en una reunión pasada del sidebar muestra banner si hay próxima futura.
8. Click en una reunión futura no muestra banner.
9. Cliente sin reuniones muestra el empty state.

- [ ] **Step 5: No hay commit aquí — la tarea es solo validación.**

---

## Notas de implementación

- **No tocar `queryMeetingsByCustomer`**: ya devuelve `descending` por `Date`, eso se respeta.
- **Tipo de propiedad `Summary` en Notion**: el plan asume `rich_text`. Si Dani la creó como `text` simple es lo mismo (rich_text es la forma genérica). Si por alguna razón es `formula` o `select`, ajustar el parser en Task 1 step 4.
- **Locale `es` en date-fns**: ya se usa en otros componentes; importar de `date-fns/locale` sin instalar nada nuevo.
- **Tailwind colors**: se mantiene la paleta existente del archivo (`#5e6ad2`, `#eef9f1`, `#b8741d`, etc.).
- **Tests del componente HistoryPanel**: no hay test unitario nuevo — la verificación es visual en Task 5 step 3. La función pura `groupByMonth` está embebida en el componente; si quisieras testearla habría que extraerla, pero queda fuera de scope para esta iteración.

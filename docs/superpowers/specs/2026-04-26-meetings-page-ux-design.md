# Rediseño UX de `/reuniones`

**Fecha:** 2026-04-26
**Owner:** Dani
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

La página `/reuniones` muestra reuniones del cliente activo con un layout de dos columnas: hero a la izquierda (1fr) e historial a la derecha (280px). Al revisar el flujo identificamos cuatro problemas:

1. **Selección por defecto opaca.** La lógica actual prioriza "current or next" (live > futura dentro de 24h > más cercana por distancia absoluta). Cuando hay una reunión pasada y otra futura, el orden secundario puede abrir ayer en vez de mañana.
2. **Historial plano.** Lista sin agrupación temporal y sin contexto del contenido de cada reunión: solo fecha + título.
3. **Campo `Summary` sin uso.** Se agregó la propiedad `Summary` al database de Notion pero no está modelada en el schema ni se renderiza en ninguna parte.
4. **Empty state pobre.** Cuando un cliente no tiene reuniones, solo aparece un párrafo gris.

## Objetivo

Convertir `/reuniones` en una vista calmada y escaneable que privilegie la revisión post-reunión: abre por defecto la última reunión pasada y deja el historial leíble como una línea de tiempo con contexto inmediato.

## Alcance

**Incluido:**
- Schema y parser de Notion para el campo `Summary`
- Lógica nueva de selección por defecto
- Sidebar con agrupación por mes y estilo timeline mostrando summary
- Summary en el hero
- Banner "Próxima reunión" en main column cuando se ve una pasada
- Counter "X abiertas · Y hechas" en la sección de action items
- Empty state mejorado

**No incluido (anotado para futuro):**
- Filtros y búsqueda en historial
- Indicador "en vivo" en items del sidebar
- Tipo de reunión como chip en historial
- Separador hoy/próximas/pasadas
- Botón "+ Agregar action item" inline
- Render de `projectIds` y `wikiIds`
- Resaltar action items vencidos con borde rojo

## Diseño

### Selección por defecto del hero

**Regla:** la última reunión cuya fecha ya pasó. Si no hay reuniones pasadas, la próxima futura.

```ts
function pickDefault(meetings: Meeting[], now: number): Meeting | null {
  const dated = meetings.filter((m) => m.date);
  if (dated.length === 0) return null;
  const past = dated
    .filter((m) => new Date(m.date!).getTime() <= now)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
  if (past.length > 0) return past[0];
  const future = dated
    .filter((m) => new Date(m.date!).getTime() > now)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  return future[0] ?? null;
}
```

Reemplaza la lógica `currentOrNext` actual en `app/(app)/reuniones/page.tsx`. La detección de live (`isLive`) sigue funcionando independientemente para mostrar el badge cuando aplica.

### Schema: agregar `summary`

`schemas/meeting.ts`:
```ts
export const meetingSchema = z.object({
  // ...campos existentes
  summary: z.string().nullable(),
});
```

`lib/notion/meetings.ts`, dentro de `parseMeeting`:
```ts
summary:
  (p.Summary?.rich_text ?? [])
    .map((t: { plain_text: string }) => t.plain_text)
    .join('')
    .trim() || null,
```

(Si la propiedad real en Notion no es `rich_text`, ajustar al tipo correcto durante implementación.)

### Sidebar (HistoryPanel) — timeline con summary, agrupado por mes

Cambios en `components/meetings/history-panel.tsx`:

- Agrupar `meetings` por mes calendario (YYYY-MM) preservando el orden DESC. Header por grupo con etiqueta tipo `ABRIL 2026` (`format(d, 'MMMM yyyy', { locale: es }).toUpperCase()`), sticky con `top-0` y fondo `#f7f7f8`.
- Cada item es un bloque con borde izquierdo de 2px:
  - Activa: borde `#5e6ad2`, label de fecha en violeta, summary `#555`
  - Resto: borde `#e5e5e5`, label en gris, summary `#888`
- Estructura del item:
  - Línea 1: `MMM d · Sem W` (uppercase, font-size 9px, weight 600)
  - Línea 2: título (12px, weight 500–600 según activo)
  - Línea 3: summary `line-height: 1.5`, font-size 10px (sin clamp; si es muy largo se trunca con `line-clamp-3` para evitar items gigantes)
- Sin `padding` ni `bg` exterior — el contraste viene del borde izquierdo, no de fondo blanco.

Nota: el sidebar no llevará counter de tareas abiertas (lo dejamos fuera del scope de esta iteración para no complicar el query — solo lo mostramos en el hero).

### Hero (HeroMeeting) — Summary debajo del título

En `components/meetings/hero-meeting.tsx`, después del `h1` y antes del bloque de meta blanco:

```tsx
{meeting.summary && (
  <p className="text-[12px] text-muted-foreground leading-[1.5] max-w-[600px] mb-3.5">
    {meeting.summary}
  </p>
)}
```

### Action items — counter "X abiertas · Y hechas"

En el `<SectionHead>` de la sección "Tareas de esta reunión", reemplazar `count` actual (`${actionItems.length} vinculadas`) por:

```tsx
const open = actionItems.filter((t) => t.status !== 'Done').length;
const done = actionItems.length - open;
const label = `${open} abierta${open === 1 ? '' : 's'} · ${done} hecha${done === 1 ? '' : 's'}`;
```

Color del span: `text-[#b8741d]` si `open > 0`, si no `text-muted-foreground`.

### Banner "Próxima reunión"

Nuevo componente `components/meetings/next-meeting-banner.tsx`:

- Server component, recibe `nextMeeting: Meeting | null`
- Solo se renderiza si la reunión actualmente mostrada es pasada **y** existe una próxima futura
- Estilo: fondo `#eef9f1`, borde `#c7e6d2`, texto `#2c5d3f`, font-size 11px
- Click → `Link` a `/reuniones/${nextMeeting.id}`

`page.tsx` calcula `nextMeeting` (primera futura por fecha asc) en el server y se pasa al main column. La página de detalle (`[meetingId]/page.tsx`) hace lo mismo.

### Empty state

Nuevo componente `components/meetings/meetings-empty.tsx`:
- Centrado en el main column
- Ícono sutil (Lucide `CalendarDays` con opacidad)
- Título: "Aún no hay reuniones"
- Copy: "Cuando crees una reunión en Notion para este cliente, aparecerá aquí con su agenda y action items."
- Link secundario al template/database de Notion (URL desde env si existe, si no se omite)

## Componentes afectados

| Archivo | Cambio |
| --- | --- |
| `schemas/meeting.ts` | Añadir `summary` |
| `lib/notion/meetings.ts` | Parser de `Summary` |
| `app/(app)/reuniones/page.tsx` | Nueva lógica de default; pasar `nextMeeting`; usar empty state |
| `app/(app)/reuniones/[meetingId]/page.tsx` | Pasar `nextMeeting` al banner |
| `components/meetings/hero-meeting.tsx` | Render de `summary`; counter "X abiertas · Y hechas" |
| `components/meetings/history-panel.tsx` | Agrupación por mes + estilo timeline + summary |
| `components/meetings/next-meeting-banner.tsx` | **Nuevo** |
| `components/meetings/meetings-empty.tsx` | **Nuevo** |
| `app/(app)/reuniones/loading.tsx` | Ajustar skeleton para nuevos estilos |

## Datos y rendimiento

- El query a Notion ya carga todas las reuniones del cliente; agregar `Summary` al parse no añade requests.
- La lógica de default (`pickDefault`) y la de `nextMeeting` se ejecutan en server sobre el array ya cargado — O(n log n) por sort, n esperado <100.
- Agrupación por mes en sidebar: O(n), client-safe ya que `HistoryPanel` recibe `meetings: Meeting[]` ordenadas DESC.

## Riesgos / Edge cases

- **Summary largo:** clamp con `line-clamp-3` en sidebar y `max-w-[600px]` natural en hero. Si Notion devuelve summaries de párrafos largos, ambos quedan acotados.
- **Sin summary:** todos los renders son condicionales (`meeting.summary && ...`); si es null se omite la línea sin colapsar el layout.
- **Tipo de propiedad en Notion:** asumimos `rich_text`. Si es `select` o `formula` el parser cambia; verificar al tocar `parseMeeting`.
- **Banner próxima en detalle:** si abro una reunión pasada vieja desde el historial, el banner muestra la próxima absoluta — no la siguiente respecto a la que estoy viendo. Es intencional (la "próxima" es siempre la más cercana al ahora).
- **Mes con cero reuniones intermedio:** no se renderiza header (solo se agrupan los meses que tienen items).
- **Locale del header de mes:** `format(d, 'MMMM yyyy', { locale: es })` devuelve `"abril 2026"` — aplicamos `.toUpperCase()` para `"ABRIL 2026"`.

## Testing

- Unit: `pickDefault` con varios escenarios (solo pasadas, solo futuras, mezcla, vacío).
- Visual/manual: revisar `/reuniones` con cliente sin reuniones, con una sola, con varias en el mismo mes y en meses distintos.

## Decisiones explícitas y trade-offs

- **Counter de tareas pendientes solo en hero, no en sidebar:** evita un round-trip de N queries adicionales (uno por reunión) o un cambio mayor al fetch. Si quisiéramos llevarlo al sidebar, requeriría cargar `taskIds` resueltos por reunión — fuera de scope.
- **Summary en todos los items vs. solo en activa:** el usuario eligió "en todos" porque facilita la decisión de a cuál clicar sin tener que abrir cada una.
- **Sin filtros ni búsqueda:** el caso de uso actual no tiene historiales largos. Se reabren si el volumen crece.

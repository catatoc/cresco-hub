# Portal del cliente · Reunión editorial — diseño

**Fecha**: 2026-06-10 · **Estado**: aprobado por Carlos (brainstorm con mockups en `.superpowers/brainstorm/36084-1781074340/`)

## Qué

Cuando el cliente abre una reunión desde "Tus reuniones" en el portal, ve una **página editorial** propia (mockup C elegido): un acta con aire, lede destacado y los acuerdos como checklist viva, con el look & feel crescō (tokens de `cresco-design`).

## Rutas y navegación

- `/portal/reuniones/[id]` — la página editorial de la reunión.
- `/portal/reuniones` — índice con todas las reuniones del cliente, por fecha descendente.
- Home del portal: cada card de "Tus reuniones" navega a la página (cursor pointer + hover). Se elimina el expandible inline (`cp-more` / `expanded`). El header de la sección gana "ver todas →" hacia el índice.

## Capa de datos — `lib/portal/meeting.ts`

Aislada y defensiva como `lib/portal/data.ts` (sin zod estrictos; si Notion cambia algo, el portal no se cae).

### Gate de seguridad

`loadPortalMeeting(ctx, meetingId)` solo devuelve la reunión si la relación `Customer` contiene `ctx.customerId`. Si no (o el id no existe), devuelve `null` → la página hace `notFound()`. Mismo principio de frontera que el resto del portal.

### Contenido del acta (decisión: acta automática completa)

Se renderizan los bloques top-level de la página de Notion con estas reglas:

- **Excluir siempre** el bloque `transcription` (la transcripción cruda jamás se expone).
- **Excluir la sección "Acciones"** del acta (heading cuyo texto normalizado sea "acciones" / "action items" y todos los bloques que le siguen hasta el próximo heading del mismo nivel o el final) — es texto interno sobre Refining/triage; la reemplazan los acuerdos reales.
- Tipos soportados: `heading_2`, `heading_3`, `paragraph`, `bulleted_list_item`, `numbered_list_item`. Otros tipos se ignoran sin romper.
- Modelo de render simple: `{ kind: 'h2' | 'h3' | 'p' | 'li' | 'oli', text: string }[]`.

### Acuerdos

Las Tasks de la relación `Tasks` de la reunión, **filtradas a `Customer = ctx.customerId`**, con estado real (`parseTaskRow` reutilizado o equivalente). Las asignadas al miembro logueado (`mine`) son marcables reusando el server action `toggleMyTask`; el resto solo lectura.

### Fecha y hora

Label "lunes 8 de junio · 8:30 pm" respetando el huso horario con el que se guardó en Notion (parsear el offset del ISO, no el tz del navegador). Si la fecha no trae hora, solo "lunes 8 de junio".

### Índice

`loadPortalMeetings(ctx)`: reuniones con `Customer = ctx.customerId` (las que el miembro asistió primero, igual que el home), con título, dateLabel, summary corto y asistentes.

## UI

- `app/(portal)/portal/reuniones/page.tsx` y `[id]/page.tsx` — server components `force-dynamic`, componen client components.
- `components/portal/meeting-page.tsx` y `meetings-index.tsx` — estilos `cp-*` nuevos en `portal.css` (namespace intacto).
- Página editorial: "← Volver a tu portal" + wordmark, pill `tipo · fecha · hora`, título grande (clamp ~30px, tracking -.04em), avatares + nombres, lede con borde moss (primer párrafo del resumen ejecutivo), temas clave como bullets moss, acuerdos como checklist con pills de estado. Montañas suaves al fondo, rises escalonados (`cp-rb`).
- **Estados vacíos**: sin acta → encabezado completo + "El resumen llega después de la reunión." Sin acuerdos → la sección se omite.

## Fuera de alcance

Navegación prev/next entre reuniones, búsqueda en el índice, attachments/grabaciones.

## Tests

- Parseo de bloques: exclusión de `transcription` y de la sección "Acciones"; tipos no soportados ignorados.
- Gate por customer: reunión de otro customer → null.
- Label de fecha: con hora (offset respetado), sin hora, sin fecha.
- Render básico de la página (título, lede, acuerdos).

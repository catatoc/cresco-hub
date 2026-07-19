# Puente bidireccional Error Tracking ⇄ Notion

> Plan de implementación · fase por fase
> Estado: **diseño aprobado**, pendiente de implementar
> Autor del diseño: conversación con Claude · Fecha: 2026-06-20

---

## 1. Objetivo

Reflejar los issues de **error tracking** (PostHog hoy, Sentry mañana) en el tablero de
Notion como **Tasks tipo 🐛 Bug**, para **contar y reportar** — cuántos bugs, cuánto
esfuerzo, en qué sprint, por cliente — junto al resto del trabajo. El estado
*abierto/cerrado* se mantiene **sincronizado en los dos sentidos**.

**Notion es el tablero de reporting, no la herramienta de incidentes.** Los errores se
siguen depurando en PostHog/Sentry y en el código; Notion solo es donde se cuentan y se
ven las métricas. El detalle profundo (stack trace, sesiones) vive en el proveedor — en
Notion guardamos un resumen liviano + un link directo.

Diseñado **multi-tenant desde el día 1** (somos software factory: muchos proyectos, cada
uno con su fuente de errores) y para **escalar a Sentry sin tocar el motor**.

---

## 2. Decisiones cerradas

| # | Decisión | Resultado |
|---|----------|-----------|
| Puente | Dónde vive | **Route en notion-hub**, disparado por cron de la plataforma |
| Mecanismo | Cómo sincroniza | **Reconcile programado** (sin webhooks en v1), idempotente |
| Modelo | Dónde caen los bugs | **Reusar la Tasks DB**, type 🐛 Bug + propiedades genéricas `External *` |
| Filtro | Evitar ruido | En el reconcile: umbral por fuente (ej. `occurrences ≥ 3`) |
| Estado | Quién manda | `Status` interno manda el tablero; `External Status` es espejo de solo-lectura |
| Cierre | Qué es "cerrado" | `Done` = resolved · `Archived` = suppressed |
| Conflicto | Si ambos cambian | 3-way merge; **cerrar gana** |
| Reaparición | Bug que vuelve | **Reabrir** la Task (Done → Not Started) + comentario |
| Multi-tenant | Config por proyecto | **Registry en Supabase** (no env vars) |
| Secretos | API keys de clientes | **Supabase Vault** (root key gestionada por Supabase) |

---

## 3. Arquitectura

```
Supabase Cron · pg_cron + pg_net (cada ~10 min)
        │  net.http_get(...)  ── fire-and-forget; el CRON_SECRET se lee de Vault
        ▼
GET /api/cron/error-sync                 ← protegido con CRON_SECRET
        │
   integration_sources (enabled)         ← registry en Supabase
        │
   for each source (en paralelo, con cap):
        │
     pg_try_advisory_lock(hash(source.id))   ← single-flight POR FUENTE
        │
     reconcile(source)
       ├─ credenciales ← Supabase Vault (decrypted_secrets, solo server)
       ├─ adapter.listIssues(since)   → API del proveedor (issues + status + counts)
       ├─ notion.listBugs(source)     → Tasks DB filtrado por External Source
       ├─ casa por External Key = "<provider>:<projectId>:<issueId>"
       ├─ aplica filtro de ruido (umbral de la fuente)
       ├─ 3-way merge sobre el bit abierto/cerrado
       └─ escribe: crea / actualiza Notion · resolve/suppress en el proveedor
        │
     libera lock
```

**Throttle global del lado Notion**: hay UN solo workspace, así que el límite de ~3 req/s
de Notion lo comparten todas las fuentes → cola/limiter global compartido. PostHog/Sentry
escalan trivial; **Notion es el cuello de botella a cuidar.** Procesar solo *deltas*
(cambios desde `last_synced_at`) mantiene cada corrida chica.

---

## 4. Modelo de datos

### 4.1 Propiedades en la Tasks DB

**Ya existen — se reutilizan, no se crean:**

| Propiedad existente | Tipo | Uso |
|---|---|---|
| `Source` | relation → **Providers** DB | a qué provider pertenece (PostHog/Sentry = fila en Providers) |
| `Error Message` | text | el mensaje/`description` del issue |
| `Type` | select | se fija en `🐛 Bug` |
| `Status` | status | estado interno que manda (Done/Archived = cerrado) |

**Nuevas, genéricas** (`External *`, **nunca** `PostHog *` → Sentry reusa las mismas):

| Propiedad nueva | Tipo | Rol |
|---|---|---|
| `External Key` | text · único | dedupe → `posthog:94699:<issueId>` |
| `External URL` | url | link al issue real (detalle profundo) |
| `External Status` | select | status crudo del proveedor (espejo) |
| `External Count` | number | occurrences / volumen |
| `External Last Seen` | date | última actividad |
| `Last Synced Status` | text | snapshot del bit abierto/cerrado (3-way merge) |
| `Environment` | multi-select | ambientes donde aparece el bug (production/dev/staging), derivados del host de la URL — un bug puede tener varios; `[dev]` en el título solo si es dev-only |

> **Hallazgo del workspace vivo**: la Tasks DB ya traía `Source` (relación a una DB
> **Providers** con `Category` = "Error Tracking", `Status` Active/Evaluating/Inactive) y
> `Error Message`. El concepto ya estaba sembrado → lo reusamos en vez de duplicar.
> Pasamos de **7 props nuevas a 6**, y PostHog/Sentry son **filas en Providers**, no un select.

Al crear la Task: `Type = 🐛 Bug`, **ícono de página 🐛**, título = `bug(<provider>): {name} — {description}`,
`Source` → la fila del provider en Providers, relación a **Project/Customer** (de la fila del
registry), y cuerpo con: un callout 🐛 (estado, librería, archivo, ocurrencias·usuarios·sesiones,
fechas limpias), un callout 📍 **contexto** (url donde ocurrió, entorno browser·os, manejado/sin
manejar, top frame — vía `adapter.getIssueContext()` que jala 1 evento de muestra con HogQL), y
un párrafo con **"🔗 Abrir en PostHog"** + **"▶️ Session replay"** clickeables. **Nunca** stack
traces completos — para eso el link.

### 4.2 Tablas nuevas en Supabase (el registry)

```sql
-- una fila por cuenta/org de proveedor; el secreto vive en Vault
create table integration_credentials (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null check (provider in ('posthog','sentry')),
  host              text not null,            -- us.posthog.com (no es secreto)
  vault_secret_name text not null,            -- puntero → vault.secrets
  created_at        timestamptz default now()
);

-- una fila por proyecto conectado (crece insertando, no con deploys)
create table integration_sources (
  id                  uuid primary key default gen_random_uuid(),
  credential_id       uuid not null references integration_credentials(id),
  external_project_id text not null,          -- 94699, el de Sentry, …
  notion_project_id   text,                   -- linkea el bug a SU proyecto
  notion_customer_id  text,
  notion_provider_id  text,                   -- fila en Providers DB → para el Source relation
  min_occurrences     int  not null default 3, -- filtro de ruido por cliente
  enabled             boolean not null default true,
  last_synced_at      timestamptz,
  created_at          timestamptz default now()
);
```

**Secretos con Supabase Vault** (no pgcrypto, no `ENCRYPTION_KEY` en env):

```sql
-- guardar (la root key la gestiona Supabase, fuera de la DB y del entorno)
select vault.create_secret('phx_…', 'posthog_cred_<id>', 'PostHog key · org catatoc');

-- leer SOLO server-side con service role, al instanciar el adapter
select decrypted_secret from vault.decrypted_secrets where name = 'posthog_cred_<id>';
```

Reglas: el schema `vault` no se expone por PostREST/anon; `select` sobre
`vault.decrypted_secrets` restringido al service role; la api_key nunca toca Notion, logs
ni el browser.

---

## 5. Mapeo de estado (el corazón del bidireccional)

```
Proyección abierto/cerrado:
  PostHog open   = active | pending_release
  PostHog closed = resolved | suppressed | archived
  Notion  open   = (cualquiera salvo Done/Archived)
  Notion  closed = Done | Archived

Traducción en el borde (solo abierto↔cerrado; estados intermedios intactos):
  PostHog resolved    → Notion Status = Done
  PostHog suppressed  → Notion Status = Archived
  PostHog reopen sobre Task Done → Notion = Not Started + comentario "reapareció {fecha}"
  Notion Done         → proveedor resolve
  Notion Archived     → proveedor suppress
```

**3-way merge** — comparo el bit actual de cada lado contra `Last Synced Status`:

- cambió **solo** PostHog → PostHog manda
- cambió **solo** Notion → Notion manda
- cambiaron **ambos** → **cerrar gana** (regla determinista)

Así dos corridas en cualquier orden **convergen**. El reconcile es idempotente: correr de
más = no-op. Nunca toca `In Progress` / `Testing` — solo el cierre/apertura.

---

## 6. Archivos a crear

```
lib/integrations/error-tracking/
  types.ts             # NormalizedIssue, ProviderAdapter (interface)
  posthog-adapter.ts   # listIssues() + resolveIssue() vía PostHog query/REST — Fase 2 ✅
  status-map.ts        # proyección open/closed + 3-way merge + regla reabrir
  notion-bugs.ts       # find/create/update Bug task — Fase 3 ✅
  rate-limit.ts        # limiter global del lado Notion — Fase 3 ✅
  reconcile.ts         # motor: orquesta adapter ⇄ notion, aplica filtro
  filter.ts            # umbral de ruido (por fuente)
  registry.ts          # lee integration_sources + desencripta credenciales (Vault) — Fase 1 ✅
lib/supabase/
  service.ts           # cliente service-role (server-only) — Fase 1 ✅
  locks.ts             # pg_try_advisory_lock helper
app/api/cron/error-sync/
  route.ts             # entrypoint: valida CRON_SECRET, loop sobre fuentes
schemas/integrations/
  error-issue.ts       # zod de NormalizedIssue
supabase/migrations/
  XXXX_error_tracking_registry.sql  # tablas registry + Vault + cron.schedule (pg_cron/pg_net)
```

La interfaz que hace todo escalable:

```ts
interface ProviderAdapter {
  source: 'posthog' | 'sentry';
  listIssues(since: Date): Promise<NormalizedIssue[]>;
  resolveIssue(externalId: string, status: 'resolved' | 'suppressed'): Promise<void>;
}

interface NormalizedIssue {
  externalId: string;        // issue id del proveedor
  source: 'posthog' | 'sentry';
  externalProjectId: string;
  name: string;              // DOMException, TypeError, Error…
  description: string;       // el mensaje
  status: string;            // crudo del proveedor
  occurrences: number;
  users: number;
  library: string | null;
  sourceFile: string | null;
  firstSeen: string;
  lastSeen: string;
  url: string;               // _posthogUrl
}
```

---

## 7. Forma real del issue (verificada vía MCP, proyecto Amedi 94699)

```
id · name · description · status (active|resolved|suppressed|pending_release|archived)
first_seen · last_seen · library (web|posthog-node) · source (archivo)
assignee · aggregations{ occurrences, sessions, users } · _posthogUrl
```

APIs PostHog en producción (no MCP):
- **Listar** — query API de error tracking (issues + status + counts + url).
- **Resolver** — `error-tracking-issues-partial-update` → `PATCH …/error_tracking/issues/:id { status }`.
- Personal API key scope `error_tracking:read` + `error_tracking:write`.

> ⚠️ **Hallazgo de los datos reales**: de 7 issues, ~5 eran ruido benigno
> (`DOMException: Lock was stolen` con 69 ocurrencias, `Script error.`, `Load failed`).
> Por eso el **filtro de ruido es obligatorio**, no opcional.

---

## 8. Variables de entorno (solo lo global y fijo)

| Env | Para qué |
|-----|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | leer registry + Vault server-side |
| `NOTION_API_KEY` | tu workspace (uno solo) |
| `CRON_SECRET` | protege el route (notion-hub lo lee de env; el job pg_cron lo envía desde **Vault** — mismo valor) |
| IDs de las 6 props nuevas de Notion | (o por nombre) |

Todo lo demás —API keys de clientes, projectIds, mapeos a Notion, umbrales— vive en el
**registry de Supabase** y crece **insertando filas**, no editando entorno.
Onboarding de un cliente nuevo = `INSERT`, cero deploy. (`ENCRYPTION_KEY` ya **no** existe:
lo gestiona Vault.)

---

## 9. Fases de implementación

### Fase 1 — Schema + registry
- Crear las **6 propiedades nuevas** (`External *`) en la Tasks DB; **reusar** `Source` (→ Providers) + `Error Message`.
- Las filas **PostHog** (`5df37376-a170-4e62-a29d-032971b39ff7`) y **Sentry**
  (`3217c770-5223-4d11-96da-86636727f0f5`) **ya existen** en Providers — el seed solo
  referencia su id en `integration_sources.notion_provider_id`.
- Crear tablas `integration_credentials` + `integration_sources` en Supabase.
- Habilitar Supabase Vault; guardar la key de PostHog (Amedi) como primer secret.
- Seed: una fila de `integration_sources` para Amedi (project 94699 → su Project en Notion).
- `schemas/integrations/error-issue.ts` (zod de `NormalizedIssue`).
- **Aceptación**: registry leíble desde el server; secret desencriptable solo con service role.

### Fase 2 — Adapter PostHog ✅
- `posthog-adapter.ts`: `listIssues(since)` vía la **query API** (`ErrorTrackingQuery`) + `resolveIssue(id, status)` vía el REST de error_tracking.
- Gotchas descubiertos contra la API real: **`volumeResolution` debe ser ≥ 1** (el `0` revienta con división por cero); `occurrences`/`users` vienen como float → se redondean; status desconocido → default `active`.
- **Aceptación cumplida**: smoke en vivo contra el proyecto 94699 devolvió los 7 issues reales normalizados; 4 unit tests con el shape real. Falta probar `resolveIssue` con un issue real (necesita `error_tracking:write`, ya en la key).

### Fase 3 — Upsert a Notion ✅
- `notion-bugs.ts`: `findBugByExternalKey` / `listBugTasks` (prefix) / `createBugTask` (Type 🐛 Bug, External*, `Source`→Provider, `Customer`, resumen en callout) / `updateBugMirror` (counts + status + last seen, **nunca** el Status interno).
- `rate-limit.ts`: limiter serializado con intervalo mínimo (reloj inyectable) — un solo workspace Notion ⇒ limiter compartido.
- **Aceptación**: primitivas testeadas (8 tests). La idempotencia (find-by-key → update vs. create) se cablea en el reconcile (Fase 4); ahí va el demo end-to-end vivo, tras correr el SQL.

### Fase 4 — Motor reconcile + status-map
- `status-map.ts`: proyección abierto/cerrado, 3-way merge, regla de reabrir.
- `filter.ts`: umbral por fuente.
- `reconcile.ts`: orquesta adapter ⇄ Notion para una fuente.
- **Aceptación**: los 4 casos del merge (solo-A, solo-B, ambos, reaparición) pasan en test.

### Fase 5 — Lock + cron + multi-fuente ✅
- `locks.ts`: **lease lock** por `source.id` (columna `locked_until` + RPCs), **no** advisory
  locks — el pooler transaccional de Supabase no preserva advisory locks de sesión entre
  llamadas RPC; el lease además se auto-expira si una corrida crashea.
- `route.ts` (`app/api/cron/error-sync`): valida `CRON_SECRET`, recorre fuentes bajo lock,
  aísla fallos por-fuente. Exento del middleware de auth (como `/api/portal`).
- **Verificado EN VIVO** (proyecto Amedi 94699): 1ª corrida `created: 3, skippedNoise: 4`;
  2ª corrida `created: 0, updated: 3` (idempotente, sin duplicar). Stack completo real:
  Supabase registry+Vault → PostHog → filtro → Notion.
- Gotchas operativos descubiertos: (1) `/api/cron` debe exentarse del middleware; (2) la
  integración de Notion del app debe tener **Providers** y **Customers** compartidos (la
  Tasks DB ya lo estaba); (3) correr las RPCs de lock (PART C del seed) en Supabase.
- **Scheduler = Supabase Cron** (`pg_cron` + `pg_net`), no cron de plataforma. El job
  hace `net.http_get` al route cada ~10 min (fire-and-forget) y lee el `CRON_SECRET` del
  **mismo Vault** donde viven las keys:
  ```sql
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  select cron.schedule('error-sync', '*/10 * * * *', $$
    select net.http_get(
      url     := 'https://portal.cresco.so/api/cron/error-sync',
      headers := jsonb_build_object('Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
    );
  $$);
  ```
  > pg_net es fire-and-forget → el job no se solapa, pero el route sí podría redispararse;
  > por eso el **advisory lock por-fuente sigue siendo obligatorio** (capas distintas:
  > reloj vs. trabajador).
- **Aceptación**: dos corridas solapadas no se pisan; varias fuentes sincronizan en paralelo.

### Fase 6 — Tests + endurecimiento
- Dedupe, conflicto (ambos cambian), reaparición, filtro de ruido, idempotencia (2x = no-op), rate limit.
- Manejo de errores: una fuente que falla no tumba al resto; `last_synced_at` solo avanza en éxito.
- **Aceptación**: suite verde; corrida real Amedi → bugs en el tablero, estados consistentes ambos sentidos.

---

## 10. Edge cases cubiertos

- **Doble corrida** → lock por-fuente + upsert idempotente.
- **Cambio humano pisado** → 3-way merge respeta estados intermedios.
- **Ruido benigno** → filtro por umbral por fuente.
- **Bug reaparece** → reabre (Done → Not Started) + comentario.
- **Rate limit Notion** → throttle global + solo deltas.
- **Una fuente cae** → aislada; el resto sigue; su `last_synced_at` no avanza.
- **Colisión de IDs entre clientes** → `External Key` con namespace `provider:projectId:issueId`.

---

## 11. Escalar a Sentry (después, ~medio día)

1. `SentryAdapter implements ProviderAdapter` (su `listIssues` + `resolveIssue`).
2. Agregar `Sentry` al select `External Source` y al `check` del registry.
3. Insertar `integration_credentials` (Vault) + `integration_sources` del proyecto Sentry.

**Cero** cambios en `reconcile.ts`, `notion-bugs.ts`, `status-map.ts`, el schema de Notion
o el cron. Esa es toda la gracia del patrón de adaptadores + registry.

---

## 12. Fuera de alcance (consciente)

- Fusionar "el mismo bug en PostHog y Sentry" en una sola Task (cross-provider dedup) — un bug = un issue de un proveedor.
- Mirror de stack traces / eventos a Notion — vive en el proveedor, se accede por `External URL`.
- Resolver/depurar errores dentro de Notion — Notion es tablero, no herramienta de incidentes.
- Webhooks en tiempo real — opcional en v2 para bajar latencia; comparten dedupe + lock con el cron.

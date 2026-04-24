# Notion Hub — Deploy & Setup Guide

Todo lo que necesitas para pasar del repo al hub en producción.

## 1. Obtener IDs de Notion (data sources, no databases)

El SDK v5 requiere **data source IDs**, no database IDs clásicos.

Para cada database que uses (Team, Clients, Projects, Tasks, Meetings, Wiki):

1. En Notion web: abre la database, duplica el link. El URL tiene forma
   `https://www.notion.so/workspace/DATABASE_ID?v=...` — ese `DATABASE_ID` es el clásico.
2. Para obtener el **data source ID** correspondiente, ejecuta localmente:

   ```ts
   // scripts/resolve-ds.ts
   import { Client } from '@notionhq/client';
   const n = new Client({ auth: process.env.NOTION_API_KEY! });
   const db = await n.databases.retrieve({ database_id: 'DATABASE_ID' });
   console.log(db.data_sources[0].id); // ← esto va en NOTION_DB_TEAM, etc.
   ```

   (Alternativa rápida: una vez que integras en Notion, el SDK v5 devuelve el
   `data_sources[]` array en `databases.retrieve`.)

3. Crea una **Integration** en Notion (Settings → Connections → Integrations).
   Copia el **Internal Integration Token** — empieza con `ntn_`.
4. En cada database, haz "Connect to integration" con tu integration.

## 2. Obtener credenciales Supabase

1. Crea proyecto en supabase.com
2. Project Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
3. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (dev) y tu dominio producción
   - Redirect URLs: añade `http://localhost:3000/auth/callback` y `https://TU_DOMINIO/auth/callback`
4. (Opcional Google SSO) Authentication → Providers → Google: seguir [guía](https://supabase.com/docs/guides/auth/social-login/auth-google)

## 3. Completar `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Notion — TODOS data-source IDs (ver sección 1)
NOTION_API_KEY=ntn_XXX
NOTION_DB_TEAM=ds_id_team
NOTION_DB_CLIENTS=ds_id_clients
NOTION_DB_PROJECTS=ds_id_projects
NOTION_DB_TASKS=ds_id_tasks
NOTION_DB_MEETINGS=ds_id_meetings
NOTION_DB_WIKI=ds_id_wiki

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Primer run local

```bash
npm run dev
```

Abre `http://localhost:3000`:
- Sin sesión → redirect a `/login`
- Login con magic link (correo debe estar en tu Team DB de Notion)
- Si tu correo no coincide → `/no-access`
- Si match → aterrizas en `/` (Home)

## 5. Deploy a Vercel

```bash
npm install -g vercel   # si no lo tienes
vercel login
vercel                  # primer push, crea el proyecto
```

### Configurar env vars en Vercel

Opción CLI:
```bash
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY NOTION_API_KEY NOTION_DB_TEAM NOTION_DB_CLIENTS NOTION_DB_PROJECTS NOTION_DB_TASKS NOTION_DB_MEETINGS NOTION_DB_WIKI NEXT_PUBLIC_APP_URL; do
  vercel env add $v production
done
```

O desde el dashboard: Project → Settings → Environment Variables.

Para `NEXT_PUBLIC_APP_URL` en producción, usa tu dominio final (ej. `https://hub.tudominio.com`).

### Deploy productivo

```bash
vercel --prod
```

### Actualiza Supabase redirect URL

En supabase.com → Authentication → URL Configuration → añade `https://TU_DOMINIO/auth/callback` a Redirect URLs.

## 6. QA checklist (10 tests manuales)

| # | Test | Resultado esperado |
|---|---|---|
| 1 | Logout. Login con email NO en Team DB | Redirige a `/no-access` |
| 2 | Login con email válido | Sidebar muestra nombre del cliente correcto |
| 3 | En Notion, crea tarea asignada a OTRO cliente | NO aparece en tu Kanban |
| 4 | Drag tarea de "Por hacer" → "Hecho" | Cambia instantáneo + Notion refleja en <2s |
| 5 | DevTools offline + drag | Revierte + toast rojo "No se pudo mover" |
| 6 | Cycle nav ‹ en Kanban | URL cambia a `?cycle=2026-W16`, tareas del ciclo previo |
| 7 | **CRÍTICO:** DevTools → Sources → buscar `ntn_` | **Cero matches** en bundle cliente |
| 8 | Click card → drawer con detalle + "Abrir en Notion" | Drawer abre, botón funciona, cerrar vuelve al Kanban |
| 9 | `/wiki` → árbol + página | Redirige a primera página, navegación entre páginas funciona |
| 10 | Action items en reuniones → click FK-XXX chip | Navega a `/tareas/{id}` con drawer |

## 7. Troubleshooting

**"Zod parse error at build time"** → alguna variable env está vacía en Vercel. Revisa todas las 11 env vars en el dashboard.

**"No rows returned from Team DB"** → tu integration no tiene acceso a esa database, o estás usando database ID en vez de data source ID.

**Magic link redirige a página en blanco** → Redirect URL en Supabase no incluye tu dominio final.

**Rate limit 429 de Notion** → 3 req/s por integration. El cache de Next.js lo amortigua; si es persistente, considera mirror Postgres (plan v1.5+).

## 8. Operación diaria del PM

1. Agregar miembro nuevo → crea fila en Team DB con email + relation al Cliente apropiado
2. Crear tarea → en la Tasks DB, asigna `Cliente`, `Cycle` (ISO week ej. `2026-W17`), `Status`, `Priority`
3. Cambiar de ciclo → actualiza la prop `Cycle` de las tareas que pasan a la nueva semana
4. Preparar reunión → crea página en Meetings DB con `Agenda` (bloques de texto), `Action items` (relation a Tasks), `Meet URL`

El miembro ve todo esto automáticamente — tú solo editas Notion.

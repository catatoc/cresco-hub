-- Error Tracking ⇄ Notion bridge · Fase 1: registry + Vault
--
-- Multi-tenant registry mapping each connected error-tracking source (one row per
-- provider project) to its Notion Project/Customer/Provider, with the provider API
-- key stored in Supabase Vault. Read server-side only, via the service role.
--
-- Apply in the Supabase SQL editor (or `supabase db push`). Idempotent where practical.

-- 1. Vault: managed encryption. The root key lives in Supabase infra, not in the DB.
create extension if not exists supabase_vault with schema vault;

-- 2. Registry tables --------------------------------------------------------------

-- One row per provider account/org. The API key itself lives in Vault; we only
-- store a pointer to its Vault secret name.
create table if not exists public.integration_credentials (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null check (provider in ('posthog', 'sentry')),
  host              text not null,
  vault_secret_name text not null unique,
  created_at        timestamptz not null default now()
);

-- One row per connected project. Grows by INSERT (no deploys, no env vars).
create table if not exists public.integration_sources (
  id                  uuid primary key default gen_random_uuid(),
  credential_id       uuid not null references public.integration_credentials(id) on delete cascade,
  external_project_id text not null,
  notion_project_id   text,
  notion_customer_id  text,
  notion_provider_id  text,                       -- Providers DB page id (Source relation)
  min_occurrences     int  not null default 3,    -- noise filter, per source
  enabled             boolean not null default true,
  last_synced_at      timestamptz,
  created_at          timestamptz not null default now(),
  unique (credential_id, external_project_id)
);

-- 3. Lock down access. RLS-enabled-with-no-policies denies all row access to the
--    anon/authenticated roles (PostgREST default-deny); the service role bypasses
--    RLS entirely. We ALSO revoke table privileges explicitly as defense-in-depth,
--    so the lockdown never relies solely on implicit PostgREST behavior.
alter table public.integration_credentials enable row level security;
alter table public.integration_sources    enable row level security;

revoke all on public.integration_credentials from anon, authenticated;
revoke all on public.integration_sources    from anon, authenticated;

-- 4. Resolver RPC: enabled sources joined with their decrypted API key.
--    SECURITY DEFINER so it can read vault.decrypted_secrets; execution is
--    restricted to the service role.
--    NOTE: run this migration as a role with `vault` schema access (Supabase's
--    `postgres`). The function executes as its owner, so the owner must be able to
--    SELECT vault.decrypted_secrets. Vault (step 1) must exist before this runs.
--    Sanity check after applying: `select count(*) from vault.decrypted_secrets;`
create or replace function public.get_enabled_error_sources()
returns table (
  source_id           uuid,
  provider            text,
  host                text,
  api_key             text,
  external_project_id text,
  notion_project_id   text,
  notion_customer_id  text,
  notion_provider_id  text,
  min_occurrences     int,
  last_synced_at      timestamptz
)
language sql
security definer
set search_path = public, vault
as $$
  select
    s.id,
    c.provider,
    c.host,
    (select v.decrypted_secret from vault.decrypted_secrets v where v.name = c.vault_secret_name),
    s.external_project_id,
    s.notion_project_id,
    s.notion_customer_id,
    s.notion_provider_id,
    s.min_occurrences,
    s.last_synced_at
  from public.integration_sources s
  join public.integration_credentials c on c.id = s.credential_id
  where s.enabled = true;
$$;

revoke execute on function public.get_enabled_error_sources() from public, anon, authenticated;
grant  execute on function public.get_enabled_error_sources() to service_role;

-- 5. Advance a source's delta watermark after a successful reconcile.
create or replace function public.mark_error_source_synced(p_source_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.integration_sources set last_synced_at = now() where id = p_source_id;
$$;

revoke execute on function public.mark_error_source_synced(uuid) from public, anon, authenticated;
grant  execute on function public.mark_error_source_synced(uuid) to service_role;

-- 6. Seed (run once, manually, with a REAL PostHog personal API key) ---------------
--    Notion ids (known):
--      PostHog provider row : 5df37376-a170-4e62-a29d-032971b39ff7
--      Amedi customer       : 31a8af9a-4f71-80e8-b61b-d7888a9007e2
--    Amedi maps via Customer (no Project), so notion_project_id stays null.
--
--   select vault.create_secret('phx_YOUR_KEY', 'posthog_cred_amedi',
--                              'PostHog personal API key · Amedi · org catatoc');
--
--   with cred as (
--     insert into public.integration_credentials (provider, host, vault_secret_name)
--     values ('posthog', 'https://us.posthog.com', 'posthog_cred_amedi')
--     returning id
--   )
--   insert into public.integration_sources
--     (credential_id, external_project_id, notion_customer_id, notion_provider_id, min_occurrences)
--   select id, '94699', '31a8af9a-4f71-80e8-b61b-d7888a9007e2',
--          '5df37376-a170-4e62-a29d-032971b39ff7', 3
--   from cred;

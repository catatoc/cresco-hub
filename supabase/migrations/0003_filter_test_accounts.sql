-- Error Tracking ⇄ Notion bridge · per-source test-account toggle
--
-- Lets a source include PostHog's internal/test accounts (e.g. localhost/dev
-- traffic). Those bugs still flow into Notion but get a [dev]/[staging] tag in
-- the title (derived code-side from the event's URL host). Default stays true
-- (prod-safe); set false per source to include dev errors.

alter table public.integration_sources
  add column if not exists filter_test_accounts boolean not null default true;

-- RPC now returns the toggle. Drop first — Postgres can't change a function's
-- return type (new column in RETURNS TABLE) with CREATE OR REPLACE.
drop function if exists public.get_enabled_error_sources();

create function public.get_enabled_error_sources()
returns table (
  source_id            uuid,
  provider             text,
  host                 text,
  api_key              text,
  external_project_id  text,
  notion_project_id    text,
  notion_customer_id   text,
  notion_provider_id   text,
  min_occurrences      int,
  filter_test_accounts boolean,
  last_synced_at       timestamptz
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
    s.filter_test_accounts,
    s.last_synced_at
  from public.integration_sources s
  join public.integration_credentials c on c.id = s.credential_id
  where s.enabled = true;
$$;

revoke execute on function public.get_enabled_error_sources() from public, anon, authenticated;
grant  execute on function public.get_enabled_error_sources() to service_role;

-- Amedi (94699): include dev/test errors (they get a [dev] tag in Notion).
update public.integration_sources set filter_test_accounts = false where external_project_id = '94699';

-- Error Tracking ⇄ Notion bridge · Fase 5: per-source lease lock + cron schedule
--
-- Apply after 0001. Lease-based lock (not pg advisory locks) because Supabase's
-- transaction pooler does not keep session-level advisory locks across RPC calls.

-- 1. Lease column on the source row.
alter table public.integration_sources add column if not exists locked_until timestamptz;

-- 2. Acquire: atomically claim the lease iff free/expired. Returns true on success.
create or replace function public.acquire_source_lock(p_source_id uuid, p_lease_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.integration_sources
     set locked_until = now() + make_interval(secs => p_lease_seconds)
   where id = p_source_id
     and (locked_until is null or locked_until < now());
  return found;
end;
$$;

revoke execute on function public.acquire_source_lock(uuid, int) from public, anon, authenticated;
grant  execute on function public.acquire_source_lock(uuid, int) to service_role;

-- 3. Release: clear the lease.
create or replace function public.release_source_lock(p_source_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.integration_sources set locked_until = null where id = p_source_id;
$$;

revoke execute on function public.release_source_lock(uuid) from public, anon, authenticated;
grant  execute on function public.release_source_lock(uuid) to service_role;

-- 4. Supabase Cron schedule (runs from Supabase infra → needs the PUBLIC deployed
--    URL, and the CRON_SECRET stored in Vault). Enable once notion-hub is deployed.
--    Template — fill the real bearer + URL (the local seed.local.sql has them):
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret', 'Error-sync cron bearer');
--   select cron.schedule('error-sync', '*/10 * * * *', $$
--     select net.http_get(
--       url := 'https://portal.cresco.so/api/cron/error-sync',
--       headers := jsonb_build_object('Authorization',
--         'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))
--     );
--   $$);

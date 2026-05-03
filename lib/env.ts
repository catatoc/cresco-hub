import { z } from 'zod';

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NOTION_API_KEY: z.string().min(40),
  NOTION_DB_TEAM: z.string().min(10),
  NOTION_DB_CUSTOMERS: z.string().min(10),
  NOTION_DB_PROJECTS: z.string().min(10),
  NOTION_DB_TASKS: z.string().min(10),
  NOTION_DB_MEETINGS: z.string().min(10),
  NOTION_DB_WIKI: z.string().min(10),
  NOTION_DB_SPRINTS: z.string().min(10),
  NOTION_DB_TEST_USERS: z.string().min(10),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const publicEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_APP_URL: true,
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type PublicEnv = z.infer<typeof publicEnvSchema>;

let _serverEnv: ServerEnv | null = null;
let _publicEnv: PublicEnv | null = null;

function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    _serverEnv = serverEnvSchema.parse(process.env);
  }
  return _serverEnv;
}

function getPublicEnv(): PublicEnv {
  if (!_publicEnv) {
    _publicEnv = publicEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
  }
  return _publicEnv;
}

/**
 * Lazy proxies that parse and cache on first property access.
 * This prevents module-load-time parse failures during `next build` when env
 * vars may not be populated (e.g. in CI or production builds without secrets).
 */
export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return getServerEnv()[prop as keyof ServerEnv];
  },
});

export const publicEnv = new Proxy({} as PublicEnv, {
  get(_target, prop: string) {
    return getPublicEnv()[prop as keyof PublicEnv];
  },
});

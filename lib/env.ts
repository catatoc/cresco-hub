import { z } from 'zod';

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NOTION_API_KEY: z.string().startsWith('ntn_'),
  NOTION_DB_TEAM: z.string().min(10),
  NOTION_DB_CLIENTS: z.string().min(10),
  NOTION_DB_PROJECTS: z.string().min(10),
  NOTION_DB_TASKS: z.string().min(10),
  NOTION_DB_MEETINGS: z.string().min(10),
  NOTION_DB_WIKI: z.string().min(10),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const publicEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_APP_URL: true,
});

export const serverEnv = serverEnvSchema.parse(process.env);
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

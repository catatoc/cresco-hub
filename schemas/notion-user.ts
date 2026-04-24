import { z } from 'zod';

export const notionUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  email: z.string().email().nullable(),
});

export type NotionUser = z.infer<typeof notionUserSchema>;

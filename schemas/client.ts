import { z } from 'zod';

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  status: z.string().nullable(),
});

export type Client = z.infer<typeof clientSchema>;

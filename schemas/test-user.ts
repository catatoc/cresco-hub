import { z } from 'zod';

export const testUserSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  usuario: z.string(),
  clave: z.string(),
  url: z.string().url().nullable(),
  customerIds: z.array(z.string()),
  teamIds: z.array(z.string()),
  lastEditedAt: z.string(),
});
export type TestUser = z.infer<typeof testUserSchema>;

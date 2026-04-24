import { z } from 'zod';

export const projectStatusSchema = z.enum(['Planning', 'On track', 'At risk', 'Blocked', 'Done']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  status: projectStatusSchema.nullable(),
  progress: z.number().min(0).max(100).nullable(),
  clientId: z.string().nullable(),
  teamIds: z.array(z.string()),
  deadline: z.string().nullable(),
  url: z.string().url(),
});

export type Project = z.infer<typeof projectSchema>;
